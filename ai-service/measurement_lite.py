"""Height-based measurements when MediaPipe is not installed."""

from typing import Optional


def detect_from_height(height_cm: Optional[float], reference_height_cm: float = 170.0) -> dict:
    h = float(height_cm) if height_cm and height_cm > 100 else reference_height_cm
    h = max(140, min(210, h))

    measurements = {
        "chest": round(h * 0.52 + 2, 1),
        "waist": round(h * 0.45 + 2, 1),
        "shoulder": round(h * 0.26, 1),
        "sleeve_length": round(h * 0.36, 1),
        "height": h,
        "hips": round(h * 0.54, 1),
        "inseam": round(h * 0.45, 1),
        "unit": "cm",
    }

    return {
        "measurements": measurements,
        "confidence": 0.6,
        "method": "height_proportional",
        "note": "Lite AI mode — enter height (cm) for estimates. Install full requirements.txt for pose detection.",
    }
