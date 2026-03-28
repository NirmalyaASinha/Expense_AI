
import { auth } from "@/auth";
import { ensureExpensesTable, query } from "../../../lib/db"

function isDbConnectivityError(err) {
  const codes = ["ETIMEDOUT", "ENETUNREACH", "ECONNREFUSED", "EHOSTUNREACH", "ENOTFOUND"]
  if (codes.includes(err?.code)) return true
  if (Array.isArray(err?.errors) && err.errors.some((e) => codes.includes(e?.code))) return true
  return false
}

function inferCategory(text) {
  const t = text.toLowerCase()
  if (/aws|azure|gcp|cloud|hosting|server|domain/.test(t)) return "Infrastructure"
  if (/slack|zoom|notion|jira|github|software|subscription/.test(t)) return "SaaS"
  if (/lunch|dinner|food|restaurant|cafe|swiggy|zomato/.test(t)) return "Food"
  if (/uber|ola|taxi|flight|train|travel|hotel/.test(t)) return "Travel"
  if (/meta|google ads|ads|marketing/.test(t)) return "Marketing"
  if (/salary|payroll|contractor|freelance/.test(t)) return "Payroll"
  if (/rent|office|electricity|internet|utility/.test(t)) return "Operations"
  return "General"
}

function parseAmount(line) {
  const matches = [...line.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)]
  if (matches.length === 0) return null

  const values = matches
    .map((m) => Number(m[0].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n >= 0)

  if (values.length === 0) return null
  return Math.max(...values)
}

function parseFallbackExpenses(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const expenses = []
  for (const line of lines) {
    const amount = parseAmount(line)
    if (amount == null) continue

    const tokens = line.split(/[|,;-]+/).map((t) => t.trim()).filter(Boolean)
    const vendor = (tokens[0] || line).slice(0, 120)
    const category = inferCategory(line)
    const highThreshold = category === "Payroll" ? 100000 : category === "Infrastructure" ? 20000 : 10000
    const isUnusual = amount >= highThreshold
    const suggestion = isUnusual ? "Review this unusually high transaction." : null

    expenses.push({
      category,
      vendor,
      amount,
      month,
      year,
      is_unusual: isUnusual,
      suggestion,
    })
  }

  return expenses
}

function parseAiExpenses(cfData) {
  const rawCandidate = cfData?.result?.response ?? cfData?.result ?? ""

  if (Array.isArray(rawCandidate)) {
    return rawCandidate
  }

  const rawText = typeof rawCandidate === "string" ? rawCandidate : JSON.stringify(rawCandidate)
  const clean = rawText.replace(/```json/g, "").replace(/```/g, "").trim()
  const lastBracket = clean.lastIndexOf("]")
  const safeJson = lastBracket !== -1 ? clean.substring(0, lastBracket + 1) : clean
  return JSON.parse(safeJson)
}

export async function POST(request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "anonymous";
    const body = await request.json();
    const { text, sessionLabel } = body;

    if (!text || !sessionLabel) {
      return Response.json({ error: "Missing text or sessionLabel" }, { status: 400 });
    }

    await ensureExpensesTable();

    let expenses = [];
    let aiWarning = "";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let cfResponse;
      try {
        cfResponse = await fetch(
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
            }),
            signal: controller.signal,
          }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const cfData = await cfResponse.json().catch(() => ({}));
      if (!cfResponse.ok || !cfData.success) {
        const apiMsg = cfData?.errors?.[0]?.message || cfData?.result?.error || `HTTP ${cfResponse.status}`;
        throw new Error(`Cloudflare AI failed: ${apiMsg}`);
      }

      expenses = parseAiExpenses(cfData);
    } catch (aiErr) {
      expenses = parseFallbackExpenses(text);
      if (expenses.length === 0) {
        throw new Error(aiErr?.message || "Cloudflare AI failed and no parseable expenses were found");
      }
      aiWarning = "Cloudflare AI unavailable. Used local parser fallback.";
    }

    if (!Array.isArray(expenses)) throw new Error("AI did not return an array");

    let persisted = true;
    try {
      await query("DELETE FROM expenses WHERE session_label = $1 AND user_id = $2", [sessionLabel, userId]);

      for (const exp of expenses) {
        await query(
          `INSERT INTO expenses (session_label, category, vendor, amount, month, year, is_unusual, suggestion, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [sessionLabel, exp.category, exp.vendor, exp.amount, exp.month, exp.year, exp.is_unusual, exp.suggestion, userId]
        );
      }
    } catch (dbErr) {
      if (isDbConnectivityError(dbErr)) {
        persisted = false;
      } else {
        throw dbErr;
      }
    }

    if (!persisted) {
      return Response.json({
        success: true,
        count: expenses.length,
        persisted: false,
        warning: aiWarning
          ? `${aiWarning} Database unreachable. Results are returned but not saved to Neon.`
          : "Database unreachable. Results are returned but not saved to Neon.",
        expenses,
      });
    }

    return Response.json({
      success: true,
      count: expenses.length,
      persisted: true,
      warning: aiWarning || undefined,
    });

  } catch (err) {
    console.error("Analyze error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}