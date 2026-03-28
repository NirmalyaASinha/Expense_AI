# ExpenseAI

ExpenseAI is a minimal Next.js 14 (App Router) app for analyzing expense text with Cloudflare Workers AI and storing sessions in Neon PostgreSQL.

## Stack

- Next.js 14 (JavaScript)
- Plain CSS
- Neon PostgreSQL via `pg`
- Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`)

## Features

- Landing page (`/`)
- Analyze page (`/analyze`) to paste/upload expense data
- Dashboard page (`/dashboard?session=...`) with metrics and table
- History page (`/history`) of analyzed sessions

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Fill `.env.local` values:

- `DATABASE_URL`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

4. Start dev server:

```bash
npm run dev
```

## Neon SQL

Run this in your Neon SQL editor:

```sql
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  session_label TEXT NOT NULL,
  category TEXT,
  vendor TEXT,
  amount NUMERIC,
  month INTEGER,
  year INTEGER,
  is_unusual BOOLEAN DEFAULT FALSE,
  suggestion TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Notes

- `.env.local` is gitignored and should never be committed.
- If Neon is unreachable from your network, analysis may still display local fallback results in dashboard for the active browser session.
