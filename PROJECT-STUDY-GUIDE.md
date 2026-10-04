# AI Tailor — Complete Project Study Guide (Exam Prep)

**Project name:** AI Tailor — Smart Tailoring Platform  
**Type:** Full-stack mobile + REST API + AI microservice  
**Root folder:** `h:\New folder (3)`

---

## 1. High-Level Overview

AI Tailor is a **smart tailoring management system** for tailor shops and their customers. A tailor can scan a customer’s full-body photo with AI, save measurements to the cloud, manage orders through production stages, and view all customer records. Customers can register, track order progress in real time, and receive notifications when their cloth is ready.

### Three-tier architecture

```
┌─────────────────────────┐
│  MOBILE (Frontend)      │  React Native + Expo (Android/iOS)
│  Port: Expo Metro       │
└───────────┬─────────────┘
            │ HTTP REST (Axios) + WebSocket (Socket.io)
            ▼
┌─────────────────────────┐
│  BACKEND (API Server)   │  Node.js + Express
│  Port: 5000             │
└───────────┬─────────────┘
            │ HTTP to AI + Mongoose to DB
     ┌──────┴──────┐
     ▼             ▼
┌──────────┐  ┌──────────────┐
│ AI SVC   │  │ MongoDB Atlas│
│ :8000    │  │ (Cloud DB)   │
│ Python   │  └──────────────┘
└──────────┘
```

---

## 2. Tech Stack (Complete)

### 2.1 Frontend — Mobile App (`mobile/`)

| Technology | Version / Role |
|------------|----------------|
| **React Native** | 0.76 — cross-platform UI |
| **Expo** | ~52 — build, camera, assets, dev server |
| **React** | 18.3 — UI library |
| **React Navigation** | v7 — Stack + Bottom Tabs |
| **Axios** | HTTP client → backend API |
| **Socket.io-client** | Real-time order + notifications |
| **AsyncStorage** | JWT token persistence |
| **Expo Image Picker** | Camera / gallery for body photos |
| **Expo Linear Gradient** | Login UI styling |
| **React Native SVG** | Design canvas drawing |
| **@expo/vector-icons** | Ionicons tab icons |

**Language:** JavaScript (JSX)  
**Pattern:** Context API (`AuthContext`, `SocketContext`), screen-based navigation

### 2.2 Backend — API Server (`backend/`)

| Technology | Role |
|------------|------|
| **Node.js** | Runtime (18+) |
| **Express.js** | REST API framework |
| **Mongoose** | MongoDB ODM (schemas, queries) |
| **MongoDB Atlas** | Cloud database (`ai_tailor` DB) |
| **JWT (jsonwebtoken)** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **express-validator** | Request validation |
| **Multer** | Multipart file uploads (images) |
| **Socket.io** | Real-time events |
| **Axios + form-data** | Calls Python AI service |
| **dotenv** | Environment variables |
| **cors** | Cross-origin for mobile |
| **HTTP + Node http** | Server with Socket.io attached |

**Language:** JavaScript (CommonJS)  
**Pattern:** MVC-like — `routes/` → `models/` → `services/` → `middleware/`

### 2.3 AI Service (`ai-service/`)

| Technology | Role |
|------------|------|
| **Python** | 3.10+ |
| **FastAPI** | REST API for ML/CV |
| **Uvicorn** | ASGI server (port 8000) |
| **OpenCV (cv2)** | Image read, resize, HOG fallback |
| **MediaPipe** | 33-point human pose detection |
| **NumPy** | Distance math, proportions |
| **Pydantic** | Request/response models |
| **python-multipart** | Image upload handling |

**Optional modules:** `sketch_analyzer.py`, `virtual_tryon.py`, `laser_overlay.py`

**Lite install:** `requirements-lite.txt` (no MediaPipe) — fallback only  
**Full install:** `requirements.txt` (includes MediaPipe)

### 2.4 Database & Storage

