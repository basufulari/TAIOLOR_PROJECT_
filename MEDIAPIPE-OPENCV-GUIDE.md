# MediaPipe & OpenCV — Study Guide

**Project:** AI Tailor  
**Location:** `ai-service/`  
**Versions:** `mediapipe==0.10.14`, `opencv-python-headless==4.10.0.84`

---

## Quick comparison

| | **MediaPipe** | **OpenCV (`cv2`)** |
|---|----------------|---------------------|
| **What it is** | Google ML framework for pose/body detection | Classic computer vision library (image processing) |
| **Role in project** | Detect **33 body landmarks** | Decode/resize images, color convert, **HOG fallback**, draw laser overlay |
| **Output** | Joint positions (x, y, z, visibility) | Pixel arrays, person bounding box, drawn lines |
| **Accuracy** | High (landmark-based measurements) | Lower (box proportions only) |
| **When used** | Primary path if installed | Always (with vision dependencies) |
| **Method name in DB** | `mediapipe_calibrated_v2` | `opencv_hog_auto_height` |

---

## OpenCV (`cv2`)

### What it is

**OpenCV** (Open Source Computer Vision Library) is a library for **image and video processing**. In Python you import it as `cv2`.

- Works on **pixels** (NumPy arrays), not semantic “body understanding” by itself  
- Fast operations: read images, resize, color convert, detect shapes, draw lines and text  
- Your project uses **`opencv-python-headless`** — no GUI windows; suitable for server/API

### What OpenCV does in AI Tailor

| Task | File | OpenCV usage |
|------|------|----------------|
| Decode uploaded photo | `app.py` | `cv2.imdecode()` |
| Resize large images | `app.py` | `cv2.resize()` — max side **1280px** |
| BGR → RGB for MediaPipe | `body_scanner.py` | `cv2.cvtColor(..., COLOR_BGR2RGB)` |
| Fallback person detection | `body_scanner.py` | **HOG** + `detectMultiScale()` |
| Laser scan visualization | `laser_overlay.py` | `cv2.line()`, `cv2.putText()` |
| Sketch analysis (extra) | `sketch_analyzer.py` | threshold, contours, Sobel, Hough lines |

### BGR vs RGB

OpenCV loads images in **BGR** order (Blue-Green-Red), not RGB. MediaPipe expects **RGB**, so the code converts before pose detection:

```python
rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
results = self._pose.process(rgb)
```

### Image pipeline (measurement)

```
Upload bytes
    → np.frombuffer + cv2.imdecode  →  BGR image
    → cv2.resize if max side > 1280
    → cv2.cvtColor BGR→RGB  →  MediaPipe (if available)
    → measurements computed
    → laser_overlay uses cv2.line / putText on BGR image
```

### HOG fallback (when MediaPipe is not installed)

**HOG** = Histogram of Oriented Gradients — a classic method to detect a person-shaped region.

```python
hog = cv2.HOGDescriptor()
hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
boxes, _weights = hog.detectMultiScale(image_bgr, ...)
```

- Returns one **bounding box** (x, y, width, height) around the person  
- **No** shoulder, elbow, or ankle points  
- Measurements estimated from **box height/width ratios**  
- Less accurate than MediaPipe  
- Saved method: `opencv_hog_auto_height`

### Key OpenCV functions in this project

| Function | Purpose |
|----------|---------|
| `cv2.imdecode()` | Convert uploaded file bytes to image array |
| `cv2.resize()` | Shrink large photos for faster AI |
| `cv2.cvtColor()` | BGR ↔ RGB, grayscale for sketch |
| `cv2.HOGDescriptor()` | Person detector fallback |
| `cv2.line()` | Laser scan lines on body |
| `cv2.putText()` | Measurement labels on laser image |
| `cv2.imencode()` | Export PNG as base64 (sketch renderer) |

### Viva — OpenCV (one-liners)

- **Q: What is OpenCV in your project?**  
  **A:** OpenCV decodes and resizes photos, converts colors for MediaPipe, provides HOG person detection as fallback, and draws the laser measurement overlay.

- **Q: Does OpenCV measure chest/waist directly?**  
  **A:** No. It processes images and can find a person box (HOG). Actual body measurements use **MediaPipe landmarks** or proportional formulas from the HOG box.

- **Q: Why `opencv-python-headless`?**  
  **A:** Server/API does not need GUI (`imshow`). Headless is lighter and runs on backend machines without display.

