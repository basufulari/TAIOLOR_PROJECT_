# MongoDB Atlas + Tailor-only app

## Atlas setup

1. [cloud.mongodb.com](https://cloud.mongodb.com) → create **M0** cluster
2. **Database Access** → user + password
3. **Network Access** → `0.0.0.0/0` (dev) or your IP
4. **Connect** → Drivers → Node.js → copy URI with `/ai_tailor` database name

## backend/.env

```env
USE_IN_MEMORY_DB=false
MONGODB_URI=mongodb+srv://USER:PASS@cluster....mongodb.net/ai_tailor?retryWrites=true&w=majority
```

## Start

```powershell
cd backend
npm start
```

Health: http://localhost:5000/health → `"mongodb":"connected"`

## App mode

- **Register** → tailor shop only (saved to Atlas)
- **Login** → tailor accounts only
- **Demo** → `demo.tailor@aitailor.com` / `demo123`
- Customers are **shop clients** (name/phone) saved under `customers` + `measurements` collections — not app login users

## What saves to Atlas

| Feature | Collection |
|---------|------------|
| Tailor accounts | `users` |
| Shop customers | `customers` |
| AI measurements | `measurements` |
| Orders | `orders` |
| Designs & canvas | `designs` |
| Notifications | `notifications` |