| Item | Details |
|------|---------|
| **MongoDB Atlas** | Primary production DB |
| **Collections** | users, customers, measurements, orders, designs, notifications |
| **File storage** | Local `uploads/` (body, laser, designs) served at `/uploads` |
| **In-memory fallback** | `mongodb-memory-server` for dev without Atlas |

### 2.5 DevOps / Scripts

| File | Purpose |
|------|---------|
| `start-ai.ps1` | Start Python AI on :8000 |
| `RUN-ALL.md` | How to run all services |
| `backend/ATLAS-SETUP.md` | MongoDB Atlas setup |
| `mobile/scripts/start-expo.ps1` | Expo with 8GB heap, metro workers |

---

## 3. Project Folder Structure

```
h:\New folder (3)\
├── mobile/                    # Frontend (Expo React Native)
│   ├── src/
│   │   ├── screens/           # All UI screens (21 files)
│   │   ├── navigation/        # AppNavigator, helpers
│   │   ├── context/           # AuthContext, SocketContext
│   │   ├── services/api.js    # Axios API client
│   │   ├── components/        # Button, Card, Input, ProgressBar, SketchCanvas
│   │   ├── config/api.js      # API_URL auto-detect (LAN/emulator)
│   │   └── theme/colors.js
│   ├── app.config.js
│   └── package.json
│
├── backend/                   # Node.js API
│   ├── src/
│   │   ├── server.js          # Entry + Socket.io + routes mount
│   │   ├── routes/            # auth, orders, measurements, customers, admin...
│   │   ├── models/            # Mongoose schemas (6 models)
│   │   ├── middleware/        # auth, upload, requireMongo
│   │   ├── services/          # aiClient, measurementFallback
│   │   └── utils/             # notifications, customerOrders, measurementFormat
│   ├── .env                   # MONGODB_URI, JWT_SECRET, AI_SERVICE_URL
│   └── package.json
│
├── ai-service/                # Python AI
│   ├── app.py                 # FastAPI entry
│   ├── body_scanner.py        # MediaPipe + HOG measurement
│   ├── image_validation.py    # Full-body photo check
│   ├── measurement_calibrate.py
│   ├── laser_overlay.py
│   ├── size_recommender.py
│   ├── virtual_tryon.py
│   ├── sketch_analyzer.py
│   └── requirements.txt
│
├── README.md
├── RUN-ALL.md
└── PROJECT-STUDY-GUIDE.md     # This file
```

---

## 4. User Roles & Authentication

### 4.1 Roles

| Role | Who | App experience |
|------|-----|----------------|
| **tailor** | Shop owner / staff | Dashboard, AI Measure, Customers, Designs, Orders |
| **customer** | End client | My Orders, Notifications, Profile |
| **admin** | System admin (`basavaraj`) | Database view (all Atlas data) |

### 4.2 Auth flow (JWT)

1. User registers or logs in → backend returns **JWT token** + user object  
2. Mobile saves token in **AsyncStorage**  
3. Every API request: header `Authorization: Bearer <token>`  
4. Middleware `protect` verifies JWT → loads user from MongoDB  
5. Middleware `authorize('tailor', 'customer', ...)` checks role  

### 4.3 Auth API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/status` | DB connection status |
| POST | `/api/auth/register` | Tailor registration |
| POST | `/api/auth/customer/register` | Customer registration |
| POST | `/api/auth/login` | Login (`role: tailor` or `customer` in body) |
| GET | `/api/auth/me` | Current user (any role) |
| PUT | `/api/auth/fcm-token` | Push token (future FCM) |

### 4.4 Email matching (customer ↔ orders)

- Tailor saves **customer email** on AI Measure / customer profile  
- Customer registers with **same email**  
- Orders link via `shopCustomer.email` or `order.clientEmail`  
- Customer sees only their orders; notifications go to matching `User` with `role: customer`

---

## 5. All Features & Functionality

### 5.1 Tailor features

