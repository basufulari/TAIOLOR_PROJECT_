"""
Detect garment silhouette, patterns, and style features from clothing sketches.
"""

from typing import Any, Dict, List

import cv2
import numpy as np

from sketch_renderer import render_strokes

SILHOUETTES = ["shirt", "kurta", "dress", "pants", "suit", "blouse"]

STYLE_LIBRARY = {
    "shirt": [
        {"name": "Classic formal shirt", "tags": ["formal", "collar", "office"], "match": 0.92},
        {"name": "Casual Oxford shirt", "tags": ["casual", "cotton"], "match": 0.88},
        {"name": "Slim fit dress shirt", "tags": ["slim", "modern"], "match": 0.85},
    ],
    "kurta": [
        {"name": "Straight kurta", "tags": ["ethnic", "festive"], "match": 0.9},
        {"name": "Angrakha style kurta", "tags": ["traditional", "wrap"], "match": 0.86},
        {"name": "Pathani kurta", "tags": ["loose", "collarless"], "match": 0.82},
    ],
    "dress": [
        {"name": "A-line dress", "tags": ["party", "flare"], "match": 0.9},
        {"name": "Sheath dress", "tags": ["formal", "fitted"], "match": 0.87},
        {"name": "Anarkali dress", "tags": ["ethnic", "flowing"], "match": 0.84},
    ],
    "pants": [
        {"name": "Slim trousers", "tags": ["formal", "office"], "match": 0.9},
        {"name": "Chinos", "tags": ["casual"], "match": 0.86},
    ],
    "suit": [
        {"name": "Two-piece suit", "tags": ["formal", "wedding"], "match": 0.91},
        {"name": "Blazer look", "tags": ["semi-formal"], "match": 0.85},
    ],
    "blouse": [
        {"name": "Designer blouse", "tags": ["party", "silk"], "match": 0.88},
        {"name": "Casual blouse", "tags": ["daily"], "match": 0.84},
    ],
}


def analyze_sketch(
    paths: List[Dict[str, Any]],
    width: int = 400,
    height: int = 500,
) -> Dict[str, Any]:
    img = render_strokes(paths, width, height)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

    silhouette = _detect_silhouette(binary, width, height)
    patterns = _detect_patterns(binary, img)
    features = _detect_features(binary, width, height)

    similar = _suggest_styles(silhouette, patterns, features)

    return {
        "silhouette": silhouette,
        "category": silhouette,
        "patterns": patterns,
        "features": features,
        "similar_styles": similar,
        "confidence": round(min(0.95, 0.7 + len(paths) * 0.03 + len(patterns) * 0.05), 2),
        "analysis_note": "Sketch analyzed with AI pattern & silhouette detection",
    }


def _detect_silhouette(binary: np.ndarray, w: int, h: int) -> str:
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return "shirt"

    c = max(contours, key=cv2.contourArea)
    x, y, bw, bh = cv2.boundingRect(c)
    aspect = bh / max(bw, 1)
    area_ratio = cv2.contourArea(c) / max(w * h, 1)
    top_heavy = _top_width_ratio(binary, y, bh)

    if aspect > 1.55 and top_heavy < 0.55:
        return "dress"
    if aspect > 1.35 and top_heavy > 0.65:
        return "kurta"
    if aspect < 0.95 and area_ratio > 0.15:
        return "pants"
    if aspect > 1.2 and top_heavy > 0.7:
        return "suit"
    if top_heavy > 0.75 and aspect < 1.3:
        return "blouse"
    return "shirt"


