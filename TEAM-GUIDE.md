# AI Tailor — Team Guide (Easy Overview)

**Purpose:** Help every team member understand who uses the app, how login works, and what each role can do — without confusion.

**Project folder:** `h:\New folder (3)`

---

## 1. What is AI Tailor?

**AI Tailor** is a smart tailoring mobile app for tailoring shops. It helps:

| Who | What they do |
|-----|----------------|
| **Tailor** | Measure customers with AI, save customer data, manage orders, track stitching progress |
| **Customer** | Track their order progress and view payment receipts on the phone |
| **Admin** | View all data stored in the cloud database (MongoDB Atlas) |

The app talks to:

- **Backend API** (Node.js) — port **5000** — saves users, customers, measurements, orders
- **AI Service** (Python) — port **8000** — reads full-body photos and calculates body measurements
- **MongoDB Atlas** — cloud database where all shop data is stored

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Mobile App  │────▶│  Backend    │────▶│  MongoDB    │
│ (Expo App)  │     │  Port 5000  │     │  Atlas      │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │ AI Service  │
                    │ Port 8000   │
                    └─────────────┘
```

---

## 2. Three user roles

| Role | Who is it? | How to get an account |
|------|------------|------------------------|
| **Tailor** | Shop owner / staff | Register on login screen → **Register tailor shop** |
| **Customer** | Person who orders clothes | Register on login screen → **Customer** tab → **Register as customer** |
| **Admin** | System owner | Pre-created in database (not shown on login screen) |

**Important:** Tailor and Customer use the **same mobile app**, but see **different screens** after login. You must select the correct role on the login screen.

---

## 3. How to log in

### Login screen — two tabs

| Tab | Used by |
|-----|---------|
| **Tailor** | Shop staff |
| **Customer** | End customers who want to track orders |

If you use the wrong tab, login will fail.

**Examples:**

- Customer account + Tailor tab → error: *“Customer account. Switch to Customer login.”*
- Tailor account + Customer tab → error: *“Not a customer account.”*

---

### A) Tailor login

1. Open the app.
2. Stay on the **Tailor** tab (left side of login form).
3. Enter **email** and **password**.
4. Tap **Sign in as tailor**.
5. You will see tabs: **Dashboard**, **AI Measure**, **Customers**, **Designs**, **Orders**, **Profile**.

**New tailor registration:**

1. On login screen (Tailor tab) → tap **Register tailor shop**.
2. Fill: shop name, email, phone, address, password (min 6 characters).
3. Account is saved to **MongoDB Atlas**.

---

### B) Customer login

1. Open the app.
2. Tap the **Customer** tab on the login screen.
3. Enter **email** and **password**.
4. Tap **Sign in as customer**.
5. You will see tabs: **My Orders**, **Notifications**, **Profile**.

**New customer registration:**

1. Customer tab → tap **Register as customer**.
2. Use the **same email** the tailor saved when measuring or placing an order.
3. After register, linked orders appear automatically (if email matches).

---

### C) Admin login

1. Use the **Tailor** tab on login (admin is not a separate tab).
2. Login with the admin email and password configured in the backend.
3. After login you see: **Database** tab + **Profile** (not tailor shop screens).

Admin credentials are set in the server configuration — they are **not displayed** on the login screen for security.

---

## 4. Important rules (read this carefully)

### Rule 1 — Customer email must match tailor records

```
Tailor saves customer email  →  Customer registers with SAME email  →  Orders & receipts appear
```

| Situation | Result |
|-----------|--------|
| Emails match | Customer sees orders and notifications |
| Emails do not match | Customer sees “No orders found” |

**Example:**

- Tailor saves customer as `rahul@gmail.com`
- Customer registers with `rahul@gmail.com` → works
- Customer registers with `rahul@yahoo.com` → no orders linked

**Best practice:** Tailor always enters customer **email** on the **AI Measure** screen before scanning.

---

### Rule 2 — One email = one account type

- The same email cannot be both a **tailor** and a **customer**.
- If an email is already registered as tailor, customer registration will be rejected (and vice versa).

---

### Rule 3 — Services must be running

| Service | Port | What happens if off |
|---------|------|---------------------|
| **Backend** | 5000 | App cannot save or load data |
| **AI Service** | 8000 | Body scan uses basic estimate (no full laser scan) |
| **Mobile (Expo)** | 8081 | App UI does not load |

**Start everything (Windows):**

```powershell
# Terminal 1 — AI
.\start-ai.ps1

