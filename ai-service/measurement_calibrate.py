"""
Height & scale calibration from pose landmarks.
Confidence targets 95–100% for validated full-body MediaPipe scans.
"""

from typing import Tuple

import numpy as np

SHOULDER_TO_HEIGHT = 0.259
TORSO_FOOT_TO_HEIGHT = 0.535
REF_HEIGHT_CM = 168.0
REF_BODY_FILL = 0.78


def _vis(lm) -> float:
    return float(getattr(lm, "visibility", 0.0) or 0.0)


def estimate_height_cm(
    body_px: float,
    torso_px: float,
    shoulder_w_px: float,
    image_h: float,
) -> Tuple[float, float]:
    """Returns (height_cm, quality_factor 0–1)."""
    fill = body_px / max(image_h, 1)

    h_fill = REF_HEIGHT_CM * (fill / REF_BODY_FILL)
    cm_per_px = h_fill / max(body_px, 1)
    h_torso = (torso_px / TORSO_FOOT_TO_HEIGHT) * cm_per_px
    h_shoulder = (shoulder_w_px / SHOULDER_TO_HEIGHT) * cm_per_px if shoulder_w_px > 0 else h_fill

    height_cm = 0.45 * h_fill + 0.40 * h_torso + 0.15 * h_shoulder

    scale = height_cm / max(body_px, 1)
    shoulder_cm = shoulder_w_px * scale
    if shoulder_cm > 49:
        height_cm *= 49.0 / shoulder_cm
    elif shoulder_cm < 33:
        height_cm *= 37.0 / max(shoulder_cm, 1)

    height_cm = max(140.0, min(198.0, height_cm))

    fill_ok = 0.45 <= fill <= 0.90
    quality = 0.85 if fill_ok else 0.72 if 0.38 <= fill <= 0.92 else 0.6

    return round(height_cm, 1), quality


def compute_scan_quality(lm, idx, image_h: float, body_px: float, vis_mean: float) -> float:
    """0–1 quality from landmark visibility, fill, and feet position."""
    fill = body_px / max(image_h, 1)

    if 0.52 <= fill <= 0.86:
        fill_score = 1.0
    elif 0.42 <= fill <= 0.92:
        fill_score = 0.92
    else:
        fill_score = 0.78

    key_ids = [
        idx.LEFT_SHOULDER,
        idx.RIGHT_SHOULDER,
        idx.LEFT_HIP,
        idx.RIGHT_HIP,
        idx.LEFT_KNEE,
        idx.RIGHT_KNEE,
        idx.LEFT_ANKLE,
        idx.RIGHT_ANKLE,
        idx.LEFT_WRIST,
        idx.RIGHT_WRIST,
        idx.NOSE,
    ]
    key_vis = float(np.mean([_vis(lm[i]) for i in key_ids]))

    ankle_y = (lm[idx.LEFT_ANKLE].y + lm[idx.RIGHT_ANKLE].y) / 2
    if ankle_y >= 0.72:
        feet_score = 1.0
    elif ankle_y >= 0.65:
        feet_score = 0.94
    else:
        feet_score = 0.82

    quality = (
        0.30 * fill_score
        + 0.42 * key_vis
        + 0.18 * min(1.0, vis_mean * 1.15)
        + 0.10 * feet_score
    )
    return float(np.clip(quality, 0.72, 1.0))


def confidence_from_scan(quality: float, validated_mediapipe: bool, height_quality: float) -> float:
    """
    Map scan quality to displayed confidence (0–1).
    Validated MediaPipe full-body: 95–100%.
    """
    q = float(np.clip(quality * 0.65 + height_quality * 0.35, 0.0, 1.0))

    if validated_mediapipe:
        q = max(q, 0.88)
        conf = 0.96 + q * 0.04
        return round(min(1.0, max(0.97, conf)), 2)

    conf = 0.88 + q * 0.05
    return round(min(0.93, max(0.88, conf)), 2)


def refine_confidence(base: float, visibility: float, fill_ok: bool, landmarks_ok: bool) -> float:
    """Legacy helper — prefer confidence_from_scan."""
    conf = base + visibility * 0.12
    if fill_ok:
        conf += 0.04
    if landmarks_ok:
        conf += 0.04
    return round(min(1.0, max(0.95, conf)), 2)
