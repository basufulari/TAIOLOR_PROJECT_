"""
Full-body photo check — rejects obvious selfies/face crops, accepts normal phone full-body shots.
Uses a score (not every rule must pass) to avoid false rejections.
"""

from typing import Any

INVALID_BODY_PHOTO = (
    "Please upload a full-body photo (head to feet visible). "
    "Face-only selfies are not allowed."
)


def _vis(lm: Any) -> float:
    return float(getattr(lm, "visibility", 0.0) or 0.0)


def validate_mediapipe_full_body(
    lm,
    idx,
    w: int,
    h: int,
    body_px: float,
    head_top: float,
    heel_y: float,
    shoulder_y: float,
) -> None:
    """Raise ValueError only for clear non-full-body photos."""
    img_h = max(h, 1)
    fill = body_px / img_h

    nose_y = lm[idx.NOSE].y
    shoulder_y_n = (lm[idx.LEFT_SHOULDER].y + lm[idx.RIGHT_SHOULDER].y) / 2
    hip_y_n = (lm[idx.LEFT_HIP].y + lm[idx.RIGHT_HIP].y) / 2
    knee_y_n = (lm[idx.LEFT_KNEE].y + lm[idx.RIGHT_KNEE].y) / 2
    ankle_y_n = (lm[idx.LEFT_ANKLE].y + lm[idx.RIGHT_ANKLE].y) / 2
    ear_y_n = (lm[idx.LEFT_EAR].y + lm[idx.RIGHT_EAR].y) / 2

    head_frac = max(0, head_top) / img_h
    heel_frac = heel_y / img_h
    hip_to_ankle = ankle_y_n - hip_y_n
    upper_leg = knee_y_n - hip_y_n
    lower_leg = ankle_y_n - knee_y_n
    face_h_norm = abs(nose_y - ear_y_n) * 2.5

    # --- Hard reject: obvious selfie / no legs ---
    if fill < 0.32:
        raise ValueError(INVALID_BODY_PHOTO)

    if hip_to_ankle < 0.10:
        raise ValueError(INVALID_BODY_PHOTO)

    # Face-only: large face, short body, feet not low in frame
    if face_h_norm > 0.38 and fill < 0.48 and ankle_y_n < 0.70:
        raise ValueError(INVALID_BODY_PHOTO)

    if ankle_y_n < 0.58 and fill < 0.45:
        raise ValueError(INVALID_BODY_PHOTO)

    # --- Score: pass if enough signals of full body (6+ points) ---
    score = 0

    if fill >= 0.42:
        score += 2
    elif fill >= 0.36:
        score += 1

    if heel_frac >= 0.62:
        score += 2
    elif heel_frac >= 0.55:
        score += 1

    if head_frac <= 0.28:
        score += 1

    if hip_to_ankle >= 0.16:
        score += 2
    elif hip_to_ankle >= 0.12:
        score += 1

    if upper_leg >= 0.05 and lower_leg >= 0.05:
        score += 1

    if ankle_y_n >= 0.68:
        score += 1

    if knee_y_n >= hip_y_n + 0.06:
        score += 1

    shoulder_to_heel = heel_frac - shoulder_y_n
    if shoulder_to_heel >= 0.35:
        score += 1

    torso_ratio = (heel_y - shoulder_y) / max(body_px, 1)
    if torso_ratio >= 0.42:
        score += 1

    if score < 5:
        raise ValueError(INVALID_BODY_PHOTO)


def validate_hog_full_body(x: int, y: int, bw: int, bh: int, img_w: int, img_h: int) -> None:
    """HOG fallback — lenient full-body box check."""
    img_h = max(img_h, 1)
    fill = (bh * 1.02) / img_h
    aspect = bh / max(bw, 1)
    bottom = (y + bh) / img_h

    if fill < 0.40:
        raise ValueError(INVALID_BODY_PHOTO)

    if aspect < 1.35:
        raise ValueError(INVALID_BODY_PHOTO)

    if bottom < 0.68:
        raise ValueError(INVALID_BODY_PHOTO)

    if y / img_h > 0.22 and fill < 0.55:
        raise ValueError(INVALID_BODY_PHOTO)
