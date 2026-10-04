# AI / Measurement Module — Viva Questions & Answers

**Project:** AI Tailor  
**Focus:** Body scan, MediaPipe, validation, calibration, confidence, laser overlay, fallback  
**Related code:** `ai-service/` + `backend/src/routes/measurements.js` + `backend/src/services/aiClient.js`

---

## Module overview

| Layer | File / endpoint | Role |
|-------|-----------------|------|
| Mobile | `MeasureScreen.js` | Take photo, send to API |
| Backend | `POST /api/measurements/detect` | Auth, save customer, call AI |
| Backend | `aiClient.js` | HTTP to Python service |
| AI | `app.py` → `body_scanner.py` | Pose detect + measurements |
| AI | `image_validation.py` | Reject bad photos |
| AI | `measurement_calibrate.py` | Height + confidence |
| AI | `laser_overlay.py` | Green laser preview image |
| Fallback | `measurementFallback.js` | When AI offline |

---

## A. Basic concepts (Q1–Q8)

### Q1. What is the AI measurement module in your project?

**Answer:** It is the feature that takes a **full-body photo** of a customer and automatically calculates body measurements (chest, waist, shoulder, sleeve, height, etc. in cm) using computer vision. Results are saved to MongoDB and shown to the tailor with a confidence score and optional laser scan image.

---

### Q2. Why use AI for measurements instead of manual tape?

**Answer:** Manual measurement is slow and can vary between tailors. AI gives **fast, consistent estimates** from one photo, stores them digitally, and links them to the customer record for future orders.

---

### Q3. Which programming language runs the AI logic?

**Answer:** **Python** (FastAPI service on port 8000). The mobile app and main API use JavaScript (Node.js); only the vision/ML part is Python because MediaPipe and OpenCV work best there.

---

### Q4. What library detects the human body in the photo?

**Answer:** **MediaPipe Pose** — it finds **33 body landmarks** (shoulders, elbows, hips, knees, ankles, nose, etc.) in a single image.

---

### Q5. What is OpenCV used for in measurement?

**Answer:** OpenCV (`cv2`) is used to:

- Read and decode the uploaded image  
- Resize large images (max 1280px) for faster processing  
- Convert BGR ↔ RGB for MediaPipe  
- **HOG person detector** as fallback when MediaPipe is not installed  

---

### Q6. List all measurements your AI returns.

**Answer:**

| Measurement | Unit |
|-------------|------|
| Height | cm |
| Chest | cm |
| Waist | cm |
| Shoulder width | cm |
| Sleeve length | cm |
| Arm length | cm |
| Forearm | cm |
| Hips | cm |
| Inseam | cm |
| Thigh | cm |
| Neck | cm |
| Bicep | cm |

---

### Q7. Is manual height entry required?

**Answer:** **No** for normal flow. Height is **auto-detected** from body proportions in the image. Optional `height_cm` can be sent to override calibration if needed.

---

### Q8. What API endpoint performs body measurement?

**Answer:**

- **Mobile → Backend:** `POST /api/measurements/detect` (multipart: image + customer fields)  
- **Backend → AI:** `POST http://localhost:8000/api/measurements/detect`  

---

## B. Flow & architecture (Q9–Q16)

### Q9. Explain the complete measurement flow step by step.

**Answer:**

```
1. Tailor opens AI Measure tab, enters customer name/email
2. Takes or picks full-body photo
3. Mobile sends FormData to Node backend (JWT auth)
4. Backend saves customer, forwards image to Python AI
5. AI: resize → MediaPipe pose → validate full body
6. AI: calculate distances → convert to cm → confidence score
7. AI: generate laser overlay PNG (base64)
8. Backend saves Measurement in MongoDB Atlas
9. Mobile shows measurements, confidence %, laser preview
```

---

### Q10. Draw / explain data flow diagram for measurement.

**Answer:**

```
[Camera Photo] → [MeasureScreen] → [Express :5000]
                                      ↓
                               [aiClient.js]
                                      ↓
                               [FastAPI :8000]
                                      ↓
                          [BodyScanner + MediaPipe]
                                      ↓
                               [JSON measurements]
                                      ↓
                               [MongoDB Measurement]
```

---

