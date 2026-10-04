"""
Laser-scan style measurement visualization on body photos.
"""

import base64
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

LASER_CYAN = (255, 255, 0)
LASER_GREEN = (0, 255, 120)
LASER_MAGENTA = (255, 0, 255)
LASER_RED = (0, 80, 255)


def _pt(lm: Dict, w: int, h: int) -> Tuple[int, int]:
    return int(lm["x"] * w), int(lm["y"] * h)


def _draw_glow_line(img, p1, p2, color, thickness=2):
    cv2.line(img, p1, p2, color, thickness + 4)
    cv2.line(img, p1, p2, color, thickness)


def _draw_label(img, pos, text, color=LASER_CYAN):
    x, y = pos
    cv2.putText(img, text, (x + 6, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 3)
    cv2.putText(img, text, (x + 6, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)


def create_laser_scan(
    image_bgr: np.ndarray,
    measurements: Dict[str, Any],
    landmarks: Optional[List[Dict]] = None,
) -> str:
    """Return base64 PNG with laser measurement overlay."""
    h, w = image_bgr.shape[:2]
    base = image_bgr.astype(np.float32) * 0.45
    glow = np.zeros_like(image_bgr, dtype=np.float32)

    # Horizontal scan lines
    for y in range(0, h, 6):
        alpha = 0.15 + 0.1 * (y % 24) / 24
        cv2.line(glow, (0, y), (w, y), (0, int(60 * alpha), 0), 1)

    # Vertical center spine laser
    cx = w // 2
    _draw_glow_line(glow, (cx, int(h * 0.05)), (cx, int(h * 0.92)), LASER_CYAN, 1)

    m = measurements
    unit = m.get("unit", "cm")

    if landmarks and len(landmarks) >= 10:
        idx = {lm["name"]: lm for lm in landmarks}
        pairs = [
            ("LEFT_SHOULDER", "RIGHT_SHOULDER", f"Shoulder {m.get('shoulder', '?')}{unit}", LASER_GREEN),
            ("LEFT_SHOULDER", "LEFT_ELBOW", f"Arm {m.get('arm_length', '?')}{unit}", LASER_CYAN),
            ("LEFT_ELBOW", "LEFT_WRIST", f"Forearm {m.get('forearm', '?')}{unit}", LASER_CYAN),
            ("LEFT_HIP", "RIGHT_HIP", f"Hips {m.get('hips', '?')}{unit}", LASER_MAGENTA),
            ("LEFT_HIP", "LEFT_KNEE", f"Thigh {m.get('thigh', '?')}{unit}", LASER_GREEN),
            ("LEFT_KNEE", "LEFT_ANKLE", f"Inseam {m.get('inseam', '?')}{unit}", LASER_GREEN),
            ("LEFT_SHOULDER", "LEFT_HIP", None, LASER_CYAN),
        ]
        for a, b, label, color in pairs:
            if a in idx and b in idx:
                p1 = _pt(idx[a], w, h)
                p2 = _pt(idx[b], w, h)
                _draw_glow_line(glow, p1, p2, color, 2)
                if label:
                    mid = ((p1[0] + p2[0]) // 2, (p1[1] + p2[1]) // 2)
                    _draw_label(glow, mid, label, color)

        # Chest / waist bands
        if "LEFT_SHOULDER" in idx and "RIGHT_SHOULDER" in idx:
            sy = (idx["LEFT_SHOULDER"]["y"] + idx["RIGHT_SHOULDER"]["y"]) / 2
            y_chest = int((sy + 0.08) * h)
            y_waist = int((sy + 0.22) * h)
            cv2.line(glow, (int(w * 0.2), y_chest), (int(w * 0.8), y_chest), LASER_MAGENTA, 2)
            cv2.line(glow, (int(w * 0.22), y_waist), (int(w * 0.78), y_waist), LASER_RED, 2)
            _draw_label(glow, (int(w * 0.82), y_chest), f"Chest {m.get('chest', '?')}{unit}", LASER_MAGENTA)
            _draw_label(glow, (int(w * 0.82), y_waist), f"Waist {m.get('waist', '?')}{unit}", LASER_RED)

        # Height line (head to ankle)
        if "NOSE" in idx and "LEFT_ANKLE" in idx:
            top = _pt(idx["NOSE"], w, h)
            top = (top[0], max(0, top[1] - int(h * 0.06)))
            ankle = _pt(idx.get("LEFT_ANKLE", idx.get("RIGHT_ANKLE", idx["NOSE"])), w, h)
            _draw_glow_line(glow, top, ankle, LASER_CYAN, 2)
            _draw_label(glow, (top[0] + 10, (top[1] + ankle[1]) // 2), f"Height {m.get('height', '?')}{unit}", LASER_CYAN)

        # Joint crosshairs
        for name, lm in idx.items():
            if any(k in name for k in ("SHOULDER", "ELBOW", "WRIST", "HIP", "KNEE", "ANKLE")):
                p = _pt(lm, w, h)
                cv2.circle(glow, p, 5, LASER_GREEN, 1)
                cv2.line(glow, (p[0] - 6, p[1]), (p[0] + 6, p[1]), LASER_GREEN, 1)
                cv2.line(glow, (p[0], p[1] - 6), (p[0], p[1] + 6), LASER_GREEN, 1)
    else:
        # HOG / bbox fallback — synthetic lines from bbox
        y0, y1 = int(h * 0.08), int(h * 0.92)
        x0, x1 = int(w * 0.25), int(w * 0.75)
        _draw_glow_line(glow, (x0, y0), (x0, y1), LASER_CYAN, 2)
        _draw_label(glow, (x1 + 4, (y0 + y1) // 2), f"Height {m.get('height', '?')}{unit}")
        for y, label, col in [
            (int(h * 0.18), f"Shoulder {m.get('shoulder', '?')}{unit}", LASER_GREEN),
            (int(h * 0.28), f"Chest {m.get('chest', '?')}{unit}", LASER_MAGENTA),
            (int(h * 0.38), f"Waist {m.get('waist', '?')}{unit}", LASER_RED),
            (int(h * 0.48), f"Hips {m.get('hips', '?')}{unit}", LASER_MAGENTA),
        ]:
            cv2.line(glow, (x0, y), (x1, y), col, 2)
            _draw_label(glow, (x1, y), label, col)

    # Corner HUD
    cv2.rectangle(glow, (8, 8), (w - 8, 56), (0, 40, 0), -1)
    cv2.rectangle(glow, (8, 8), (w - 8, 56), LASER_GREEN, 1)
    cv2.putText(glow, "AI LASER SCAN", (16, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, LASER_GREEN, 2)
    cv2.putText(
        glow,
        f"Neck {m.get('neck', '-')} | Bicep {m.get('bicep', '-')} {unit}",
        (16, 48),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.4,
        LASER_CYAN,
        1,
    )

    combined = np.clip(base + glow.astype(np.float32) * 0.85, 0, 255).astype(np.uint8)
    _, png = cv2.imencode(".png", combined)
    return base64.b64encode(png.tobytes()).decode("utf-8")
