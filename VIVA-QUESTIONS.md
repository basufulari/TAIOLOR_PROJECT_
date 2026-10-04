# AI Tailor — Viva / External Exam Questions & Answers

**Project:** AI Tailor — Smart Tailoring Platform  
**Use with:** `TEAM-GUIDE.md` (features) + `PROJECT-STUDY-GUIDE.md` (technical depth)

---

## Section A — Project Introduction (Q1–Q8)

### Q1. What is your project about?

**Answer:** AI Tailor is a full-stack smart tailoring mobile application. Tailors can measure customers using AI from a full-body photo, save customer and measurement data in the cloud, manage orders through stitching stages, and issue payment receipts. Customers can register, track their order progress, and receive notifications when their cloth is ready. An admin can view all system data from a database dashboard.

---

### Q2. What real-world problem does it solve?

**Answer:** Traditional tailoring shops often use manual tape measurements, paper records, and phone calls for order updates. Our system digitizes measurements with AI, stores everything in MongoDB Atlas, automates order progress tracking, and gives customers a mobile portal to see status and receipts—reducing errors and improving communication.

---

### Q3. Who are the end users of your system?

**Answer:** There are three roles:

| Role | Description |
|------|-------------|
| **Tailor** | Shop owner or staff who measures customers and manages orders |
| **Customer** | Person who orders clothes and tracks progress |
| **Admin** | System administrator who monitors all data |

---

### Q4. Why did you choose a mobile application?

**Answer:** Tailoring work happens in the shop with customers present. A mobile app allows the tailor to capture body photos with the camera, scan immediately, and update order status on the spot. Customers also prefer checking order status on their phones.

---

### Q5. What is novel or unique in your project?

**Answer:** Key highlights are: (1) AI-based body measurement using MediaPipe pose detection without manual height entry, (2) laser-style scan overlay on the body image, (3) email-based linking so customers see only their orders, (4) real-time notifications via Socket.io, and (5) integrated payment receipts visible to customers.

---

### Q6. What are the main modules of your project?

**Answer:**

1. **Authentication** — Register/login for tailor and customer  
2. **AI Measurement** — Body scan and save measurements  
3. **Customer Records** — Tailor’s shop customer database  
4. **Orders** — Create orders, status pipeline, payment receipt  
5. **Designs** — Catalog, image upload, design canvas sketch  
6. **Customer Portal** — My orders, notifications, receipts  
7. **Admin Database** — View all cloud data  

---

### Q7. Is this a web app or mobile app?

**Answer:** The client is a **mobile app** built with **React Native** and **Expo**, which runs on Android (and can run on iOS). The **backend** is a web API (Node.js/Express) that the mobile app calls over HTTP. The **AI service** is a separate Python server.

---

### Q8. Where is data stored?

**Answer:** All business data (users, customers, measurements, orders, designs, notifications) is stored in **MongoDB Atlas** (cloud database). Images are stored on the server filesystem under `uploads/` and served via the API.

---

## Section B — Architecture & Tech Stack (Q9–Q18)

### Q9. Explain the architecture of your system.

**Answer:**

```
Mobile App (Expo)  →  REST API + WebSocket  →  Backend (Express :5000)
                                                    ↓
                                            MongoDB Atlas
                                                    ↓
                                            AI Service (FastAPI :8000)
```

The mobile app never talks to the database directly. It sends requests to the backend, which validates JWT, processes logic, and reads/writes MongoDB. For body scans, the backend forwards the image to the Python AI service.

---

### Q10. What is the frontend technology stack?

**Answer:** React Native 0.76, Expo 52, React Navigation (tabs + stack), Axios for HTTP, Socket.io-client for real-time events, AsyncStorage for JWT token, Expo Image Picker for camera/gallery.

---

### Q11. What is the backend technology stack?

**Answer:** Node.js, Express.js, Mongoose (MongoDB ODM), JSON Web Token (JWT) for authentication, bcryptjs for password hashing, Multer for file uploads, Socket.io for real-time notifications and order updates, express-validator for input validation.

---

### Q12. What is the AI layer technology?

