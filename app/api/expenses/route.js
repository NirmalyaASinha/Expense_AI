
import { auth } from "@/auth";
import { ensureExpensesTable, query } from "../../../lib/db"

export async function GET(request) {
  try {
    await ensureExpensesTable();
    const sessionObj = await auth();
    const userId = sessionObj?.user?.id || "anonymous";

    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");

    if (!session) {
      return Response.json({ error: "Missing session query parameter" }, { status: 400 });
    }

    const rows = await query(
      "SELECT * FROM expenses WHERE session_label = $1 AND user_id = $2 ORDER BY created_at ASC",
      [session, userId]
    );

    return Response.json(rows);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await ensureExpensesTable();
    const sessionObj = await auth();
    const userId = sessionObj?.user?.id || "anonymous";

    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");

    if (!session) {
      return Response.json({ error: "Missing session query parameter" }, { status: 400 });
    }

    await query("DELETE FROM expenses WHERE session_label = $1 AND user_id = $2", [session, userId]);
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
