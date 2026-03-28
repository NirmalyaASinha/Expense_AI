import { ensureExpensesTable, query } from "../../../lib/db"

export async function GET() {
  try {
    await ensureExpensesTable()

    const rows = await query(`
      SELECT 
        session_label,
        COUNT(*) as expense_count,
        SUM(amount) as total,
        SUM(CASE WHEN is_unusual THEN 1 ELSE 0 END) as unusual_count
      FROM expenses
      GROUP BY session_label
      ORDER BY MAX(created_at) DESC
    `)
    return Response.json(rows)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}