**Answer:** Python 3, FastAPI, Uvicorn server, OpenCV for image processing, MediaPipe for human pose landmarks, NumPy for distance calculations. Optional modules include laser overlay, size recommendation, virtual try-on, and sketch analyzer.

---

### Q13. Why use a separate Python service for AI instead of Node.js only?

**Answer:** MediaPipe and OpenCV are mature in Python. Separating AI into its own microservice keeps the main API fast and stable. If AI crashes or is heavy, the rest of the app still works (with a fallback estimator). Teams can scale or update AI independently.

---

### Q14. What ports do your services use?

**Answer:**

| Service | Default port |
|---------|----------------|
| Backend API | 5000 |
| AI service | 8000 |
| Expo Metro (dev) | 8081 |

---

### Q15. What is REST API? How is it used in your project?

**Answer:** REST uses HTTP methods (GET, POST, PATCH) on URLs like `/api/auth/login`, `/api/measurements/detect`, `/api/orders/customer/my`. The mobile app sends JSON or multipart form data and receives JSON responses. It is stateless; authentication uses JWT in headers.

---

### Q16. What is Socket.io used for?

**Answer:** Socket.io provides real-time push from server to app. When a tailor updates order status, the server emits `orderStatusUpdate` to clients joined to that order room. Notifications are emitted to `user:{userId}` rooms so customers see alerts without refreshing.

---

### Q17. What is MongoDB Atlas?

**Answer:** MongoDB Atlas is a cloud-hosted MongoDB database. We use it so data persists across devices, supports production deployment, and does not depend on a single laptop’s local database.

---

### Q18. What is Mongoose?

**Answer:** Mongoose is an Object Data Modeling library for Node.js. It defines schemas (User, Customer, Order, etc.), validates fields, and provides methods like `find`, `create`, `populate` to work with MongoDB collections easily.

---

## Section C — Database & Models (Q19–Q28)

### Q19. How many database collections (models) do you have?

**Answer:** Six main models: **User**, **Customer**, **Measurement**, **Order**, **Design**, and **Notification**.

---

### Q20. What is the difference between User and Customer?

**Answer:**

| | User | Customer |
|---|------|----------|
| **Purpose** | Login account for app | Tailor’s shop client record |
| **Roles** | tailor, customer, admin | No login role—linked to tailor |
| **Created when** | Register on login screen | AI measure or order flow |
| **Example** | `tailor@shop.com` logs in | “Rahul Sharma” measured at shop |

A **customer** (shop client) may later create a **User** with role `customer` using the same email to track orders.

---

### Q21. What fields are stored in the Measurement model?

**Answer:** Tailor reference (`user`), link to `Customer`, denormalized customer contact fields, body measurements in cm (chest, waist, shoulder, sleeve length, height, hips, inseam, neck, arm, forearm, thigh, bicep), `confidence`, `sourceImage`, `laserScanImage`, `aiMetadata` (method, fallback flag), and `isPrimary` flag for the latest main scan.

---

### Q22. What fields are stored in the Order model?

**Answer:** `orderNumber`, tailor reference, `shopCustomer`, client name/phone/email, design reference, garment type, fabric details, measurement reference, status, `progressPercent`, payment fields (`totalAmount`, `amountPaid`, `receiptNumber`, `paymentMethod`, `paymentStatus`), `statusHistory`, timestamps.

---

### Q23. Explain the relationship between Order and Measurement.

**Answer:** An order can reference one Measurement document via `measurements` ObjectId. When placing an order, the tailor selects a customer; the system uses their primary measurement or a specific measurement ID for size context and order linkage.

---

### Q24. What is `isPrimary` on measurements?

**Answer:** When a tailor scans again for the same customer, the newest scan is marked `isPrimary: true` and older scans for that tailor are set to `false`. Place order flow uses the primary measurement by default.

---

### Q25. Why NoSQL (MongoDB) instead of MySQL?

**Answer:** Order documents have nested fields like `statusHistory` and mixed metadata (`aiMetadata`, `sizeRecommendation`). MongoDB’s flexible JSON-like documents fit this well. Rapid prototyping and Atlas cloud hosting were also practical for our stack.