| Feature | Screen | What it does |
|---------|--------|--------------|
| **Login / Register** | LoginScreen, RegisterScreen | Tailor shop account |
| **Dashboard** | TailorDashboardScreen | Order stats, advance status, link to customer records |
| **AI Body Scan** | MeasureScreen | Full-body photo → AI measurements → save to Atlas |
| **Customer records** | CustomersScreen, CustomerDetailScreen | All customers + full measurement history |
| **Designs catalog** | DesignsScreen | Browse shirt/suit/kurta designs |
| **Upload design** | AddDesignScreen | Tailor uploads custom design image |
| **Design canvas** | DesignCanvasScreen | Draw sketch → AI analyzes garment type |
| **Shop orders** | OrdersScreen, OrderDetailScreen | Create & track orders |
| **Place order** | PlaceOrderScreen | New order for a customer + measurements |
| **Virtual try-on** | TryOnScreen | Body + cloth image → AI preview |
| **Notifications** | NotificationsScreen | Tailor order alerts |
| **Profile** | ProfileScreen | Account info, logout |

### 5.2 Customer features

| Feature | Screen | What it does |
|---------|--------|--------------|
| **Customer login** | LoginScreen (Customer tab) | Sign in as customer |
| **Customer register** | CustomerRegisterScreen | Account + email link to tailor records |
| **My orders** | CustomerOrdersScreen | Progress bar, status, ready banner |
| **Order detail** | CustomerOrderDetailScreen | Stages timeline, status history |
| **Notifications** | NotificationsScreen (tab) | Ready alerts, tap → order detail |
| **Profile** | ProfileScreen | Email hint for matching |

### 5.3 Admin features

| Feature | Screen | What it does |
|---------|--------|--------------|
| **Database dashboard** | AdminScreen | Counts + lists users, customers, measurements, orders |
| **Admin login** | LoginScreen | `basavaraj` / `basavaraj@aitailor.com` |

### 5.4 AI / ML features

| Feature | How it works |
|---------|--------------|
| **Body measurement** | MediaPipe Pose → 33 landmarks → pixel distances → scale to cm (height calibration) |
| **Full-body validation** | Rejects selfies; scoring-based check (head to feet) |
| **Laser scan overlay** | Green laser-style lines on body image |
| **Size recommendation** | Rule-based from chest/waist/shoulder → S/M/L etc. |
| **Virtual try-on** | Pose detection + cloth overlay on body |
| **Sketch analyzer** | Canvas strokes → garment category suggestion |
| **Offline fallback** | If AI service down, proportional estimate from image size |

### 5.5 Order progress pipeline

```
placed → measurements_confirmed → cutting → stitching → fitting → quality_check → ready → delivered
```

| Status | Progress % |
|--------|------------|
| placed | 5% |
| measurements_confirmed | 15% |
| cutting | 30% |
| stitching | 55% |
| fitting | 75% |
| quality_check | 90% |
| ready | 100% |
| delivered | 100% |

- Tailor updates status → **Socket.io** `orderStatusUpdate` + **Notification** to tailor & customer  
- Customer sees live progress on **My Orders**

---

## 6. Database Models (MongoDB)

### 6.1 User (`User.js`)

```
name, email (unique), phone, password (hashed), role (customer|tailor|admin),
avatar, address, fcmToken, timestamps
```

### 6.2 Customer (`Customer.js`) — tailor’s shop clients

```
tailor (ref User), name, phone, email, address, notes, timestamps
```

### 6.3 Measurement (`Measurement.js`)

```
user (tailor ref), customer (ref), customerName/Phone/Email/Address/Notes (snapshot),
chest, waist, shoulder, sleeveLength, height, hips, inseam, neck, armLength, forearm, thigh, bicep,
unit (cm), sourceImage, laserScanImage, confidence, aiMetadata, isPrimary, timestamps
```

### 6.4 Order (`Order.js`)

```
orderNumber (auto AT-xxx), tailor, shopCustomer, clientName, clientPhone, clientEmail,
design, customDesignImage, bodyPhoto, measurements (ref),
garmentType, fabricDetails, sizeRecommendation, tryOnPreview,
status, progressPercent, notes, tailorNotes, estimatedDelivery,
totalAmount, paymentStatus, statusHistory[], timestamps
```