---

## MediaPipe

### What it is

**MediaPipe** is Google’s framework for **on-device machine learning** (pose, hands, face, etc.). This project uses only:

```python
import mediapipe as mp
mp_pose = mp.solutions.pose
```

Package: **`mediapipe==0.10.14`**

### MediaPipe Pose — what it outputs

- Input: **single image** (RGB)  
- Output: **33 body landmarks**  
- Each landmark has:
  - **x, y** — normalized 0.0–1.0 (fraction of image width/height)  
  - **z** — relative depth  
  - **visibility** — confidence that the point is visible (0.0–1.0)

### 33 landmarks (examples used for tailoring)

| Landmarks | Used for |
|-----------|----------|
| LEFT_SHOULDER, RIGHT_SHOULDER | Shoulder width |
| LEFT_SHOULDER, LEFT_WRIST | Sleeve length |
| LEFT_SHOULDER, LEFT_ELBOW | Upper arm |
| LEFT_ELBOW, LEFT_WRIST | Forearm |
| LEFT_HIP, RIGHT_HIP | Hip width → waist/hips |
| LEFT_HIP, LEFT_KNEE | Thigh |
| LEFT_HIP, LEFT_ANKLE | Inseam |
| NOSE, EARS, HEELS, ANKLES | Height, full-body validation |

Full set includes: nose, eyes, ears, shoulders, elbows, wrists, hips, knees, ankles, heels, foot index — **33 points total**.

### Configuration in `body_scanner.py`

```python
self._pose = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=2,
    min_detection_confidence=0.55,
    min_tracking_confidence=0.55,
)
```

| Setting | Meaning |
|---------|---------|
| `static_image_mode=True` | One photo at a time (not live video) |
| `model_complexity=2` | Highest accuracy model (best for still photos) |
| `min_detection_confidence=0.55` | Minimum score to detect a human pose |
| `min_tracking_confidence=0.55` | Used mainly for video; kept for API consistency |

### How measurements are calculated (MediaPipe path)

1. `pose.process(rgb_image)` → get `pose_landmarks`  
2. Convert normalized (x, y) to **pixels**: `x * width`, `y * height`  
3. Compute pixel distances (e.g. shoulder-to-shoulder, hip-to-ankle)  
4. Estimate **height in cm** from body height in pixels (`measurement_calibrate.py`)  
5. **Scale** = `height_cm / body_pixels`  
6. Multiply all distances by scale → values in **cm**  
7. `image_validation.py` rejects selfies using same landmarks  

Saved method: **`mediapipe_calibrated_v2`**

### Example distance formula

```python
def _dist(lm_a, lm_b, w, h):
    ax, ay = lm_a.x * w, lm_a.y * h
    bx, by = lm_b.x * w, lm_b.y * h
    return hypot(ax - bx, ay - by)  # pixels
```

Then: `shoulder_cm = shoulder_pixels * (height_cm / body_pixels)`

### Chest / waist (circumference estimate)

MediaPipe gives **widths** in pixels, not direct circumference. The project approximates:

- **Chest:** from shoulder width + π-based formula  
- **Waist:** from hip width × factor  
- **Hips:** from hip width × π/2  

These are **estimates** from 2D pose, not tape measure.

### Validation with MediaPipe landmarks

`image_validation.py` uses landmark positions to reject:

- Face-only selfies  
- Body too small in frame  
- Legs not visible  

Only runs on **MediaPipe path** (needs real pose points).

### When MediaPipe fails

| Situation | Result |
|-----------|--------|
| No pose in image | `ValueError` → HTTP **422** |
| `mediapipe` not installed | Falls back to OpenCV HOG |
| Obvious selfie | Validation error → 422 |

Check health: `GET http://localhost:8000/health` → `"mediapipe": true`

### Viva — MediaPipe (one-liners)

- **Q: What is MediaPipe in your project?**  
  **A:** MediaPipe Pose finds 33 body joint locations in a full-body photo; we measure distances between joints and convert to centimeters.

- **Q: How many landmarks?**  
  **A:** **33** landmarks per detected person.

- **Q: Why `model_complexity=2`?**  
  **A:** Best accuracy for single photos; slower but more reliable landmark positions.

- **Q: Is MediaPipe accuracy 100%?**  
  **A:** No. It is strong for pose detection, but 2D photo + clothing + angle still limit real-world measurement accuracy.

---

## How OpenCV and MediaPipe work together