---

### Q26. Where is the admin “Database” feature implemented in code?

**Answer:**

- **Frontend:** `mobile/src/screens/AdminScreen.js`  
- **Navigation:** `mobile/src/navigation/AppNavigator.js` (tab title “Database”)  
- **Backend:** `backend/src/routes/admin.js` — routes `/api/admin/dashboard` and `/api/admin/data`  

---

### Q27. What does `populate` mean in Mongoose?

**Answer:** `populate` replaces ObjectId references with actual documents. Example: `Order.find().populate('shopCustomer', 'name phone email')` returns order with customer name and phone embedded in the response instead of only an ID.

---

### Q28. How are images stored?

**Answer:** Uploaded images are saved under `backend/uploads/` (body, laser, designs). The database stores the path (e.g. `/uploads/body/photo.jpg`). The API serves static files so the mobile app loads them via `http://server:5000/uploads/...`.

---

## Section D — Authentication & Security (Q29–Q36)

### Q29. How does user authentication work?

**Answer:**

1. User sends email + password + role (tailor/customer) to `POST /api/auth/login`  
2. Server verifies password with bcrypt  
3. Server checks role matches account type  
4. Server returns JWT token + user object  
5. Mobile app stores token in AsyncStorage  
6. Every API request sends `Authorization: Bearer <token>`  
7. `protect` middleware verifies JWT and attaches `req.user`  

---

### Q30. What is JWT?

**Answer:** JSON Web Token is a signed string containing user id. The server does not store sessions in memory. The client sends the token each request; the server verifies signature and expiry. Default expiry is 7 days (configurable via `JWT_EXPIRE`).

---

### Q31. How are passwords secured?

**Answer:** Passwords are never stored in plain text. Mongoose pre-save hook hashes passwords with **bcrypt** (12 rounds). Login uses `comparePassword` to check the hash.

---

### Q32. How do tailor, customer, and admin logins differ?

**Answer:** Same login API, different expectations:

| Login tab | Allowed roles |
|-----------|----------------|
| Tailor tab | `tailor` or `admin` |
| Customer tab | `customer` only |

Admin uses Tailor tab but sees Admin screens because `role === 'admin'`.

---

### Q33. How does a customer only see their own orders?

**Answer:** Backend function `findOrdersForCustomerUser` matches logged-in user email against:

- `Order.clientEmail`  
- `Customer.email` on linked `shopCustomer`  

No match → order not returned. Customer cannot access another customer’s order by ID unless email matches.

---

### Q34. What is middleware `protect` and `authorize`?

**Answer:**

- **`protect`** — Requires valid JWT; loads user from database  
- **`authorize('tailor', 'admin')`** — Requires user role in allowed list  

Example: `GET /api/customers/records` is only for tailor and admin.

---

### Q35. Can the same email be tailor and customer?

**Answer:** No. Email is unique on the User collection. Registration checks existing account and rejects if the role conflicts.

---

### Q36. How is the admin account created?

**Answer:** On server startup, `ensureAdminUser.js` reads config from `adminAccount.js` and creates the admin user in MongoDB if missing. Admin credentials are not shown on the public login UI.

---

## Section E — AI & Measurements (Q37–Q46)

### Q37. How does AI body measurement work step by step?

**Answer:**

1. Tailor uploads full-body photo to `POST /api/measurements/detect`  
2. Backend forwards image to Python `POST /api/measurements/detect`  
3. Image resized (max 1280px) for speed  
4. MediaPipe detects 33 body landmarks  
5. `image_validation.py` rejects selfies / incomplete body  
6. Pixel distances calculated (shoulder width, hip, sleeve, etc.)  
7. Height estimated and used as scale to convert to cm  
8. Laser overlay image generated  
9. Results returned to backend → saved in Measurement collection  

---

### Q38. What is MediaPipe?

**Answer:** MediaPipe is Google’s framework for perception tasks. We use **Pose** solution to detect body keypoints (shoulders, hips, knees, ankles, etc.) in a single image with `static_image_mode=True`.

---

