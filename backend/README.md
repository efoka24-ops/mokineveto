# MokineVeto — Backend (API)

Express + TypeScript (exécuté via `tsx`). Déployé sur **Railway**
(`https://mokineveto-production.up.railway.app`).

## Démarrage local
```bash
cd backend
npm install
cp .env.example .env   # renseigner SMTP_PASS + clés Camoo
npm run dev            # http://localhost:8000
```

## Routes
| Méthode | Route | Description |
|---|---|---|
| GET | `/health` | Santé + vérification SMTP |
| POST | `/auth/request-otp` | `{ email }` ou `{ phone }` → envoie un OTP (e-mail) |
| POST | `/auth/verify-otp` | `{ identifier, code }` → `tempToken` |
| POST | `/payments/cashout` | Initie un cashout Camoo |
| GET | `/payments/verify?id=` | Vérifie une transaction |
| GET | `/payments/account` | Solde du compte marchand |
| GET | `/payments/webhook` | Notification Camoo signée (HMAC-SHA256, param `sig`) |

## Variables d'environnement
Voir `.env.example`. Sur Railway, définir les mêmes variables dans
**Settings → Variables** (notamment `SMTP_PASS`, `CAMOO_API_KEY`, `CAMOO_API_SECRET`).

## Notes
- Store OTP en mémoire (migrer vers Redis en production).
- À venir : JWT (access/refresh), persistance (Prisma), idempotence webhook, rate-limiting.