```
                    ┌─────────────────┐
   Photo upload ──► │ OpenCV          │  imdecode, resize, BGR→RGB
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
     ┌────────────────┐           ┌────────────────┐
     │ MediaPipe Pose │           │ OpenCV HOG     │  (if no MediaPipe)
     │ 33 landmarks   │           │ 1 person box   │
     └────────┬───────┘           └────────┬───────┘
              │                             │
              └──────────────┬──────────────┘
                             ▼
                    measurements (cm)
                             │
                             ▼
                    ┌─────────────────┐
                    │ OpenCV          │  laser_overlay: lines + labels
                    └─────────────────┘
```

**Rule:** OpenCV = image engine. MediaPipe = pose AI. Together they power the measurement module.

---

## Install & run modes

### Full install (recommended)

```powershell
cd ai-service
pip install -r requirements.txt
```

Includes both MediaPipe and OpenCV → `SCAN_MODE = "mediapipe"`

### Lite install (OpenCV only)

```powershell
pip install -r requirements-lite.txt
```

OpenCV only → `SCAN_MODE = "opencv_hog"` — measurements work but less accurate, no 33 landmarks, no laser from landmarks.

### Health check

```http
GET http://localhost:8000/health
```

Example response:

```json
{
  "status": "ok",
  "mode": "mediapipe",
  "mediapipe": true
}
```

---

## Project file reference

| Topic | File |
|-------|------|
| Pose + HOG scanner | `ai-service/body_scanner.py` |
| Image read/resize | `ai-service/app.py` |
| Full-body validation | `ai-service/image_validation.py` |
| Height & confidence | `ai-service/measurement_calibrate.py` |
| Laser drawing (OpenCV) | `ai-service/laser_overlay.py` |
| Dependencies | `ai-service/requirements.txt` |

---

## Common viva questions (MediaPipe + OpenCV only)

### Q1. Why use two libraries instead of one?

**Answer:** OpenCV handles **low-level image operations** (read, resize, draw). MediaPipe handles **high-level pose AI** (33 joints). OpenCV alone cannot accurately measure sleeve or inseam without landmark positions.

### Q2. What is the difference between MediaPipe and OpenCV HOG in your app?

**Answer:** MediaPipe gives **33 precise body points** → real distances between joints. HOG gives only a **rectangle around the person** → measurements guessed from height ratios inside the box.

### Q3. What color format does OpenCV use?

**Answer:** **BGR** by default. MediaPipe needs **RGB**, so we convert with `cv2.cvtColor`.

### Q4. What is `static_image_mode`?

**Answer:** Tells MediaPipe to treat each upload as a **single still image**, not a video stream. Correct for tailor photo upload.

### Q5. What is landmark visibility?

**Answer:** A score 0–1 per joint showing how confident MediaPipe is that the point is visible. Used in scan quality and confidence calculation.

### Q6. Can MediaPipe run without OpenCV?

**Answer:** In this project, **no** — OpenCV still decodes the image and draws the laser overlay. MediaPipe needs the image as a NumPy array, which OpenCV provides via `imdecode`.

### Q7. What happens if only OpenCV is installed?

**Answer:** `MEDIAPIPE_AVAILABLE = False` → `BodyScanner` uses HOG only → method `opencv_hog_auto_height`, `landmarks_detected: false`, lower confidence.

### Q8. One-minute combined answer

**Answer:**

> “OpenCV reads and resizes the customer’s photo and converts BGR to RGB. MediaPipe Pose detects 33 body landmarks. We compute pixel distances between joints, scale to centimeters using auto-estimated height, and validate full-body photos with those landmarks. OpenCV then draws the green laser lines on the image. If MediaPipe is missing, OpenCV’s HOG detector finds a person box and estimates measurements proportionally.”

---

## Revision checklist

- [ ] OpenCV = `cv2`, image decode/resize/draw  
- [ ] MediaPipe Pose = 33 landmarks  
- [ ] BGR → RGB before `pose.process()`  
- [ ] `model_complexity=2`, `static_image_mode=True`  
- [ ] Scale = height_cm / body_pixels  
- [ ] HOG = fallback, one bounding box  
- [ ] `mediapipe_calibrated_v2` vs `opencv_hog_auto_height`  
- [ ] Headless OpenCV for server  
- [ ] Versions: mediapipe 0.10.14, opencv 4.10.0.84  

---

*AI Tailor — MediaPipe & OpenCV Guide*