### Q39. Why require a full-body photo?

**Answer:** Measurements need landmarks from head to feet. Face-only photos lack leg and torso points, producing wrong or impossible measurements. Validation enforces minimum body fill, ankle position, and leg proportions.

---

### Q40. What happens if the AI service is not running?

**Answer:** Backend catches connection errors and uses **fallback** in `measurementFallback.js`—estimates height from image aspect ratio and derives proportional measurements. Confidence is lower; laser scan is not generated. User message suggests running `start-ai.ps1`.

---

### Q41. What is measurement confidence? Is it 100% accurate medically?

**Answer:** Confidence is a **scan quality score** based on landmark visibility, body fill in frame, and feet position—not a medical accuracy certificate. Validated MediaPipe scans display **95–100%** to indicate a reliable scan. It should not be used as clinical body metrology.

---

### Q42. What measurements are calculated?

**Answer:** Height, chest, waist, shoulder, sleeve length, arm length, forearm, hips, inseam, thigh, neck, bicep—all in centimeters.

---

### Q43. What is the laser scan feature?

**Answer:** After measurement, `laser_overlay.py` draws a green laser-style line overlay on the body image for visual feedback. The PNG is saved and shown in the tailor app as “LASER SCAN” preview.

---

### Q44. What is OpenCV HOG fallback?

**Answer:** If MediaPipe is unavailable, OpenCV HOG people detector finds a person bounding box and estimates measurements proportionally from box height. Lower precision than pose landmarks; used only as backup.

---

### Q45. Where is height calibration implemented?

**Answer:** `ai-service/measurement_calibrate.py` — functions `estimate_height_cm` and `confidence_from_scan` blend fill ratio, torso segment, and shoulder width for plausible adult height (clamped roughly 140–198 cm).

---

### Q46. What is size recommendation?

**Answer:** After measurement, backend may call AI `POST /api/recommendations/size` with chest/waist/shoulder/sleeve/height to suggest garment size (e.g. M/L) and fit type for shirt/kurta/suit.

---

## Section F — Features & Workflows (Q47–Q54)

### Q47. Explain the order status workflow.

**Answer:**

```
placed → measurements_confirmed → cutting → stitching → fitting
       → quality_check → ready → delivered
```

Each status maps to a progress percentage (e.g. ready = 100%). Tailor advances status from Dashboard or Orders. Customer sees updates in My Orders and Notifications.

---

### Q48. How do payment receipts work?

**Answer:** When tailor submits order form: enters total amount, amount paid, payment status (pending/partial/paid), payment method (cash/UPI/card/bank). System generates `receiptNumber` (RCP-...). Customer views full receipt on order detail screen with balance due.

---

### Q49. How do notifications work for customers?

**Answer:** On status change, `notifyCustomerForOrder` finds User with role `customer` and matching email, creates Notification document, and emits Socket.io event. Customer Notifications tab lists alerts; “Ready” shows prominent message to collect cloth.

---

### Q50. What is the Design Canvas feature?

**Answer:** Tailor draws clothing sketch with finger on canvas. Strokes sent to `POST /api/canvas/analyze` for AI/heuristic analysis of garment type. Can save to database as a design linked to tailor. Designs appear in catalog with “sketch” label.

---

### Q51. How does “Pick image” work in Designs?

**Answer:** On Designs tab, tailor taps **Pick image** → gallery opens → selected image passed to Add Design screen → tailor enters title, category, price → uploads via `POST /api/designs` with multipart image.

---

### Q52. What can tailor see in Customer Records tab?

**Answer:** List of all shop customers with measurement count and order count. Search by name/phone/email. Detail screen shows contact info, full measurement history (expandable), laser images, and linked orders.

---

### Q53. What can customer NOT do?

**Answer:** Customer cannot: run AI measure, access other customers’ data, create tailor orders, view admin database, or update order status.

---

### Q54. What can admin do?

**Answer:** Admin can view aggregated stats and lists of users, customers, measurements, orders, designs via Database tab. Admin does not use tailor measurement or order management screens in normal flow.

---

## Section G — Code & Implementation (Q55–Q60)

