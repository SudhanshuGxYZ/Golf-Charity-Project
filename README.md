# ⛳ GolfCharity Platform

> A subscription-driven golf platform combining Stableford score tracking, monthly prize draws, and charitable giving.

---

## 🗂 Project Structure

```
golf-charity-platform/
├── backend/          # Express.js + Supabase + Stripe API
│   ├── src/
│   │   ├── routes/       # auth, scores, draws, subscriptions, charities, admin, webhooks
│   │   ├── services/     # drawEngine.js, email.js
│   │   ├── middleware/   # auth.js (JWT + role guards)
│   │   └── utils/        # supabase.js client
│   ├── schema.sql         # Full Supabase DB schema
│   └── vercel.json
└── frontend/         # React 18 + Vite + Tailwind CSS
    ├── src/
    │   ├── pages/         # HomePage, Dashboard, Admin, Draws, Charities, Auth, Pricing
    │   ├── components/    # Navbar, Footer, route guards
    │   ├── store/         # Zustand auth store
    │   └── utils/         # axios api client (with JWT refresh)
    └── vercel.json
```

---

## ⚡ Quick Start (Local Development)

### 1. Supabase Setup
1. Create a **new** Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire `backend/schema.sql` file
3. Note your **Project URL** and **service_role** key (Settings → API)

### 2. Stripe Setup
1. Create/use a Stripe account in **test mode**
2. Create two recurring **Products + Prices**:
   - Monthly: £29.99/month → note the Price ID
   - Yearly: £299.99/year → note the Price ID
3. Set up a **Webhook** endpoint pointing to `your-backend-url/api/webhooks/stripe` with these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`

### 3. Backend

```bash
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev
```

### 4. Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL and VITE_STRIPE_PUBLISHABLE_KEY
npm install
npm run dev
```

---

## 🚀 Deployment to Vercel

### Backend Deployment

```bash
cd backend
npm install -g vercel  # if not installed
vercel login
vercel --prod
```

In the Vercel dashboard for the backend project, add all environment variables from `.env.example`.

### Frontend Deployment

```bash
cd frontend
vercel --prod
```

Add `VITE_API_URL` (pointing to your deployed backend URL) and `VITE_STRIPE_PUBLISHABLE_KEY`.

> ⚠️ Use a **new Vercel account** as required. Do not use an existing personal account.

---

## 🔑 Default Admin Account

After running `schema.sql`, an admin user is seeded:

| Field    | Value                      |
|----------|---------------------------|
| Email    | `admin@golfcharity.com`   |
| Password | `Admin@1234`              |

**Change this password immediately after first login.**

---

## 🧪 Test Checklist

- [ ] User registration & login
- [ ] Subscription flow — Stripe checkout (monthly and yearly)
- [ ] Score entry — rolling 5-score logic
- [ ] Score edit and delete
- [ ] Draw creation, simulation, execution (admin)
- [ ] Charity browse, select, donate
- [ ] Winner proof upload
- [ ] Admin: user management (suspend/restore)
- [ ] Admin: winner verification (approve/reject/mark paid)
- [ ] Admin: charity creation
- [ ] Dashboard all tabs: Overview, Scores, Winnings, Charity, Account
- [ ] Stripe webhook: subscription lifecycle events
- [ ] JWT token refresh flow
- [ ] Mobile responsive on all pages

---

## 🏗 Architecture Decisions

| Concern | Decision | Reason |
|---|---|---|
| Auth | JWT (access + refresh token rotation) | Stateless, scalable |
| DB | Supabase (Postgres) | Realtime-ready, easy to migrate |
| Payments | Stripe Checkout + Billing Portal | PCI compliant, minimal implementation risk |
| State | Zustand | Lightweight, no boilerplate |
| Styling | Tailwind CSS + custom design system | Fast iteration, consistent tokens |
| Draw Engine | Pluggable: random or algorithmic | Extensible for future methods |
| Prize calculation | Auto-calculated from active subscriber count | Transparent, auditable |

---

## 🔮 Scalability Notes

- **Multi-country**: Add a `country` field to `users` + currency logic in Stripe checkout
- **Teams/Corporate**: Extend subscriptions table with `team_id` FK + team management routes
- **Mobile App**: API is fully REST — React Native frontend can consume identical endpoints
- **Campaign Module**: Add a `campaigns` table with `start_date`, `end_date`, `bonus_pool` fields

---

## 📧 Email Notifications

Configured via Nodemailer (SMTP). Templates live in `backend/src/services/email.js`:
- Welcome email (on registration)
- Draw result notification (winner + non-winner)
- Payout confirmation

For production, replace SMTP config with a transactional provider like **Resend** or **SendGrid**.