### Q11. Why is AI in a separate service, not inside Node.js?

**Answer:**

1. MediaPipe/OpenCV are Python-native  
2. AI processing is heavy — isolating it prevents blocking the main API  
3. Can restart AI without stopping orders/auth  
4. Can scale AI server separately in production  

---

### Q12. What file in backend calls the AI service?

**Answer:** `backend/src/services/aiClient.js` — function `detectMeasurements()` sends multipart image with retries on `localhost:8000` and `127.0.0.1:8000`.

---

### Q13. What happens in `measurements.js` after AI returns?

**Answer:**

1. Parses measurements from AI response  
2. Normalizes confidence via `scanConfidence.js` (95–100% for good scans)  
3. Saves laser image to `uploads/laser/` if base64 present  
4. Creates **Measurement** document in MongoDB  
5. Sets `isPrimary: true` for this customer’s latest scan  
6. Optionally calls size recommendation API  
7. Returns result to mobile app  

---

### Q14. What is multipart form data in detect API?

**Answer:** The request sends `image` as a file plus text fields (`customerName`, `customerPhone`, `customerEmail`, `customerId`, etc.). Multer on backend saves the image to disk before forwarding to AI.

---

### Q15. What HTTP status code for invalid body photo?

**Answer:** **422** (Unprocessable Entity) with message like “Please upload a full-body photo…” — mobile shows “Upload full image” alert.

---

### Q16. How do you check if AI service is running?

**Answer:** `GET http://localhost:8000/health` returns JSON with `"mediapipe": true` when pose detection is available. Backend logs `AI → http://localhost:8000 (ready)` on startup.

---

## C. MediaPipe & landmark math (Q17–Q24)

### Q17. How many pose landmarks does MediaPipe provide?

**Answer:** **33 landmarks** per person (nose, eyes, ears, shoulders, elbows, wrists, hips, knees, ankles, heels, etc.).

---

### Q18. How do you convert landmarks to measurements?

**Answer:**

1. Landmarks give normalized (x, y) coordinates 0–1  
2. Multiply by image width/height to get **pixels**  
3. Calculate pixel distances (e.g. shoulder to shoulder, hip to ankle)  
4. Estimate **height in cm** from body height in pixels  
5. **Scale factor** = height_cm / body_pixels  
6. Multiply all distances by scale → measurements in cm  

---

### Q19. How is chest measurement estimated?

**Answer:** From shoulder width in pixels, scaled to cm, then formula uses circumference approximation: π × (effective radius) + adjustment based on shoulder cm (implemented in `body_scanner.py`).

---

### Q20. How is height estimated without user input?

**Answer:** `estimate_height_cm()` in `measurement_calibrate.py` blends:

- **Fill ratio** — body height vs image height  
- **Torso segment** — shoulder line to heel  
- **Shoulder width** — anthropometric ratio  

Result clamped to plausible adult range (~140–198 cm). Shoulder width sanity check avoids unrealistic values.

---

### Q21. What is `model_complexity` in MediaPipe Pose?

**Answer:** MediaPipe setting (0, 1, or 2). We use **complexity 2** for better accuracy on still photos. Higher complexity = slower but more precise landmarks.

---

### Q22. What is landmark `visibility`?

**Answer:** Each landmark has a visibility score 0–1 indicating confidence that the point is visible in the image. Average visibility across key points feeds into overall **scan confidence**.

---

### Q23. What is the HOG fallback method?

**Answer:** **Histogram of Oriented Gradients** person detector in OpenCV. Finds a rectangle around the person. Less accurate than 33 landmarks — uses proportional formulas from bounding box height. Method name: `opencv_hog_auto_height`.

---

### Q24. When does the system use MediaPipe vs HOG?

**Answer:** If MediaPipe is installed (`pip install mediapipe`), **MediaPipe is always used**. HOG only runs when MediaPipe is unavailable (lite install without mediapipe).

---

## D. Image validation (Q25–Q30)

### Q25. Why reject some photos before measuring?

**Answer:** Face-only selfies or cropped images give wrong landmark positions. Measuring without full legs produces fake chest/waist values. Validation protects data quality.

---

### Q26. What photos are rejected?

**Answer:**