# Terminal 2 — Backend
cd backend
npm start

# Terminal 3 — Mobile app
cd mobile
npm run start
```

Then scan the QR code with **Expo Go** on your phone (same Wi‑Fi as PC).

---

### Rule 4 — All shop data is in the cloud

Customer details, measurements, orders, and payment receipts are stored in **MongoDB Atlas**, not only on the phone. Any tailor device logged into the same account sees the same data after sync.

---

## 5. Tailor features (full list)

| Tab / Screen | What the tailor can do |
|--------------|------------------------|
| **Dashboard** | View order stats (total, active, ready); advance order status; shortcut to customer records |
| **AI Measure** | Full-body photo scan → AI measurements (chest, waist, height, etc.); save customer name, phone, **email**, address |
| **Customers** | List all customers; search by name/phone/email; open full profile with all measurement history |
| **Designs** | Browse design catalog; **Pick image** (upload from gallery); **Canvas** (draw sketch with finger) |
| **Orders** | List all shop orders; create new order; open order details |
| **Profile** | View account info; sign out |

### Typical tailor daily workflow

```
Step 1: AI Measure
   → Enter customer name, phone, EMAIL, address
   → Take full-body photo (head to feet)
   → AI saves measurements to database

Step 2: Create order (from Designs or Orders → New)
   → Select customer
   → Choose garment type, fabric, notes
   → Enter payment: total, amount paid, method
   → Submit → payment receipt issued

Step 3: Update order progress (Dashboard or Orders)
   → placed → cutting → stitching → fitting → quality check → ready → delivered
   → Customer gets notification at each step
