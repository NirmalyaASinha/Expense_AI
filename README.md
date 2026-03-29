<div align="center">

# ExpenseAI
**Track. Detect. Optimize.**
*An autonomous financial auditor powered by Edge AI.*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Cloudflare Workers AI](https://img.shields.io/badge/Cloudflare-Workers_AI-F38020?style=for-the-badge&logo=cloudflare)](https://developers.cloudflare.com/workers-ai/)
[![Neon Postgres](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?style=for-the-badge&logo=postgresql)](https://neon.tech/)

</div>

---

## 🚀 Overview

Finance teams spend countless hours reviewing expenses, invoices, and subscriptions. Spotting unusual or unnecessary spending manually is slow, tedious, and prone to human error. 

**ExpenseAI** is a minimalist, intelligent agent designed to solve this. It ingests raw expense data, instantly categorizes spending patterns, detects unusual transaction spikes, and suggests actionable areas for cost reduction—all through a clean, conversational interface.

## ✨ Key Features

* **🎙️ Conversational Interface (`/analyze`):** A minimalist, ChatGPT-style input where you can simply paste raw expense data for instant analysis.
* **🧠 Edge AI Auditing:** Leverages Cloudflare Workers AI (`Llama-3.3-70b`) to intelligently parse messy text into structured financial data.
* **🚨 Anomaly Detection:** Automatically flags transactions that are abnormally high or out-of-character for their specific category.
* **📊 Dynamic Dashboard (`/dashboard`):** Generates actionable metrics, spending tables, and cost-reduction suggestions based on the AI's findings.
* **🗄️ Historical Ledger (`/history`):** Seamlessly look up past audits and track company spending across different sessions.

---

## 🏗️ System Architecture & Data Flow

ExpenseAI is built on a modern serverless edge architecture, designed for rapid ingestion and zero cold-start AI inference.

### The Flow

1. **User Input (Client Edge):** The user navigates to `/analyze` and either types natural language or uploads an `.xlsx`/`.csv` file. 
   *If a file is uploaded, the browser strictly parses it client-side into raw text to save bandwidth and server processing.*
2. **API Ingestion (Next.js Edge Route):** The raw text and session metadata are sent to the Next.js API route (`/api/analyze`), which is deployed on the Cloudflare Edge network for minimal latency.
3. **AI Inference (Cloudflare Workers AI):** The Edge API passes the text and a strict system prompt to the `Llama-3.3-70b-instruct` model. The model acts as the auditor, categorizing transactions, flagging anomalies, and returning a structured JSON array.
4. **Data Persistence (Neon Postgres):** Upon receiving the JSON from the AI, the Edge API connects to Neon Serverless PostgreSQL (via the `pg` driver/Cloudflare Hyperdrive) and bulk-inserts the audited records.
5. **Visualization (Client & Recharts):** The user is redirected to `/dashboard?session=[label]`. The dashboard queries the Neon database and renders the aggregated insights, Recharts graphics, and AI suggestions.

---

## 🛠️ Tech Stack

* **Frontend & Framework:** Next.js 14 (App Router), Vanilla CSS / DaisyUI for a lightweight, custom design system.
* **AI Engine:** Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`).
* **Database:** Neon Serverless PostgreSQL.
* **Authentication:** Auth.js v5 (Edge-compatible JWT strategy).

---

## 🚦 Getting Started

### 1. Clone & Install
```bash
git clone [https://github.com/yourusername/expense-ai.git](https://github.com/yourusername/expense-ai.git)
cd expense-ai
npm install
```
### 2. Environment Configuration

 Create your local environment file:
```cp .env.example .env.local```
Fill in .env.local with your specific credentials:
```
DATABASE_URL="postgres://user:password@your-neon-hostname.neon.tech/neondb?sslmode=require"
CLOUDFLARE_ACCOUNT_ID="your_account_id"
CLOUDFLARE_API_TOKEN="your_api_token"
```

### 3. Database Setup (Neon)

 Run the following SQL script in your Neon console to initialize the required schema:
  SQL
```
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
### 4. Run the Development Server
```
npm run dev
```
Navigate to http://localhost:3000 to start using the app.
