"""Render touch strokes to a sketch image for analysis."""

import base64
from typing import Any, Dict, List

import cv2
import numpy as np


def render_strokes(
    paths: List[Dict[str, Any]],
    width: int = 400,
    height: int = 500,
    bg_color: tuple = (255, 255, 255),
) -> np.ndarray:
    img = np.ones((height, width, 3), dtype=np.uint8)
    img[:] = bg_color

    for path in paths:
        points = path.get("points") or []
        if len(points) < 2:
            continue
        color = _parse_color(path.get("color", "#1a1a2e"))
        thickness = max(1, int(path.get("width", 3)))
        pts = np.array([[int(p[0]), int(p[1])] for p in points], dtype=np.int32)
        cv2.polylines(img, [pts], False, color, thickness, cv2.LINE_AA)
        for px, py in pts:
            cv2.circle(img, (px, py), max(1, thickness // 2), color, -1, cv2.LINE_AA)

    return img


def _parse_color(hex_color: str) -> tuple:
    h = (hex_color or "#1a1a2e").lstrip("#")
    if len(h) == 6:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return (b, g, r)
    return (46, 26, 26)


def strokes_to_png_base64(paths: List[Dict], width: int, height: int) -> str:
    img = render_strokes(paths, width, height)
    _, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf.tobytes()).decode("utf-8")