### Q55. What is the entry point of the backend?

**Answer:** `backend/src/server.js` — loads environment, connects MongoDB, mounts routes, starts HTTP server with Socket.io, seeds admin user and sample designs if empty.

---

### Q56. Name important API endpoints.

**Answer:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/customer/register` | Customer register |
| POST | `/api/measurements/detect` | AI body scan |
| GET | `/api/customers/records` | Tailor customer list |
| POST | `/api/orders` | Create order |
| PATCH | `/api/orders/:id/status` | Update status |
| GET | `/api/orders/customer/my` | Customer orders |
| GET | `/api/admin/dashboard` | Admin stats |

---

### Q57. Which file calls the AI service?

**Answer:** `backend/src/services/aiClient.js` — function `detectMeasurements` posts multipart image to Python service with retry on multiple URLs (localhost, 127.0.0.1).

---

### Q58. Which file normalizes confidence to 95–100%?

**Answer:** `backend/src/utils/scanConfidence.js` — function `normalizeScanConfidence` (alias `displayScanConfidence`). Used in `measurements.js` before saving to database.

---

### Q59. How does the mobile app know API server address?

**Answer:** `mobile/src/config/api.js` — auto-detects from Expo debugger host (LAN IP for physical phone), or `10.0.2.2` for Android emulator, or `EXPO_PUBLIC_API_URL` environment variable.

---

### Q60. Where is role-based navigation handled?

**Answer:** `mobile/src/navigation/AppNavigator.js` — if `isAdmin` → AdminTabs; else if `isCustomer` → CustomerTabs; else → TailorTabs.

---

## Section H — Testing, Limitations, Future (Q61–Q65)

### Q61. How did you test the project?

**Answer:** Manual testing: tailor register/login, AI measure with full-body photos, order creation with payment, status updates, customer register with matching email, notification flow, admin database view. Tested on Expo Go with backend and AI service on local network.

---

### Q62. What are limitations of your project?

**Answer:**

- Requires backend and preferably AI service running locally or deployed  
- Customer–order link depends on correct email entry by tailor  
- Image storage is local disk, not cloud CDN  
- Measurement is estimated from 2D photo, not 3D body scan  
- Push notifications use in-app/Socket.io, not full FCM push in all cases  

---

### Q63. What improvements can be done in future?

**Answer:** Firebase push notifications, Razorpay/UPI payment integration, AWS S3 for images, 3D body scanning, multi-language UI, tailor analytics dashboard, SMS alerts, and offline-first mobile cache.

---

### Q64. How would you deploy for production?

**Answer:** Deploy Express API on cloud (Railway, Render, AWS), Python AI on GPU-capable server, MongoDB Atlas already cloud, set environment variables (JWT_SECRET, MONGODB_URI), use HTTPS, and build mobile app with EAS for Play Store.

---

### Q65. What was the hardest part of the project?

**Answer (sample honest answer):** Integrating three services (mobile, Node, Python AI) with reliable connectivity, email-based customer order matching, and tuning full-body photo validation so real photos are accepted while selfies are rejected.

---

## Quick Revision Checklist

Before viva, be able to explain:

- [ ] 3-tier architecture diagram  
- [ ] 3 roles and login difference  
- [ ] User vs Customer model  
- [ ] JWT + bcrypt flow  
- [ ] MediaPipe measurement pipeline  
- [ ] Order status stages  
- [ ] Email matching for customers  
- [ ] Admin files: `AdminScreen.js`, `admin.js`  
- [ ] Ports 5000 and 8000  
- [ ] One demo flow: measure → order → status → customer view  

---

## 30-Second Elevator Pitch

> “AI Tailor is a mobile tailoring platform with three roles. Tailors use AI and MediaPipe to scan full-body photos and save measurements to MongoDB Atlas. They manage orders and payment receipts. Customers register with the same email to track progress and get ready notifications. Admin monitors all data. We use React Native, Node.js Express, Python FastAPI, JWT security, and Socket.io for real-time updates.”

---

*Total: 65 questions with answers — AI Tailor Project Viva Preparation*
