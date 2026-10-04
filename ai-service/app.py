"""
AI Tailor Python Service - FastAPI
Auto height from photo + laser-scan overlay + size recommendations.
"""

import os
from typing import List, Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from size_recommender import recommend_size

SKETCH_AVAILABLE = False
analyze_sketch_fn = None
strokes_to_png_fn = None

try:
    from sketch_analyzer import analyze_sketch
    from sketch_renderer import strokes_to_png_base64

    analyze_sketch_fn = analyze_sketch
    strokes_to_png_fn = strokes_to_png_base64
    SKETCH_AVAILABLE = True
except ImportError:
    pass

SCAN_MODE = "none"
scanner = None
_read_image = None
_create_laser = None
generate_tryon_preview = None

try:
    import cv2
    import numpy as np
    from body_scanner import BodyScanner, MEDIAPIPE_AVAILABLE
    from laser_overlay import create_laser_scan
    from virtual_tryon import generate_tryon_preview

    def _read_image(upload: UploadFile) -> np.ndarray:
        contents = upload.file.read()
        arr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        h, w = img.shape[:2]
        max_side = max(h, w)
        if max_side > 1280:
            scale = 1280 / max_side
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        return img

    _create_laser = create_laser_scan
    REFERENCE_HEIGHT = float(os.getenv("REFERENCE_HEIGHT_CM", "170"))
    scanner = BodyScanner(reference_height_cm=REFERENCE_HEIGHT)
    SCAN_MODE = "mediapipe" if MEDIAPIPE_AVAILABLE else "opencv_hog"
except ImportError:
    generate_tryon_preview = None

app = FastAPI(title="AI Tailor AI Service", version="1.0.0")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-tailor-ai",
        "mode": SCAN_MODE,
        "auto_height": SCAN_MODE != "none",
        "mediapipe": SCAN_MODE == "mediapipe",
        "tryon": generate_tryon_preview is not None,
        "sketch_canvas": SKETCH_AVAILABLE,
    }


class StrokePoint(BaseModel):
    x: float
    y: float


class StrokePath(BaseModel):
    color: str = "#1a1a2e"
    width: float = 3
    points: List[List[float]] = []


class SketchAnalyzeRequest(BaseModel):
    paths: List[StrokePath]
    canvas_width: int = 400
    canvas_height: int = 500


@app.post("/api/sketch/analyze")
async def sketch_analyze(req: SketchAnalyzeRequest):
    if not analyze_sketch_fn:
        raise HTTPException(status_code=503, detail="Sketch analyzer not available")
    if not req.paths:
        raise HTTPException(status_code=400, detail="Draw something on the canvas first")

    try:
        paths = [p.model_dump() for p in req.paths]
        result = analyze_sketch_fn(paths, req.canvas_width, req.canvas_height)
        sketch_b64 = strokes_to_png_fn(paths, req.canvas_width, req.canvas_height)
        return {"success": True, **result, "sketch_image_base64": sketch_b64}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/measurements/detect")
async def detect_measurements(
    image: UploadFile = File(...),
    height_cm: Optional[float] = Form(None),
):
    if not scanner:
        raise HTTPException(
            status_code=503,
            detail="Install vision deps: pip install -r requirements-lite.txt",
        )

    height = float(height_cm) if height_cm else None

    try:
        img = _read_image(image)
        result = scanner.scan(img, height_cm=height)
        measurements = result["measurements"]
        laser_b64 = _create_laser(img, measurements, result.get("landmarks"))
        return {
            "success": True,
            **result,
            "laser_image_base64": laser_b64,
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SizeRequest(BaseModel):
    measurements: dict
    garment_type: str = "shirt"


@app.post("/api/recommendations/size")
async def size_recommendation(req: SizeRequest):
    result = recommend_size(req.measurements, req.garment_type)
    return {"success": True, **result}


@app.post("/api/tryon/generate")
async def tryon_generate(
    body_image: UploadFile = File(...),
    cloth_image: UploadFile = File(...),
    garment_type: Optional[str] = Form("shirt"),
):
    if not generate_tryon_preview:
        raise HTTPException(
            status_code=503,
            detail="Install vision deps: pip install -r requirements-lite.txt",
        )
    try:
        body = _read_image(body_image)
        cloth = _read_image(cloth_image)
        png_bytes = generate_tryon_preview(body, cloth, garment_type=garment_type or "shirt")
        return Response(content=png_bytes, media_type="image/png")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=False,
    )
