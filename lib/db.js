import pkg from "pg"
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

let expensesTableEnsured = false

export async function query(text, params) {
  const result = await pool.query(text, params)
  return result.rows
}

export async function ensureExpensesTable() {
  if (expensesTableEnsured) return

  await pool.query(`
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
  `)

  expensesTableEnsured = true
}