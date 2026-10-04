# Why you don't see tables in MongoDB Atlas

MongoDB uses **collections** (not SQL "tables"). They only appear **after**:

1. Backend connects to Atlas successfully  
2. Someone **registers** in the app (creates first document)

If the backend shows **IP isn't whitelisted**, nothing is saved to Atlas — the `ai_tailor` database will be empty or missing.

---

## Step 1 — Allow your IP (required)

1. [cloud.mongodb.com](https://cloud.mongodb.com)  
2. Your project → **Network Access** (left sidebar)  
3. **+ ADD IP ADDRESS**  
4. **ALLOW ACCESS FROM ANYWHERE** → `0.0.0.0/0`  
5. Status must be **Active** (green)  
6. Wait 1–2 minutes

---

## Step 2 — Verify connection

```powershell
cd "h:\New folder (3)\backend"
node scripts/check-atlas.js
```

You should see: `✓ Connected` and database `ai_tailor`.

---

## Step 3 — Start backend

```powershell
npm run dev
```

Must see:

```text
MongoDB connected → ai_tailor @ cluster0...
```

Not: `IP isn't whitelisted` or `in-memory`.

---

## Step 4 — Register in the app

Use a **new email** (e.g. `mytest@gmail.com`) in the mobile app.

---

## Step 5 — View data in Atlas

1. Atlas → **Database** (or **Data Services** → **Browse Collections**)  
2. Click your cluster → **Browse Collections**  
3. Open database: **`ai_tailor`** (not only `sample_mflix` or `admin`)  
4. Collection: **`users`** ← registration data is here  

Other collections appear when you use features:

| Collection | When created |
|------------|----------------|
| `users` | Register / login |
| `measurements` | AI body scan |
| `orders` | Place order |
| `designs` | Tailor uploads design |
| `notifications` | Order updates |

---

## Still empty?

| Problem | Solution |
|---------|----------|
| Only see `sample_mflix` | Switch database dropdown to **`ai_tailor`** |
| Backend IP error | Repeat Step 1 |
| Registered before IP fix | Register again with new email |
| App says "Cannot reach server" | Run `npm run dev` in `backend` folder |
