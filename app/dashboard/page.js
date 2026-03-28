"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"


import { useRef } from "react"

function Dashboard() {
  const params = useSearchParams()
  const session = params.get("session") || ""
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAnalyze, setShowAnalyze] = useState(false)
  const [newSession, setNewSession] = useState("")
  const [newText, setNewText] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState("")
  const router = useRef(null)

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }

    fetch("/api/expenses?session=" + encodeURIComponent(session))
      .then(async (r) => {
        if (!r.ok) {
          const payload = await r.json().catch(() => ({}))
          throw new Error(payload.error || "Failed to load expenses")
        }
        return r.json()
      })
      .then(data => { setExpenses(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(err => {
        try {
          const raw = sessionStorage.getItem("expenses:" + session)
          if (raw) {
            const fallback = JSON.parse(raw)
            setExpenses(Array.isArray(fallback) ? fallback : [])
            setError("Database unreachable. Showing local session data.")
            setLoading(false)
            return
          }
        } catch (_) {
          // fall through to normal error path
        }
        setError(err.message)
        setLoading(false)
      })
  }, [session])

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const unusual = expenses.filter(e => e.is_unusual)
  const suggestions = expenses.filter(e => e.suggestion).map(e => e.suggestion)
  const categories = {}
  expenses.forEach(e => { categories[e.category] = (categories[e.category] || 0) + Number(e.amount) })
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]
  const maxCat = Math.max(...Object.values(categories), 1)

  async function handleAnalyze() {
    setAnalyzeError("")
    if (!newSession.trim()) { setAnalyzeError("Please enter a session name"); return }
    if (!newText.trim()) { setAnalyzeError("Please enter expenses"); return }
    setAnalyzing(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText, sessionLabel: newSession })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")
      setShowAnalyze(false)
      setNewSession("")
      setNewText("")
      setTimeout(() => {
        window.location.href = "/dashboard?session=" + encodeURIComponent(newSession)
      }, 300)
    } catch (err) {
      setAnalyzeError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div>
      <nav className="navbar">
        <div className="container navbar-inner">
          <span className="navbar-logo">● ExpenseAI</span>
          <div className="navbar-links">
            <a href="/">Home</a>
            <a href="/analyze">Analyze</a>
            <button className="btn btn-primary" style={{ padding: "7px 18px", fontSize: "13px" }} onClick={() => setShowAnalyze(v => !v)}>
              {showAnalyze ? "Close" : "+ New"}
            </button>
            <a href="/history">History</a>
          </div>
        </div>
      </nav>

      <div className="container page" style={showAnalyze ? { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 } : {}}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#f1f5f9" }}>{session}</h1>
              <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>{expenses.length} expenses analyzed</p>
            </div>
            <a href="/analyze" className="btn btn-ghost" style={{ fontSize: "13px", padding: "8px 18px" }}>Update →</a>
          </div>

          {loading && <div className="loading">Analyzing your expenses...</div>}
          {error && <div className="error-msg">{error}</div>}

          {!loading && !error && <>
            <div className="grid-3" style={{ marginBottom: "24px" }}>
              <div className="card">
                <div className="stat-label">Total Spend</div>
                <div className="stat-value">₹{total.toLocaleString("en-IN")}</div>
              </div>
              <div className="card">
                <div className="stat-label">Unusual Transactions</div>
                <div className="stat-value red">{unusual.length}</div>
              </div>
              <div className="card">
                <div className="stat-label">Top Category</div>
                <div className="stat-value white" style={{ fontSize: "20px" }}>{topCategory?.[0] || "—"}</div>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: "24px" }}>
              <div className="card">
                <div className="section-title">Spend by Category</div>
                <div className="bar-chart">
                  {Object.entries(categories).slice(0, 6).map(([cat, amt]) => (
                    <div key={cat} className="bar-col">
                      <div className="bar-amount">₹{Math.round(amt / 1000)}k</div>
                      <div className="bar-fill" style={{ height: Math.max(8, (amt / maxCat) * 100) + "px" }} />
                      <div className="bar-label">{cat.split(" ")[0]}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="section-title">Unusual Transactions</div>
                {unusual.length === 0 && <div style={{ color: "#64748b", fontSize: "14px" }}>No unusual transactions found</div>}
                {unusual.map((e, i) => (
                  <div key={i} className="alert-box">
                    <div className="alert-title">{e.vendor} — ₹{Number(e.amount).toLocaleString("en-IN")}</div>
                    <div className="alert-body">{e.category} · {e.suggestion || "Flagged as unusual"}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: "24px" }}>
              <div className="section-title">Category Breakdown</div>
              {Object.entries(categories).map(([cat, amt]) => {
                const pct = Math.round((amt / total) * 100)
                const cls = pct > 40 ? "over" : pct > 25 ? "warn" : "good"
                return (
                  <div key={cat} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", color: "#d1d5db" }}>{cat}</span>
                      <span style={{ fontSize: "13px", color: "#94a3b8" }}>{pct}% · ₹{Math.round(amt).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="progress-bar">
                      <div className={"progress-fill " + cls} style={{ width: pct + "%" }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {suggestions.length > 0 && (
              <div className="card" style={{ marginBottom: "24px" }}>
                <div className="section-title">💡 AI Suggestions</div>
                {[...new Set(suggestions)].map((s, i) => (
                  <div key={i} className="suggestion-row">
                    <span className="teal-dot" />
                    {s}
                  </div>
                ))}
              </div>
            )}

            <div className="card">
              <div className="section-title">All Expenses</div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Category</th><th>Vendor</th><th>Amount</th>
                      <th>Month</th><th>Status</th><th>Suggestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e, i) => (
                      <tr key={i} className={e.is_unusual ? "unusual" : ""}>
                        <td>{e.category}</td>
                        <td style={{ fontWeight: 500 }}>{e.vendor}</td>
                        <td style={{ color: "#14b8a6", fontWeight: 600 }}>₹{Number(e.amount).toLocaleString("en-IN")}</td>
                        <td style={{ color: "#64748b" }}>{e.month}/{e.year}</td>
                        <td>{e.is_unusual ? <span className="badge badge-red">Unusual</span> : <span className="badge badge-gray">Normal</span>}</td>
                        <td style={{ color: "#94a3b8", fontSize: "12px" }}>{e.suggestion || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>}
        </div>
        {showAnalyze && (
          <div className="card" style={{ minHeight: 400, marginLeft: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 16 }}>Analyze New Session</div>
            <div style={{ marginBottom: 12 }}>
              <input
                value={newSession}
                onChange={e => setNewSession(e.target.value)}
                placeholder="Session name (e.g. April 2026)"
                style={{ marginBottom: 8 }}
              />
              <textarea
                value={newText}
                onChange={e => setNewText(e.target.value)}
                placeholder="Paste or type expenses here..."
                style={{ minHeight: 120, marginBottom: 8 }}
              />
              {analyzeError && <div className="error-msg" style={{ marginBottom: 8 }}>{analyzeError}</div>}
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense fallback={<div className="loading">Loading...</div>}><Dashboard /></Suspense>
}