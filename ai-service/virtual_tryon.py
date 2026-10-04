"""
Accurate virtual try-on: garment extraction, perspective warp to torso, seamless blend.
Works with MediaPipe pose or OpenCV HOG fallback (no mediapipe required at import).
"""

from typing import Optional, Tuple

import cv2
import numpy as np

MEDIAPIPE_AVAILABLE = False
mp_pose = None

try:
    import mediapipe as mp

    mp_pose = mp.solutions.pose
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    pass


def _pt_norm(lm, w: int, h: int) -> Tuple[int, int]:
    return int(lm.x * w), int(lm.y * h)


def _get_torso_quad_pose(body_bgr: np.ndarray, garment_type: str) -> Tuple[np.ndarray, str]:
    h, w = body_bgr.shape[:2]
    rgb = cv2.cvtColor(body_bgr, cv2.COLOR_BGR2RGB)

    with mp_pose.Pose(static_image_mode=True, model_complexity=1, min_detection_confidence=0.5) as pose:
        results = pose.process(rgb)

    if not results.pose_landmarks:
        raise ValueError("No pose detected — use a full-body front-facing photo")

    lm = results.pose_landmarks.landmark
    idx = mp_pose.PoseLandmark

    ls = _pt_norm(lm[idx.LEFT_SHOULDER], w, h)
    rs = _pt_norm(lm[idx.RIGHT_SHOULDER], w, h)
    lh = _pt_norm(lm[idx.LEFT_HIP], w, h)
    rh = _pt_norm(lm[idx.RIGHT_HIP], w, h)

    top_y = min(ls[1], rs[1]) - int(h * 0.04)
    top_y = max(0, top_y)

    garment = (garment_type or "shirt").lower()
    if garment in ("dress", "gown", "frock"):
        lk = _pt_norm(lm[idx.LEFT_KNEE], w, h)
        rk = _pt_norm(lm[idx.RIGHT_KNEE], w, h)
        bot_y = max(lk[1], rk[1]) + int(h * 0.02)
    elif garment in ("kurta", "kurti", "tunic"):
        bot_y = int((max(lh[1], rh[1]) + min(ls[1], rs[1])) / 2 + h * 0.22)
    else:
        bot_y = max(lh[1], rh[1]) + int(h * 0.03)

    bot_y = min(h - 1, bot_y)

    # Slight trapezoid (hips narrower than shoulders)
    shoulder_w = abs(rs[0] - ls[0])
    hip_w = abs(rh[0] - lh[0])
    inset_top = int(shoulder_w * 0.02)
    inset_bot = int(max(hip_w, shoulder_w) * 0.05)

    tl = (min(ls[0], rs[0]) + inset_top, top_y)
    tr = (max(ls[0], rs[0]) - inset_top, top_y)
    bl = (min(lh[0], rh[0]) + inset_bot, bot_y)
    br = (max(lh[0], rh[0]) - inset_bot, bot_y)

    quad = np.float32([tl, tr, br, bl])
    return quad, "mediapipe_pose"


def _get_torso_quad_hog(body_bgr: np.ndarray, garment_type: str) -> Tuple[np.ndarray, str]:
    h, w = body_bgr.shape[:2]
    hog = cv2.HOGDescriptor()
    hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
    boxes, _ = hog.detectMultiScale(body_bgr, winStride=(8, 8), padding=(8, 8), scale=1.05)

    if len(boxes) == 0:
        raise ValueError("No person detected — use a full-body photo")

    x, y, bw, bh = max(boxes, key=lambda b: b[2] * b[3])
    garment = (garment_type or "shirt").lower()

    top_frac, bot_frac = 0.10, 0.52
    if garment in ("dress", "gown", "frock"):
        bot_frac = 0.78
    elif garment in ("kurta", "kurti", "tunic"):
        bot_frac = 0.65

    top_y = int(y + bh * top_frac)
    bot_y = int(y + bh * bot_frac)
    top_y, bot_y = max(0, top_y), min(h - 1, bot_y)

    tl = (int(x + bw * 0.18), top_y)
    tr = (int(x + bw * 0.82), top_y)
    bl = (int(x + bw * 0.22), bot_y)
    br = (int(x + bw * 0.78), bot_y)

    return np.float32([tl, tr, br, bl]), "opencv_hog"


def _get_torso_quad(body_bgr: np.ndarray, garment_type: str) -> Tuple[np.ndarray, str]:
    if MEDIAPIPE_AVAILABLE:
        try:
            return _get_torso_quad_pose(body_bgr, garment_type)
        except ValueError:
            pass
    return _get_torso_quad_hog(body_bgr, garment_type)


