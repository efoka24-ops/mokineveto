# 🚀 MokineVeto Backend — Phase 1 Setup Guide

## ✅ Completed

- [x] Prisma schema (20+ models)
- [x] JWT auth with bcryptjs
- [x] Auth routes (signup/login/me/update-profile)
- [x] Vets routes (list/detail/availability/admin verify)
- [x] Middleware (JWT auth + role guards)
- [x] Seed script with demo data
- [x] TypeScript compilation
- [x] Database configuration

## 🔧 Next Steps: Database Setup

### Step 1: Provision PostgreSQL on Railway

1. Go to https://railway.app/dashboard
2. Open your **mokineveto-production** project
3. Click "+ Add Service"
4. Select **PostgreSQL**
5. Wait for it to deploy (~1-2 min)
6. Click on the PostgreSQL service card
7. Go to "Connect" tab
8. Copy the **DATABASE_URL** (starts with `postgresql://`)

### Step 2: Update .env

```bash
# In backend/.env, replace:
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

### Step 3: Initialize Database

```bash
cd backend

# Create tables from schema
npm run db:push

# Populate with seed data (demo users, vets, animals, fiches, etc.)
npm run db:seed

# (Optional) Open Prisma Studio to inspect data
npm run db:studio
```

### Step 4: Start Backend Dev Server

```bash
cd backend
npm run dev

# Server listens on http://localhost:8000
# Test: curl http://localhost:8000/health
```

## 📱 Expected Demo Data (from seed)

**ADMIN User:**
- Email: admin@mokineveto.cm
- Password: admin123456

**ELEVEUR User:**
- Email: herve@mokineveto.cm
- Password: eleveur123456

**6 VETERINAIRE Users:**
- moustapha@mokineveto.cm (Médecine bovine)
- oliviaturner@mokineveto.cm (Aviculture)
- alexander@mokineveto.cm (Petits ruminants)
- sophia@mokineveto.cm (Reproduction)
- michael@mokineveto.cm (Pathologie porcine)
- ngane@mokineveto.cm (Santé du troupeau)
- Password: vet123456

**3 Demo Animals:**
- Bella (Bovins, femelle)
- Taurus (Bovins, mâle)
- Reine (Caprins, femelle)

**6 Demo Fiches Techniques:**
- Fièvre aphteuse
- Theilériose
- Pasteurellose
- Brucellose
- Charbon symptomatique
- Maladie de Newcastle

## 🔐 API Endpoints (Phase 1)

### Authentication
- `POST /auth/signup` — Register new user
- `POST /auth/login` — Login with email/phone + password
- `GET /auth/me` — Get current user (requires JWT)
- `PATCH /auth/me` — Update profile (requires JWT)

### Vétérinaires (Public)
- `GET /vets` — List all approved vets
- `GET /vets/:id` — Get vet details
- `GET /vets/:id/availability?date=YYYY-MM-DD` — Get available slots
- `GET /vets/specialties` — List all specialties

### Vétérinaires (ADMIN Only)
- `GET /vets/admin/pending` — List pending vet verifications
- `PATCH /vets/:id/verify` — Approve/reject vet

## 🚢 Deploy to Railway

Once everything works locally:

```bash
# Push to your main branch
git add .
git commit -m "feat: Phase 1 backend foundation"
git push origin main

# Railway will auto-deploy from main branch
# Check: https://railway.app/dashboard/mokineveto-production
```

---

**Next Phase:** Mobile wiring (connect React Native app to backend)