### 6.5 Design (`Design.js`)

```
title, category, fabricType, price, imageUrl, tailor, isPublic, timestamps
```

### 6.6 Notification (`Notification.js`)

```
user (ref), title, message, type (order_update|order_complete|...), order (ref), read, data, timestamps
```

---

## 7. Backend API Reference (All Routes)

**Base URL:** `http://localhost:5000/api`

### Auth — `/api/auth`
- `GET /status`
- `POST /register` (tailor)
- `POST /customer/register`
- `POST /login`
- `GET /me`
- `PUT /fcm-token`

### Measurements — `/api/measurements`
- `POST /detect` — multipart image + customer fields → AI scan → save Measurement
- `GET /` — list measurements (optional `?customerId=`)
- `GET /primary` — primary measurement per customer

### Customers — `/api/customers` (tailor only)
- `GET /` — list customers
- `GET /records` — customers + measurement summary
- `GET /:id` — full profile + all measurements + orders
- `POST /` — create customer

### Orders — `/api/orders`
- `POST /` — create order (tailor, multipart)
- `GET /customer/my` — customer’s orders (email matched)
- `GET /customer/:id` — customer order detail
- `GET /my` — tailor orders
- `GET /dashboard` — tailor dashboard + stats
- `GET /:id` — order detail (tailor)
- `PATCH /:id/status` — update progress
- `PATCH /:id/assign` — assign tailor

### Designs — `/api/designs`
- `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`

### Notifications — `/api/notifications`
- `GET /`, `PATCH /read-all`, `PATCH /:id/read`

### Canvas — `/api/canvas`
- `POST /analyze`, `POST /save`, `GET /mine`

### Try-on — `/api/tryon`
- `POST /` — proxy to AI try-on

### Admin — `/api/admin`
- `GET /dashboard`, `GET /data`

### Static
- `GET /health`
- `GET /uploads/*` — images

---

## 8. AI Service API (`http://localhost:8000`)

| Method | Endpoint | Input | Output |
|--------|----------|-------|--------|
| GET | `/health` | — | mediapipe status, features on/off |
| POST | `/api/measurements/detect` | image file, optional height_cm | measurements JSON + laser_image_base64 |
| POST | `/api/recommendations/size` | measurements JSON, garment_type | recommended size, fit type |
| POST | `/api/tryon/generate` | body_image + cloth_image | PNG preview bytes |
| POST | `/api/sketch/analyze` | stroke data | garment analysis |

### AI pipeline (measurement)

```
Upload image → resize (max 1280px) → MediaPipe Pose
  → validate full-body (image_validation.py)
  → calculate distances (shoulder, hip, sleeve, inseam...)
  → estimate height (measurement_calibrate.py)
  → scale all measurements to cm
  → generate laser overlay (laser_overlay.py)
  → return JSON to Node backend → save MongoDB
```

**Fallback:** OpenCV HOG people detector if MediaPipe unavailable  
**Backend fallback:** `measurementFallback.js` if AI service unreachable

---

## 9. Real-Time Communication (Socket.io)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `joinUser` | Client → Server | Join room `user:{userId}` for notifications |
| `joinOrder` | Client → Server | Join room `order:{orderId}` for live status |
| `orderStatusUpdate` | Server → Client | `{ orderId, status, progressPercent }` |
| `notification` | Server → Client | New notification payload |

**Used in:** CustomerOrdersScreen, CustomerOrderDetailScreen, OrderDetailScreen, NotificationsScreen

---

## 10. Key Data Flows (For Exam Answers)

### Flow A: AI measurement save

```
Mobile MeasureScreen → FormData(image + customerName, email...)
  → POST /api/measurements/detect (Node)
  → POST /api/measurements/detect (Python AI)
  → MediaPipe scan + validate
  → Node saves Customer + Measurement in Atlas
  → Response: measurements + laserScanUrl + customer id
```

