# Moneta — API

Express + MongoDB REST API for **Moneta**, a personal expense tracker. Every
response is computed from stored transactions — no mocked or hard-coded figures.

Live: <https://moneta-api-azure-ten.vercel.app> · Health: [`/api/health`](https://moneta-api-azure-ten.vercel.app/api/health)
Frontend: <https://moneta-web-five.vercel.app>

## Stack

Node 20+ · Express 4.21 · MongoDB Atlas (M0) · Mongoose 8.9 · Zod · Jest + Supertest

## Security model

- **JWT sessions.** Tokens signed with `sub`/issuer `moneta-api`, 7-day expiry.
  Delivered as an `httpOnly` cookie (`Secure; SameSite=None` in production) with
  an `Authorization: Bearer` fallback for non-browser clients.
- **Per-user isolation.** Every query is scoped to the authenticated user's `_id`;
  no route reads another user's documents. Cross-user access is covered by tests.
- **bcrypt**, 12 rounds. Passwords are never returned by any endpoint.
- **Validation** with Zod → `422` plus per-field errors; centralised error
  middleware so controllers only throw.
- **Hardening.** `helmet`, `x-powered-by` disabled, an explicit CORS origin
  allowlist with `credentials: true` (never `*`), a `mongoSanitize` middleware
  that strips `$`/`.` keys, `1mb` body limits, and rate limiting
  (auth 20/15 min, API 1000/15 min).
- **Uploads** are owner-gated, type- and size-checked (2 MB), and served as
  downloads rather than rendered inline.

## Getting started

```bash
cp .env.example .env      # then fill in MONGODB_URI and JWT_SECRET
npm install
npm run dev               # http://localhost:5000
```

`JWT_SECRET`: generate one with
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
`CLIENT_ORIGINS` is a comma-separated allowlist — the frontend origin must be
listed there or browsers will block credentialed calls.

## Tests

```bash
npm test                  # 16 suites, 29 tests
```

Runs against an in-memory MongoDB (`mongodb-memory-server`), so no local
database or live Atlas key is required. Covers auth and session handling,
cross-user data isolation, transaction CRUD and filters, CSV export, budget
thresholds, goal progress, and recurring-rule catch-up.

## API reference

Base URL: `/api`. All routes except health and auth entry points require an
authenticated session cookie or `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
| --- | --- | :---: | --- |
| `GET` | `/health` | No | Service and database health |
| `POST` | `/auth/register` | No | Create a user, seed defaults, set session cookie |
| `POST` | `/auth/login` | No | Sign in and set session cookie |
| `POST` | `/auth/logout` | No | Clear the session cookie |
| `GET` | `/auth/me` | Yes | Current authenticated user |
| `PATCH` | `/auth/profile` | Yes | Update name and currency |
| `GET` | `/accounts` | Yes | Accounts with computed balances and summary |
| `POST` | `/accounts` | Yes | Create an account |
| `PATCH` | `/accounts/:id` | Yes | Update or archive an account |
| `DELETE` | `/accounts/:id` | Yes | Delete an unused account |
| `GET` | `/categories` | Yes | Default and custom categories |
| `POST` | `/categories` | Yes | Create a custom category |
| `PATCH` | `/categories/:id` | Yes | Update or archive a category |
| `DELETE` | `/categories/:id` | Yes | Delete an unused category |
| `GET` | `/transactions` | Yes | Paginated, filtered, searchable history + summary |
| `POST` | `/transactions` | Yes | Create a transaction (JSON or multipart with attachment) |
| `GET` | `/transactions/:id` | Yes | Fetch one transaction |
| `PATCH` | `/transactions/:id` | Yes | Update a transaction |
| `DELETE` | `/transactions/:id` | Yes | Delete a transaction |
| `GET` | `/transactions/export.csv` | Yes | Export filtered transactions as CSV |
| `GET` | `/transactions/:id/attachment` | Yes | Owner-only attachment download |
| `GET` | `/dashboard?month=YYYY-MM` | Yes | Balance, month totals, budget, recent activity, sparkline |
| `GET` | `/analytics?range=week\|month\|3months\|year` | Yes | Summary, comparison, trend and category breakdown |
| `GET` | `/budgets?month=YYYY-MM` | Yes | Overall and category budget progress |
| `PUT` | `/budgets` | Yes | Create or update a budget |
| `DELETE` | `/budgets/:id` | Yes | Delete a budget |
| `GET` | `/goals` | Yes | Savings goals with computed progress |
| `POST` | `/goals` | Yes | Create a goal |
| `PATCH` | `/goals/:id` | Yes | Update a goal or add a contribution |
| `DELETE` | `/goals/:id` | Yes | Delete a goal |
| `GET` | `/recurring` | Yes | Recurring rules |
| `POST` | `/recurring` | Yes | Create a repeating transaction rule |
| `PATCH` | `/recurring/:id` | Yes | Update or pause a rule |
| `DELETE` | `/recurring/:id` | Yes | Delete a rule |

**Response conventions**

- Collections: `{ "items": [...], "pagination": {...}, "summary": {...} }` where relevant.
- Singles: `{ "transaction": {...} }`, `{ "account": {...} }`, and so on.
- Auth: `{ "user": {...}, "token": "..." }` plus a secure cookie.
- Errors: `{ "message": "...", "errors": [{ "path": "amount", "message": "..." }] }`.

**CSV export** emits `Date,Type,Category,Account,Amount,Note` with a UTF-8 BOM
and CRLF line endings, and prefixes cell-leading `= + - @ TAB CR` with an
apostrophe so a spreadsheet cannot execute an injected formula.

All dates are stored and aggregated as **UTC calendar dates** so reports stay
consistent across time zones. Money is rounded server-side before being returned.

## Domain rules

- **Budgets** report `on_track` / `watch` / `warning` / `critical` / `exceeded`
  at the 50 / 75 / 90 / 100 % thresholds.
- **Recurring rules** support daily, weekly, monthly and yearly cadence and
  back-fill every missed occurrence. Catch-up runs (throttled) whenever a user
  loads the dashboard, transactions or recurring screens, and a long-lived
  server additionally sweeps hourly from boot — so the feature stays correct on
  serverless hosting, where no scheduler is available.
- **Accounts** are one of cash, bank, credit, wallet or savings; balances are
  derived from transactions, never stored as a running field.

## Project layout (MVC)

```
src/
  config/      env parsing, database connection
  models/      Mongoose schemas
  controllers/ request handling only
  services/    business rules, aggregation pipelines
  middleware/  auth, validate, error, rate limit, mongoSanitize
  routes/      resource routers
  utils/       ApiError, csv, dates
api/           Vercel serverless entrypoint
tests/         Jest + Supertest suites
```

## Deployment

Deployed to Vercel as a single serverless function: `api/[...path].js` mounts
the Express app and reuses the MongoDB connection across warm invocations, and
`vercel.json` routes every path to it. Credentials live only in the platform's
encrypted environment settings — never in the repository.
