import { ensureExpensesTable, query } from "../../../lib/db"

function isDbConnectivityError(err) {
  const codes = ["ETIMEDOUT", "ENETUNREACH", "ECONNREFUSED", "EHOSTUNREACH", "ENOTFOUND"]
  if (codes.includes(err?.code)) return true
  if (Array.isArray(err?.errors) && err.errors.some((e) => codes.includes(e?.code))) return true
  return false
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { text, sessionLabel } = body

    if (!text || !sessionLabel) {
      return Response.json({ error: "Missing text or sessionLabel" }, { status: 400 })
    }

    await ensureExpensesTable()

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a financial expense analyzer. Return ONLY a valid JSON array. 
No markdown. No explanation. No extra text.
Each object must have exactly: category (string), vendor (string), 
amount (number), month (number), year (number), 
is_unusual (boolean), suggestion (string or null).
Mark is_unusual true if amount is abnormally high for its category.
If month and year are not provided assume current month and year.`
            },
            {
              role: "user",
              content: `Analyze and return JSON array only:\n\n${text}`
            }
          ],
          max_tokens: 4096,
          temperature: 0.1
        })
      }
    )

    const cfData = await cfResponse.json()
    if (!cfData.success) throw new Error("Cloudflare AI failed")

    const rawCandidate = cfData.result?.response ?? cfData.result ?? ""

    let expenses
    if (Array.isArray(rawCandidate)) {
      expenses = rawCandidate
    } else {
      const rawText = typeof rawCandidate === "string" ? rawCandidate : JSON.stringify(rawCandidate)
      const clean = rawText.replace(/```json/g, "").replace(/```/g, "").trim()
      const lastBracket = clean.lastIndexOf("]")
      const safeJson = lastBracket !== -1 ? clean.substring(0, lastBracket + 1) : clean
      expenses = JSON.parse(safeJson)
    }

    if (!Array.isArray(expenses)) throw new Error("AI did not return an array")

    let persisted = true
    try {
      await query("DELETE FROM expenses WHERE session_label = $1", [sessionLabel])

      for (const exp of expenses) {
        await query(
          `INSERT INTO expenses (session_label, category, vendor, amount, month, year, is_unusual, suggestion)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [sessionLabel, exp.category, exp.vendor, exp.amount, exp.month, exp.year, exp.is_unusual, exp.suggestion]
        )
      }
    } catch (dbErr) {
      if (isDbConnectivityError(dbErr)) {
        persisted = false
      } else {
        throw dbErr
      }
    }

    if (!persisted) {
      return Response.json({
        success: true,
        count: expenses.length,
        persisted: false,
        warning: "Database unreachable. Results are returned but not saved to Neon.",
        expenses,
      })
    }

    return Response.json({ success: true, count: expenses.length, persisted: true })

  } catch (err) {
    console.error("Analyze error:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}