def _extract_garment(cloth_bgr: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Return BGRA garment with alpha mask."""
    h, w = cloth_bgr.shape[:2]
    margin = max(2, int(min(h, w) * 0.03))
    rect = (margin, margin, w - 2 * margin, h - 2 * margin)

    mask = np.zeros((h, w), np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(cloth_bgr, mask, rect, bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
    alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)

    # White / light studio background removal
    hsv = cv2.cvtColor(cloth_bgr, cv2.COLOR_BGR2HSV)
    white = cv2.inRange(hsv, (0, 0, 200), (180, 40, 255))
    alpha = cv2.bitwise_or(alpha, cv2.bitwise_not(white))

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, kernel, iterations=2)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, kernel, iterations=1)
    alpha = cv2.GaussianBlur(alpha, (5, 5), 0)

    bgra = cv2.cvtColor(cloth_bgr, cv2.COLOR_BGR2BGRA)
    bgra[:, :, 3] = alpha

    # Crop to garment bounds
    ys, xs = np.where(alpha > 40)
    if len(xs) == 0:
        return bgra, alpha
    y1, y2 = ys.min(), ys.max() + 1
    x1, x2 = xs.min(), xs.max() + 1
    return bgra[y1:y2, x1:x2], alpha[y1:y2, x1:x2]


def _color_harmonize(garment_bgr: np.ndarray, body_bgr: np.ndarray, quad: np.ndarray) -> np.ndarray:
    """Match garment lighting to body torso region."""
    mask = np.zeros(body_bgr.shape[:2], np.uint8)
    cv2.fillConvexPoly(mask, quad.astype(np.int32), 255)
    body_mean = cv2.mean(body_bgr, mask=mask)[:3]
    cloth_mean = cv2.mean(garment_bgr)[:3]

    out = garment_bgr.astype(np.float32)
    for c in range(3):
        if cloth_mean[c] > 1:
            out[:, :, c] *= body_mean[c] / cloth_mean[c]
    out = np.clip(out, 0, 255).astype(np.uint8)
    return out


def _warp_garment_to_body(
    garment_bgra: np.ndarray,
    body_shape: Tuple[int, int],
    quad: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray]:
    gh, gw = garment_bgra.shape[:2]
    src = np.float32([[0, 0], [gw, 0], [gw, gh], [0, gh]])
    dst = quad.astype(np.float32)

    M = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(
        garment_bgra,
        M,
        (body_shape[1], body_shape[0]),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )
    alpha = warped[:, :, 3]
    return warped[:, :, :3], alpha


def _feather_mask(mask: np.ndarray, k: int = 15) -> np.ndarray:
    k = k if k % 2 == 1 else k + 1
    blurred = cv2.GaussianBlur(mask, (k, k), 0)
    return blurred


def _blend_tryon(body_bgr: np.ndarray, garment_bgr: np.ndarray, alpha: np.ndarray, quad: np.ndarray) -> np.ndarray:
    h, w = body_bgr.shape[:2]
    alpha_f = _feather_mask(alpha.astype(np.float32) / 255.0)
    mask_u8 = (alpha_f * 255).astype(np.uint8)

    cx = int(np.mean(quad[:, 0]))
    cy = int(np.mean(quad[:, 1]))
    cx = max(1, min(w - 2, cx))
    cy = max(1, min(h - 2, cy))

    try:
        result = cv2.seamlessClone(garment_bgr, body_bgr, mask_u8, (cx, cy), cv2.MIXED_CLONE)
    except cv2.error:
        alpha3 = np.stack([alpha_f] * 3, axis=-1)
        result = (body_bgr.astype(np.float32) * (1 - alpha3) + garment_bgr.astype(np.float32) * alpha3).astype(
            np.uint8
        )

    return result


def generate_tryon_preview(
    body_bgr: np.ndarray,
    cloth_bgr: np.ndarray,
    garment_type: str = "shirt",
) -> bytes:
    """
    Composite extracted garment onto body with perspective warp + seamless blending.
    Returns PNG bytes.
    """
    quad, method = _get_torso_quad(body_bgr, garment_type)

    garment_bgra, _ = _extract_garment(cloth_bgr)
    garment_bgra[:, :, :3] = _color_harmonize(garment_bgra[:, :, :3], body_bgr, quad)

    warped_bgr, alpha = _warp_garment_to_body(garment_bgra, body_bgr.shape[:2], quad)
    output = _blend_tryon(body_bgr, warped_bgr, alpha, quad)

    # Subtle vignette on edges for realism
    h, w = output.shape[:2]
    Y, X = np.ogrid[:h, :w]
    cx, cy = w / 2, h / 2
    dist = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
    vignette = 1 - np.clip(dist / max(cx, cy) * 0.15, 0, 0.08)
    output = (output.astype(np.float32) * vignette[:, :, np.newaxis]).astype(np.uint8)

    _, png = cv2.imencode(".png", output)
    return png.tobytes()
