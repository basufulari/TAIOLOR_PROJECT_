"""
AI-based size recommendation from body measurements.
Uses rule-based fitting with standard size charts (Indian/international blend).
"""

from typing import Dict, Any

# Size charts: (max chest cm, size label)
SHIRT_SIZES = [
    (88, "XS"),
    (96, "S"),
    (104, "M"),
    (112, "L"),
    (120, "XL"),
    (128, "XXL"),
    (999, "3XL"),
]

PANTS_SIZES = [
    (76, "28"),
    (81, "30"),
    (86, "32"),
    (91, "34"),
    (96, "36"),
    (101, "38"),
    (106, "40"),
    (999, "42"),
]


def _fit_size(value: float, chart: list) -> str:
    for threshold, label in chart:
        if value <= threshold:
            return label
    return chart[-1][1]


def recommend_size(measurements: Dict[str, Any], garment_type: str = "shirt") -> Dict[str, Any]:
    chest = float(measurements.get("chest") or measurements.get("chest_cm") or 0)
    waist = float(measurements.get("waist") or measurements.get("waist_cm") or 0)
    shoulder = float(measurements.get("shoulder") or 0)
    height = float(measurements.get("height") or 170)

    garment = (garment_type or "shirt").lower()

    if garment in ("pants", "trousers", "jeans"):
        primary_size = _fit_size(waist, PANTS_SIZES)
        fit_notes = []
        if waist < 76:
            fit_notes.append("Consider slim-fit or tailored waist adjustment.")
        elif waist > 100:
            fit_notes.append("Relaxed fit recommended for comfort.")
        recommended = {
            "size": primary_size,
            "waist_inches": primary_size,
            "fit": "regular",
        }
    else:
        primary_size = _fit_size(chest, SHIRT_SIZES)
        fit = "regular"
        fit_notes = []

        if shoulder > chest * 0.28:
            fit = "athletic"
            fit_notes.append("Athletic build: consider broader shoulder allowance.")
        if chest - waist > 18:
            fit = "tapered"
            fit_notes.append("Tapered fit suits your chest-to-waist ratio.")
        if height > 185 and primary_size in ("M", "L"):
            fit_notes.append("Tall fit: add 2-3 cm to sleeve length.")

        recommended = {
            "size": primary_size,
            "fit": fit,
            "chest_cm": chest,
            "sleeve_adjustment_cm": 2 if height > 185 else 0,
        }

    return {
        "recommended_size": recommended["size"],
        "fit_type": recommended.get("fit", "regular"),
        "details": recommended,
        "garment_type": garment,
        "confidence": 0.85 if chest > 0 else 0.5,
        "notes": fit_notes,
        "alterations_suggested": _suggest_alterations(measurements, garment),
    }


def _suggest_alterations(m: Dict[str, Any], garment: str) -> list:
    suggestions = []
    sleeve = m.get("sleeve_length") or m.get("sleeveLength")
    if sleeve and float(sleeve) > 65:
        suggestions.append("Long sleeve: standard pattern extension")
    if garment == "shirt" and m.get("waist") and m.get("chest"):
        diff = float(m["chest"]) - float(m["waist"])
        if diff > 20:
            suggestions.append("Side dart or waist suppression for fitted look")
    return suggestions
