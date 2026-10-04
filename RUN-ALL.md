# Run all features (real mode)

## 1. Backend
```powershell
cd backend
npm install
npm run dev
```
Wait: `✓ API ready` and `MongoDB connected`

## 2. Seed designs (once)
```powershell
cd backend
npm run seed
```

## 3. AI service (auto scan + laser image)
```powershell
.\start-ai.ps1
```
Or: `cd ai-service` → `pip install -r requirements-lite.txt` → `python app.py`

Runs at `http://localhost:8000` — auto-detects height from photo (no user input).
Optional (installed): `mediapipe==0.10.14` for best pose + try-on accuracy.

## 4. Mobile
```powershell
cd mobile
npm install
# Optional: mobile/.env → EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:5000
npm start
```

## 5. Register & use
1. **Register** (new email) — not "UI preview"
2. **AI Measure** — photo + height (cm)
3. **Designs** — pick design → place order
4. **Orders** — track status
5. **Try-On** — body + cloth; pick garment type (shirt/kurta/dress); pose-aware warp + blend
6. **Design Canvas** — touch sketch → AI patterns + similar styles → save to MongoDB

## Design Canvas
- Home → **Design Canvas** or Designs → **✏️ Canvas**
- Draw with finger, tap **Detect patterns & styles**, then **Save to MongoDB**
- Requires MongoDB connected (Atlas or Docker)

## Tailor account
Register with role `tailor` → Dashboard + upload designs

## Accuracy tips
- **No height input** — photo only; AI detects height automatically
- Full-body, front-facing photo, arms slightly out, good lighting
- Laser scan image shows measurement lines on your photo
- For best accuracy: `pip install mediapipe` in ai-service venv
