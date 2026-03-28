
import { auth } from "@/auth";
import { ensureExpensesTable, query } from "../../../lib/db"

export async function GET() {
  try {
    await ensureExpensesTable();
    const sessionObj = await auth();
    const userId = sessionObj?.user?.id || "anonymous";

    const rows = await query(`
      SELECT 
        session_label,
        COUNT(*) as expense_count,
        SUM(amount) as total,
        SUM(CASE WHEN is_unusual THEN 1 ELSE 0 END) as unusual_count
      FROM expenses
      WHERE user_id = $1
      GROUP BY session_label
      ORDER BY MAX(created_at) DESC
    `, [userId]);
    return Response.json(rows);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}