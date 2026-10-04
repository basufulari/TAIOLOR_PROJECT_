# AI Tailor — Smart Tailoring Android App

Full-stack smart tailoring platform with **React Native (Expo)** mobile app, **Node.js/Express** REST API, **MongoDB Atlas** database, and **Python** AI services for body measurement detection, size recommendations, and virtual try-on.

## Architecture

```
┌─────────────────┐     REST + WebSocket      ┌──────────────────┐
│  React Native   │ ◄────────────────────────►│  Express API     │
│  (Android/iOS)  │                           │  (Node.js)       │
└─────────────────┘                           └────────┬─────────┘
                                                       │
                       ┌───────────────────────────────┼───────────────┐
                       ▼                               ▼               ▼
              ┌────────────────┐              ┌──────────────┐  ┌─────────────┐
              │ Python AI      │              │ MongoDB      │  │ File uploads│
              │ FastAPI        │              │ Atlas        │  │ (images)    │
              │ MediaPipe/CV   │              └──────────────┘  └─────────────┘
              └────────────────┘
```

## Features

| Feature | Description |
|--------|-------------|
| **Authentication** | JWT-based register/login (customer, tailor, admin) |
| **AI Measurements** | MediaPipe pose detection → chest, waist, shoulder, sleeve, height |
| **Size Recommendation** | Rule-based AI fitting from measurements |
| **Virtual Try-On** | Pose-aware cloth overlay on body photo |
| **Orders** | Place orders, track stitching progress, real-time updates |
| **Tailor Dashboard** | Manage orders, advance status, notify when ready |
| **Notifications** | In-app + Socket.io real-time alerts |

## Project Structure

```
├── backend/          # Express API + MongoDB models
├── ai-service/       # Python FastAPI (OpenCV, MediaPipe)
├── mobile/           # React Native Expo app
└── README.md
```

## Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB Atlas account (or local MongoDB)
- Android Studio / Expo Go for mobile testing

## Setup

### 1. MongoDB (choose one)

**Local with Docker (recommended):**
```bash
docker compose up -d
# or on Windows: .\start-mongo.ps1
```

**MongoDB Atlas (cloud):** Create a cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), then set `MONGODB_URI` in `backend/.env`.

**In-memory (no install):** Set `USE_IN_MEMORY_DB=true` in `backend/.env`.

Default `backend/.env`:
```env
USE_IN_MEMORY_DB=false
MONGODB_URI=mongodb://127.0.0.1:27017/ai_tailor
```

### 2. Backend API

```bash
cd backend
cp .env.example .env
# Edit .env if using Atlas; JWT_SECRET; AI_SERVICE_URL=http://localhost:8000
npm install
npm run dev
```

API runs at `http://localhost:5000`

### 3. Python AI Service

```bash
cd ai-service
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

AI service runs at `http://localhost:8000`

### 4. Mobile App

```bash
cd mobile
npm install
```

**API URL for devices:**

| Environment | `app.json` extra.apiUrl |
|-------------|-------------------------|
| Android Emulator | `http://10.0.2.2:5000` |
| Physical device | `http://<YOUR_PC_LAN_IP>:5000` |

Add Expo assets (or defaults):

```bash
# Optional: generate placeholder icons
npx expo install
npx expo start
# Press 'a' for Android emulator
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register customer/tailor |
| POST | `/api/auth/login` | Login |
| POST | `/api/measurements/detect` | Upload body photo → AI measurements |
| POST | `/api/orders` | Place tailoring order |
| GET | `/api/orders/my` | Customer orders |
| GET | `/api/orders/dashboard` | Tailor/admin dashboard |
| PATCH | `/api/orders/:id/status` | Update stitching progress |
| POST | `/api/tryon` | Virtual try-on preview |
| GET | `/api/notifications` | User notifications |

## User Roles

- **Customer**: Register, scan body, browse designs, place orders, try-on, track status
- **Tailor**: Dashboard, update order progress, upload designs
- **Admin**: Full order visibility (register with role via DB or extend register)

Register as tailor: set `role` to `tailor` on the Register screen.

## AI Measurement Tips

- Use a **full-body, front-facing** photo with good lighting
- Stand straight, arms slightly away from body
- Optionally enter **height in cm** for better scale calibration
- MediaPipe detects 33 pose landmarks; measurements are estimated proportionally

## Real-Time Updates

Socket.io events:

- `joinUser` / `joinOrder` — client rooms
- `orderStatusUpdate` — live order progress
- `notification` — tailor updates (e.g. cloth ready)

## Production Notes

- Use HTTPS and secure `JWT_SECRET`
- Store uploads on S3/Cloudinary instead of local disk
- Deploy AI service on GPU-enabled server for heavier ML models
- Add Firebase Cloud Messaging for push notifications (`fcmToken` field on User)
- Consider TensorFlow/PyTorch fine-tuned models for higher measurement accuracy

## Tech Stack

- **Frontend**: React Native, Expo, React Navigation, Socket.io-client
- **Backend**: Node.js, Express, Mongoose, JWT, Multer, Socket.io
- **Database**: MongoDB Atlas
- **AI**: Python, FastAPI, OpenCV, MediaPipe, NumPy

## License

MIT — use freely for learning and commercial projects.