### Flow B: Customer tracks order

```
Tailor creates order with customer email
  → Customer registers with same email
  → GET /api/orders/customer/my
  → MongoDB matches shopCustomer.email OR clientEmail
  → Customer sees progress list
  → Tailor PATCH status → notifyCustomerForOrder()
  → Socket + Notification → Customer app updates
```

### Flow C: Tailor advances order

```
TailorDashboard → PATCH /api/orders/:id/status
  → Update progressPercent + statusHistory
  → Socket emit orderStatusUpdate
  → createNotification (tailor + customer)
  → Customer sees "Cloth is ready!" when status = ready
```

---

## 11. Security Concepts

| Topic | Implementation |
|-------|----------------|
| Password storage | bcrypt hash (12 rounds) |
| API auth | JWT Bearer token, 7-day expiry |
| Role access | `authorize()` middleware per route |
| Customer data isolation | Email match only — cannot see others’ orders |
| File upload | Multer, stored outside web root with controlled path |
| MongoDB | Atlas TLS, credentials in `.env` (not in git) |

---

## 12. Ports & Environment Variables

| Service | Port | Key env vars |
|---------|------|----------------|
| Backend | 5000 | `MONGODB_URI`, `JWT_SECRET`, `AI_SERVICE_URL`, `PORT` |
| AI Service | 8000 | `HOST`, `PORT` |
| Expo Metro | 8081 | `EXPO_PUBLIC_API_URL` (optional) |
| MongoDB Atlas | 27017 (cloud) | connection string in `.env` |

---

## 13. Exam-Style Short Answers

**Q: What architecture is used?**  
A: Three-tier — React Native mobile client, Node.js REST API, Python AI microservice, MongoDB Atlas database, Socket.io for real-time.

**Q: How are body measurements detected?**  
A: MediaPipe Pose Landmarker detects 33 body keypoints; Euclidean distances in pixels are converted to cm using estimated height and body proportions; validated for full-body photos.

**Q: How does customer see only their orders?**  
A: Orders are linked by email — `clientEmail` on order and `Customer.email` in DB must match the logged-in customer user’s email.

**Q: What is JWT used for?**  
A: Stateless authentication — token issued on login, sent on each request, verified by middleware without server sessions.

**Q: What is Mongoose?**  
A: ODM for MongoDB — defines schemas, validation, references between collections (User, Customer, Order, etc.).

**Q: Why separate Python AI service?**  
A: ML/CV libraries (OpenCV, MediaPipe) are Python-native; separation allows independent scaling, restart, and fallback without crashing the main API.

**Q: What happens if AI service is offline?**  
A: Backend uses `measurementFallback.js` for proportional estimates; laser scan may be skipped; user sees warning in app.

---

## 14. How to Run (Quick)

```powershell
# Terminal 1 — AI
.\start-ai.ps1

# Terminal 2 — Backend
cd backend
npm start

# Terminal 3 — Mobile
cd mobile
npm run start
# Scan QR with Expo Go
```

---

## 15. Important Files to Read Before Exam

| Priority | File | Why |
|----------|------|-----|
| ★★★ | `backend/src/server.js` | App entry, routes, Socket.io |
| ★★★ | `backend/src/routes/auth.js` | Login, roles, JWT |
| ★★★ | `backend/src/routes/orders.js` | Orders + customer progress |
| ★★★ | `ai-service/body_scanner.py` | Core AI logic |
| ★★★ | `mobile/src/navigation/AppNavigator.js` | App structure by role |
| ★★ | `backend/src/utils/customerOrders.js` | Email matching + notifications |
| ★★ | `mobile/src/context/AuthContext.js` | Session management |
| ★★ | `backend/src/models/Order.js` | Order schema + statuses |
| ★ | `ai-service/image_validation.py` | Photo validation rules |
| ★ | `mobile/src/services/api.js` | All API calls |

---

*Generated for exam study — AI Tailor Project. Good luck on your external exam!*