- Face-only selfies (large face, feet not low in frame)  
- Body fill too small in image (< 32% of frame height)  
- No visible leg segment (hip-to-ankle too small)  
- Obvious partial body crops  

Error message: *“Please upload a full-body photo (head to feet visible)”*

---

### Q27. What is the “score” based validation?

**Answer:** Instead of one strict rule, `image_validation.py` adds points for: good body fill, feet position, leg segments, etc. Only **obvious bad** photos hard-reject; borderline full-body photos can pass with score ≥ 5.

---

### Q28. What is `fill ratio` in validation?

**Answer:** `fill = body_pixels / image_height` — how much of the image height is occupied by the person from head top to heel. Good full-body photos typically have fill around 0.45–0.86.

---

### Q29. What tips do you give users for best scan?

**Answer:**

- Stand **2–3 meters** from camera  
- **Full body** in frame (head to feet)  
- **Front-facing**, arms slightly away from body  
- **Good lighting**, plain background  

---

### Q30. Where is validation code located?

**Answer:** `ai-service/image_validation.py` — functions `validate_mediapipe_full_body()` and `validate_hog_full_body()`.

---

## E. Confidence score (Q31–Q36)

### Q31. What does confidence percentage mean?

**Answer:** It reflects **quality of the pose scan** (landmark visibility, body fill, feet in frame)—**not** medical-grade accuracy. High confidence means the photo and pose detection were suitable for measurement.

---

### Q32. Why show 95–100% confidence?

**Answer:** After validation passes, `confidence_from_scan()` in `measurement_calibrate.py` maps quality to **0.95–1.0 (95–100%)**. Backend `scanConfidence.js` ensures saved value is at least 96% for MediaPipe scans.

---

### Q33. Why did old scans show 78%?

**Answer:** **78%** came from **offline fallback** when Python AI on port 8000 was not running (`measurementFallback.js`). Fix: run `.\start-ai.ps1` and restart backend; new scans show 95–100%.

---

### Q34. How is confidence calculated technically?

**Answer:** `compute_scan_quality()` combines:

- Body fill score (30%)  
- Key landmark visibility — shoulders, hips, knees, ankles (42%)  
- Mean visibility (18%)  
- Feet position in frame (10%)  

Then `confidence_from_scan()` maps quality to 95–100% for validated MediaPipe scans.

---

### Q35. Is 100% confidence mean perfect measurement?

**Answer:** **No.** It means the **scan conditions were excellent**, not that a tape measure would match exactly. 2D photo estimation has inherent limits (pose, clothing, camera angle).

---

### Q36. Where is confidence normalized in backend?

**Answer:** `backend/src/utils/scanConfidence.js` — used in `measurements.js` before saving to database and in API response.

---

## F. Laser scan & extras (Q37–Q42)

### Q37. What is the laser scan feature?

**Answer:** After measurement, `laser_overlay.py` draws **green laser-style lines** along the body on the image for visual feedback (like a body scanner). Image saved and shown in app as “LASER SCAN”.

---

### Q38. When is laser scan NOT generated?

**Answer:** When AI service is offline and backend uses **fallback** estimator — no pose landmarks, no laser overlay.

---

### Q39. What is size recommendation after measure?

**Answer:** Backend may call `POST /api/recommendations/size` with chest/waist/shoulder/sleeve/height to suggest shirt/kurta/suit size (e.g. M, L) and fit type.

---

### Q40. What is stored in `aiMetadata` on Measurement?

**Answer:** JSON fields such as:

- `method` — e.g. `mediapipe_calibrated_v2` or `proportional_fallback`  
- `heightAutoDetected` — true/false  
- `usedFallback` — whether AI service was unreachable  

---

### Q41. What is `isPrimary` on a measurement?

**Answer:** The **latest main scan** for a customer. When a new scan is saved, previous measurements for that tailor are set `isPrimary: false`. Orders use primary measurement by default.

---

### Q42. Can the same customer be scanned twice?

**Answer:** Yes. Each scan creates a new Measurement record. Newest becomes primary; full history visible in **Customers → customer detail**.

---

## G. Fallback & errors (Q43–Q48)

### Q43. What happens if AI service is not running?

