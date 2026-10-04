# Atlas: 0.0.0.0/0 Active but still "IP not whitelisted"

That error often means **your network cannot reach MongoDB** (not always wrong IP).

## Path A — Use app NOW (local database)

In `backend/.env`:

```env
USE_IN_MEMORY_DB=true
```

```powershell
cd backend
npm run dev
```

Register/login **works**. Data is stored locally until you stop the server.  
(In-memory Mongo was already downloaded on your PC.)

---

## Path B — Fix Atlas (cloud)

### 1. Add your real public IP

```powershell
node scripts/get-public-ip.js
```

Atlas → **Network Access** → **ADD IP** → paste that IP → **Confirm**  
(Keep `0.0.0.0/0` too.)

### 2. Copy the EXACT connection string

Do **not** type the hostname by hand.

1. Atlas → **Database** → **Connect** (on Cluster0)  
2. **Drivers** → **Node.js** → copy full string  
3. Replace `<password>` with your DB password  
4. Add database name: `/ai_tailor` before `?`  

Example shape:

```text
mongodb+srv://shreezf9090_db_user:PASSWORD@cluster0.bxyza94.mongodb.net/ai_tailor?...
```

Paste into `backend/.env`:

```env
USE_IN_MEMORY_DB=false
MONGODB_URI=paste_full_string_here
```

### 3. Same Atlas project

Top-left project name must match the cluster.  
Network Access and cluster must be in **one** project.

### 4. Network tests

| Test | Action |
|------|--------|
| VPN | Turn **off** |
| Hotspot | Try phone internet |
| Firewall | Allow **Node.js** outbound |
| Compass | Install [MongoDB Compass](https://www.mongodb.com/products/compass), paste same URI — if Compass fails, Node will too |

### 5. Reset DB password

Database Access → `shreezf9090_db_user` → **Edit Password** → simple password (letters+numbers only) → update `.env`

### 6. Test

```powershell
node scripts/check-atlas.js
```

---

## Why `10.208.236.105` did not help

That is a **private** IP. Atlas needs your **public** IP (from `get-public-ip.js`) or `0.0.0.0/0` **plus** a network that allows outbound port **27017**.