def _top_width_ratio(binary: np.ndarray, y: int, bh: int) -> float:
    h = binary.shape[0]
    top_slice = binary[y : y + max(1, bh // 4), :]
    mid_slice = binary[y + bh // 3 : y + 2 * bh // 3, :]
    top_w = np.sum(top_slice > 0) / max(top_slice.size, 1)
    mid_w = np.sum(mid_slice > 0) / max(mid_slice.size, 1)
    return top_w / max(mid_w, 0.001)


def _detect_patterns(binary: np.ndarray, color_img: np.ndarray) -> List[Dict[str, Any]]:
    patterns = []
    h, w = binary.shape

    lines = cv2.HoughLinesP(binary, 1, np.pi / 180, 40, minLineLength=w // 6, maxLineGap=10)
    horizontal = 0
    vertical = 0
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
            if angle < 15 or angle > 165:
                horizontal += 1
            elif 75 < angle < 105:
                vertical += 1

    if horizontal >= 4 or vertical >= 4:
        patterns.append({
            "name": "stripes",
            "confidence": min(0.92, 0.6 + (horizontal + vertical) * 0.04),
            "description": "Linear stripe pattern detected",
        })

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    small_blobs = 0
    for c in contours:
        area = cv2.contourArea(c)
        if 30 < area < 800:
            small_blobs += 1
    if small_blobs >= 8:
        patterns.append({
            "name": "floral_or_texture",
            "confidence": 0.78,
            "description": "Repeated motif / textured pattern",
        })

    edge_density = np.sum(binary > 0) / max(binary.size, 1)
    if edge_density < 0.02 and not patterns:
        patterns.append({
            "name": "plain",
            "confidence": 0.9,
            "description": "Clean plain fabric — minimal pattern",
        })
    elif not patterns:
        patterns.append({
            "name": "solid",
            "confidence": 0.85,
            "description": "Solid color garment sketch",
        })

    if _has_checks(binary, w, h):
        patterns.append({
            "name": "checks",
            "confidence": 0.8,
            "description": "Check / grid pattern hints",
        })

    return patterns[:4]


def _has_checks(binary: np.ndarray, w: int, h: int) -> bool:
    small = cv2.resize(binary, (80, 100))
    gx = cv2.Sobel(small, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(small, cv2.CV_64F, 0, 1, ksize=3)
    return np.std(gx) > 12 and np.std(gy) > 12


def _detect_features(binary: np.ndarray, w: int, h: int) -> Dict[str, Any]:
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return {"neckline": "round", "sleeves": "short", "fit": "regular"}

    c = max(contours, key=cv2.contourArea)
    x, y, bw, bh = cv2.boundingRect(c)
    upper = binary[y : y + bh // 3, x : x + bw]
    upper_proj = np.sum(upper > 0, axis=1)
    neck_peak = int(np.argmax(upper_proj)) if upper_proj.size else 0

    sleeves = "sleeveless"
    left_region = binary[y + bh // 5 : y + bh // 2, max(0, x - bw // 4) : x]
    right_region = binary[y + bh // 5 : y + bh // 2, x + bw : min(w, x + bw + bw // 4)]
    if np.sum(left_region > 0) > 80 or np.sum(right_region > 0) > 80:
        sleeves = "short"
    mid_y = y + bh // 2
    if np.sum(binary[mid_y : mid_y + 20, max(0, x - 30) : x]) > 50:
        sleeves = "long"

    neckline = "round"
    if neck_peak < bh // 8:
        neckline = "v-neck"
    elif neck_peak > bh // 6:
        neckline = "collar"

    aspect = bh / max(bw, 1)
    fit = "slim" if aspect > 1.5 else "regular"

    return {"neckline": neckline, "sleeves": sleeves, "fit": fit, "bbox": [x, y, bw, bh]}


def _suggest_styles(silhouette: str, patterns: List[Dict], features: Dict) -> List[Dict]:
    base = STYLE_LIBRARY.get(silhouette, STYLE_LIBRARY["shirt"])
    pattern_names = {p["name"] for p in patterns}

    results = []
    for item in base:
        score = item["match"]
        if "stripes" in pattern_names and "stripe" in " ".join(item["tags"]):
            score += 0.04
        if "formal" in item["tags"] and features.get("neckline") == "collar":
            score += 0.03
        results.append({**item, "match": round(min(0.98, score), 2)})

    results.sort(key=lambda x: -x["match"])
    return results[:5]