```

### Order status stages (customer sees these)

| Status | Meaning | Progress |
|--------|---------|----------|
| Placed | Order created | 5% |
| Measurements OK | Measurements confirmed | 15% |
| Cutting | Fabric being cut | 30% |
| Stitching | Stitching in progress | 55% |
| Fitting | Fitting stage | 75% |
| Quality check | Final check | 90% |
| **Ready** | **Cloth ready for pickup** | **100%** |
| Delivered | Completed | 100% |

---

## 6. Customer features (full list)

| Tab | What the customer can do |
|-----|--------------------------|
| **My Orders** | See all orders linked to their email; progress bar; payment receipt preview |
| **Notifications** | Alerts when tailor updates status; special alert when cloth is **Ready** |
| **Profile** | View name and email; reminder about email matching |

### Customer order detail screen shows

- Payment receipt (receipt number, total, paid, balance, payment method)
- Garment type and fabric details
- Tailor shop name
- Production stages with checkmarks
- Full status history with dates and times

### What customers CANNOT do

- Cannot run AI body scan for others
- Cannot create tailor shop orders
- Cannot see other customers’ data
- Cannot access tailor dashboard or customer list

---

## 7. Admin features

| Screen | What admin can do |
|--------|-------------------|
| **Database** | View total counts and lists: users, tailors, customers, measurements, orders, designs |
| **Profile** | Account information; sign out |

Admin is for **system monitoring** — not for day-to-day tailoring work.

---

## 8. Payment receipt flow

When the tailor **submits an order form**:

1. Enters **total amount (₹)**
2. Enters **amount paid now** (can be 0 if paying later)
3. Selects **payment status**: Pending / Partial / Paid
4. Selects **payment method**: Cash, UPI, Card, Bank, Other
5. System generates a **receipt number** (e.g. `RCP-XXXXXX`)
6. Customer sees the full receipt in **My Orders** → tap order → **Payment receipt** section

---

## 9. AI body measurement (simple explanation)

| Step | What happens |
|------|----------------|
| 1 | Customer stands for a **full-body, front-facing** photo (head to feet visible) |
| 2 | Photo is sent to the AI service |
| 3 | AI detects body pose and calculates measurements in **cm** |
| 4 | Optional **laser scan** overlay image is generated |
| 5 | Results are saved to MongoDB linked to that customer |
| 6 | App shows **95–100% confidence** on successful scan |

**Photos that are rejected:**

- Face-only selfies
- Cropped body (feet not visible)
- Very poor lighting or person not visible

**Tips for best results:**

- Stand 2–3 meters from camera
- Arms slightly away from body
- Plain background, good lighting

---

## 10. Notifications

| Event | Tailor gets alert? | Customer gets alert? |
|-------|:------------------:|:------------------:|
| New order created | Yes | Yes (if registered + email matches) |
| Status updated (cutting, stitching, etc.) | Yes | Yes |
| Order **Ready** | Yes | Yes — “Cloth is ready!” |
| Order delivered | Yes | Yes |

**Customer must:**

1. Register on the app (Customer tab)
2. Use the **same email** the tailor saved

---

## 11. Quick reference — who can do what?

| Task | Tailor | Customer | Admin |
|------|:------:|:--------:|:-----:|
| Register new account | Yes | Yes | No (pre-made) |
| AI body scan | Yes | No | No |
| Save / view customer records | Yes | No | No |
| Create and update orders | Yes | No | No |
| Upload design images / canvas sketch | Yes | No | No |
| Track own order progress | No | Yes | No |
| View payment receipt | Yes | Yes | No |
| Receive ready notifications | Yes | Yes | No |
| View entire database (all users) | No | No | Yes |

---

## 12. Common problems and answers

| Problem | Solution |
|---------|----------|
| Customer logged in but **no orders** | Customer email must match tailor’s saved email. Update email in AI Measure or re-register with correct email. |
| **Login failed** | Check Tailor vs Customer tab; verify password; check internet and backend running. |
| **AI measurement failed** | Start AI service: `.\start-ai.ps1`. Use full-body photo. |
| Low confidence (old scans) | Restart backend + AI; scan again — new scans show 95–100%. |
| Admin sees tailor screens | Admin should only see **Database** tab — wrong account type. |
| App cannot connect | Backend must run on port 5000; phone and PC on same Wi‑Fi; check `mobile` API URL. |
| Port 5000 already in use | Stop other backend process or change port in `.env`. |

---

## 13. One-line summary per role

| Role | Summary |
|------|---------|
| **Tailor** | Runs the shop — AI measure, save customers, manage orders, update progress, payment receipts. |
| **Customer** | Tracks **their** orders and receipts; must use **same email** as tailor records. |
| **Admin** | Monitors **all** system data from the Database screen. |

---

## 14. Related documents in this project

| File | Contents |
|------|----------|
| `TEAM-GUIDE.md` | This file — easy overview for team members |
| `PROJECT-STUDY-GUIDE.md` | Technical details, APIs, tech stack (for developers / exams) |
| `README.md` | Setup and installation |
| `RUN-ALL.md` | How to run all services |
| `backend/ATLAS-SETUP.md` | MongoDB Atlas connection setup |

---

## 15. Tech stack (short, for developers)

| Layer | Technology |
|-------|------------|
| Mobile app | React Native, Expo, React Navigation |
| Backend | Node.js, Express, JWT, Socket.io, Mongoose |
| Database | MongoDB Atlas |
| AI | Python, FastAPI, MediaPipe, OpenCV |

---

*Last updated for AI Tailor project — share this file with new team members before demo or training.*