**Answer:** Backend catches connection error (`ECONNREFUSED`), uses `estimateFromImage()` in `measurementFallback.js` — guesses height from image aspect ratio, derives proportional measurements. No laser scan. Message tells user to start AI for full scan.

---

### Q44. How does fallback estimate height?

**Answer:** Reads image width/height from JPEG/PNG header. Tall aspect ratio (portrait full-body) → taller height estimate (~168 cm baseline with adjustments).

---

### Q45. What is `usedFallback` flag?

**Answer:** Boolean in API response and `aiMetadata` indicating measurement did **not** use Python MediaPipe pipeline.

---

### Q46. What errors return status 422?

**Answer:** Invalid photo (not full body), no pose detected, validation failed — anything raised as `ValueError` in Python scanner.

---

### Q47. What errors return status 503 from AI?

**Answer:** AI dependencies not installed — e.g. `pip install -r requirements-lite.txt` or full `requirements.txt` with mediapipe.

---

### Q48. How to start AI service for demo?

**Answer:**

```powershell
.\start-ai.ps1
# OR
cd ai-service
venv\Scripts\activate
python app.py
```

Service runs at **http://localhost:8000**.

---

## H. Tricky / panel questions (Q49–Q55)

### Q49. Can AI measure through loose clothes?

**Answer:** Pose landmarks detect body outline approximately; baggy clothes can reduce accuracy. Tight or normal fitted clothing works better. We do not segment skin vs cloth.

---

### Q50. 2D photo vs 3D body scan — your limitation?

**Answer:** We use a **single 2D image**, not depth camera or 3D mesh. No multi-angle capture. Accuracy depends on front-facing pose and calibration.

---

### Q51. How would you improve measurement accuracy in future?

**Answer:** Multi-view photos, depth sensor, ML model trained on tailor datasets, cloth segmentation, reference object in frame for scale, or manual height confirmation option.

---

### Q52. Which Python file is the main scanner class?

**Answer:** `ai-service/body_scanner.py` — class `BodyScanner`, methods `_detect_mediapipe()`, `_detect_hog()`, `scan()`.

---

### Q53. Which file handles height calibration?

**Answer:** `ai-service/measurement_calibrate.py` — `estimate_height_cm()`, `compute_scan_quality()`, `confidence_from_scan()`.

---

### Q54. Explain formula: scale = height_cm / body_pixels.

**Answer:** If the person’s body spans 800 pixels and estimated height is 168 cm, each pixel ≈ 168/800 cm. Shoulder width 200 px → 200 × (168/800) ≈ 42 cm shoulder width.

---

### Q55. One-minute answer: “Explain your AI measurement module.”

**Answer:**

> “When the tailor uploads a full-body photo, our Node API forwards it to a Python FastAPI service. MediaPipe detects 33 body landmarks. We validate the photo is not a selfie, calculate pixel distances, auto-estimate height, convert to centimeters, and compute a 95–100% confidence score. A laser overlay image is generated for display. Results are stored in MongoDB linked to the customer. If AI is offline, a proportional fallback estimates from image dimensions.”

---

## Quick file reference (memorize for viva)

| Question topic | File |
|----------------|------|
| AI HTTP API | `ai-service/app.py` |
| Pose + measurements | `ai-service/body_scanner.py` |
| Photo validation | `ai-service/image_validation.py` |
| Height + confidence | `ai-service/measurement_calibrate.py` |
| Laser image | `ai-service/laser_overlay.py` |
| Backend detect route | `backend/src/routes/measurements.js` |
| Call Python | `backend/src/services/aiClient.js` |
| Offline fallback | `backend/src/services/measurementFallback.js` |
| Confidence display | `backend/src/utils/scanConfidence.js` |
| Mobile UI | `mobile/src/screens/MeasureScreen.js` |

---

## Revision checklist (measurement only)

- [ ] MediaPipe = 33 landmarks  
- [ ] Full-body validation purpose  
- [ ] height_cm / body_pixels scaling  
- [ ] Ports 5000 + 8000  
- [ ] 422 = bad photo  
- [ ] Fallback = AI offline  
- [ ] 95–100% = scan quality not medical proof  
- [ ] laser_overlay purpose  
- [ ] POST /api/measurements/detect  

---

*AI Measurement Module — Viva Preparation — AI Tailor Project*
