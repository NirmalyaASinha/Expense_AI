"use client"; // <-- This MUST be the very first line!

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"

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
  const [barWidths, setBarWidths] = useState({})
  const [hoveredBtn, setHoveredBtn] = useState(null)

  useEffect(() => {
    if (!session) { setLoading(false); return }
    fetch("/api/expenses?session=" + encodeURIComponent(session))
      .then(async (r) => {
        if (!r.ok) {
          const payload = await r.json().catch(() => ({}))
          throw new Error(payload.error || "Failed to load expenses")
        }
        return r.json()
      })
      .then(data => {
        setExpenses(Array.isArray(data.expenses) ? data.expenses : Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [session])

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const unusual = expenses.filter(e => e.is_unusual)
  const suggestions = [...new Set(expenses.filter(e => e.suggestion).map(e => e.suggestion))]
  const categories = {}
  expenses.forEach(e => {
    categories[e.category] = (categories[e.category] || 0) + Number(e.amount)
  })
  const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1])
  const topCategory = sortedCategories[0]
  const maxCat = Math.max(...Object.values(categories), 1)

  const donutTotal = expenses.length
  const donutUnusual = unusual.length
  const donutNormal = donutTotal - donutUnusual
  const donutCirc = 2 * Math.PI * 48
  const donutUnusualLen = donutTotal ? donutCirc * (donutUnusual / donutTotal) : 0
  const donutNormalLen = donutCirc - donutUnusualLen

  useEffect(() => {
    if (!loading && !error && total > 0) {
      const timer = setTimeout(() => {
        const w = {}
        Object.entries(categories).forEach(([cat, amt]) => {
          w[cat] = Math.round((amt / maxCat) * 100)
        })
        setBarWidths(w)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [loading, error, total])

  function extractSavings(s) {
    const match = s.match(/(\d+)%/)
    if (match) {
      const amt = Math.round((Number(match[1]) / 100) * total)
      return amt > 0 ? "₹" + amt.toLocaleString("en-IN") : null
    }
    return null
  }

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  const btnStyle = (key) => ({
    background: "transparent",
    border: "1px solid " + (hoveredBtn === key ? "#14b8a6" : "rgba(255,255,255,0.1)"),
    color: hoveredBtn === key ? "#14b8a6" : "#94a3b8",
    fontSize: "12px",
    padding: "6px 14px",
    borderRadius: "9999px",
    cursor: "pointer",
    width: "100%",
    marginTop: "auto",
    transition: "all 0.2s"
  })

  async function handleAnalyze() {
    setAnalyzeError("")
    if (!newSession.trim() && !session) { setAnalyzeError("Please enter a session name"); return }
    if (!newText.trim()) { setAnalyzeError("Please enter expenses"); return }
    setAnalyzing(true)
    
    // Use existing session if newSession is left blank but we are already viewing a session
    const targetSession = newSession.trim() || session;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText, sessionLabel: targetSession })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")
      setShowAnalyze(false)
      setNewSession("")
      setNewText("")
      setTimeout(() => {
        window.location.href = "/dashboard?session=" + encodeURIComponent(targetSession)
      }, 300)
    } catch (err) {
      setAnalyzeError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div>
      <div className="container page" style={showAnalyze ? { display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 } : {}}>
        <div>

          {/* PAGE HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, paddingTop: 80 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{session || "No session"}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", fontSize: 13, borderRadius: 99, border: "1.5px solid #14b8a6", background: "rgba(20,184,166,0.08)", color: "#14b8a6", padding: "2px 12px", fontWeight: 600 }}>
                  📊 {expenses.length} expenses
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", fontSize: 13, borderRadius: 99, border: "1.5px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", padding: "2px 12px", fontWeight: 600 }}>
                  ⚠ {unusual.length} unusual
                </span>
                <button
                  className="btn btn-primary"
                  style={{ padding: "7px 18px", fontSize: "13px", marginLeft: 16 }}
                  onClick={() => setShowAnalyze(v => !v)}
                >
                  {showAnalyze ? "Close" : "+ New"}
                </button>
              </div>
            </div>

            {/* DONUT RING */}
            <div style={{ minWidth: 120, position: "relative" }}>
              <svg viewBox="0 0 120 120" width="120" height="120">
                <defs>
                  <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="48" stroke="#1a1a1a" strokeWidth="12" fill="none" />
                <circle
                  cx="60" cy="60" r="48"
                  stroke="url(#donutGrad)"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={donutCirc}
                  strokeDashoffset={donutUnusualLen}
                  transform="rotate(-90 60 60)"
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s cubic-bezier(.6,0,.4,1)" }}
                />
                {donutUnusual > 0 && (
                  <circle
                    cx="60" cy="60" r="48"
                    stroke="#ef4444"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ strokeDasharray: `${donutUnusualLen} ${donutCirc - donutUnusualLen}` }}
                  />
                )}
                <text x="60" y="56" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="700">{donutTotal}</text>
                <text x="60" y="70" textAnchor="middle" fill="#64748b" fontSize="11">total</text>
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ color: "#14b8a6", fontWeight: 600, fontSize: 12 }}>{donutNormal} normal</span>
                <span style={{ color: "#ef4444", fontWeight: 600, fontSize: 12 }}>{donutUnusual} unusual</span>
              </div>
              <div style={{ color: "#64748b", fontSize: 11, textAlign: "center", marginTop: 2 }}>Expense Health</div>
            </div>
          </div>

          {loading && <div className="loading">Loading expenses...</div>}
          {error && <div className="error-msg">{error}</div>}

          {!loading && !error && (
            <>
              {/* STAT CARDS - 4 SQUARES */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "16px",
                marginBottom: "24px"
              }}>

                {/* Total Spend */}
                <div className="card" style={{ position: "relative", width: "100%", paddingBottom: "100%" }}>
                  <div style={{ position: "absolute", inset: 0, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Total Spend</div>
                      <div style={{ fontSize: 28, fontWeight: 800, background: "linear-gradient(90deg,#14b8a6,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1.2 }}>
                        ₹{total.toLocaleString("en-IN")}
                      </div>
                      <svg width="100%" height="28" viewBox="0 0 100 28" style={{ marginTop: 8 }}>
                        <polyline points="0,22 16,18 32,14 48,11 64,9 80,6 100,4" stroke="#14b8a6" strokeWidth="1.5" fill="none" />
                      </svg>
                      <div style={{ color: "#14b8a6", fontSize: 11, marginTop: 4 }}>↑ 12% vs last session</div>
                    </div>
                    <button
                      style={btnStyle("spend")}
                      onMouseEnter={() => setHoveredBtn("spend")}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => scrollTo("category-chart")}
                    >View Breakdown →</button>
                  </div>
                </div>

                {/* Unusual Items */}
                <div className="card" style={{ position: "relative", width: "100%", paddingBottom: "100%" }}>
                  <div style={{ position: "absolute", inset: 0, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", textAlign: "center" }}>
                    <div style={{ width: "100%", textAlign: "center" }}>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Unusual Items</div>
                      <div style={{ fontSize: 18, color: unusual.length === 0 ? "#14b8a6" : "#ef4444", marginBottom: 4 }}>
                        {unusual.length === 0 ? "✓" : "⚠"}
                      </div>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <span style={{ fontSize: 40, fontWeight: 800, color: unusual.length === 0 ? "#14b8a6" : "#ef4444", position: "relative", zIndex: 2 }}>
                          {unusual.length}
                        </span>
                        <span style={{
                          position: "absolute", left: "50%", top: "50%",
                          transform: "translate(-50%,-50%)",
                          width: 56, height: 56, borderRadius: "50%",
                          background: unusual.length === 0
                            ? "radial-gradient(circle,rgba(20,184,166,0.15),transparent)"
                            : "radial-gradient(circle,rgba(239,68,68,0.15),transparent)",
                          zIndex: 1, display: "block"
                        }} />
                      </div>
                      <div style={{ color: unusual.length === 0 ? "#14b8a6" : "#ef4444", fontSize: 12, marginTop: 4 }}>
                        {unusual.length === 0 ? "All clear!" : "flagged"}
                      </div>
                    </div>
                    <button
                      style={btnStyle("unusual")}
                      onMouseEnter={() => setHoveredBtn("unusual")}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => scrollTo("unusual-section")}
                    >See Flagged →</button>
                  </div>
                </div>

                {/* Top Category */}
                <div className="card" style={{ position: "relative", width: "100%", paddingBottom: "100%" }}>
                  <div style={{ position: "absolute", inset: 0, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Top Category</div>
                      <div style={{ fontWeight: 700, fontSize: 17, color: "#f1f5f9", marginBottom: 10, lineHeight: 1.3 }}>
                        {topCategory?.[0] || "—"}
                      </div>
                      {topCategory && (
                        <>
                          <div style={{ height: 10, background: "#1a1a1a", borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
                            <div style={{
                              width: Math.round((topCategory[1] / total) * 100) + "%",
                              height: "100%",
                              background: "linear-gradient(90deg,#ef4444,#f87171)",
                              borderRadius: 99,
                              transition: "width 0.8s cubic-bezier(.6,0,.4,1)"
                            }} />
                          </div>
                          <div style={{ color: "#14b8a6", fontWeight: 700, fontSize: 13 }}>
                            {Math.round((topCategory[1] / total) * 100)}% of total
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      style={btnStyle("category")}
                      onMouseEnter={() => setHoveredBtn("category")}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => scrollTo("expenses-table")}
                    >Full Table →</button>
                  </div>
                </div>

                {/* Expense Health Donut */}
                <div className="card" style={{ position: "relative", width: "100%", paddingBottom: "100%" }}>
                  <div style={{ position: "absolute", inset: 0, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Expense Health</div>
                      <svg viewBox="0 0 120 120" width="100%" height="auto">
                        <defs>
                          <linearGradient id="donutGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#14b8a6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                        <circle cx="60" cy="60" r="48" stroke="#1a1a1a" strokeWidth="12" fill="none" />
                        <circle
                          cx="60" cy="60" r="48"
                          stroke="url(#donutGrad2)"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={donutCirc}
                          strokeDashoffset={donutUnusualLen}
                          transform="rotate(-90 60 60)"
                          strokeLinecap="round"
                          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.6,0,.4,1)" }}
                        />
                        {donutUnusual > 0 && (
                          <circle
                            cx="60" cy="60" r="48"
                            stroke="#ef4444"
                            strokeWidth="12"
                            fill="none"
                            strokeLinecap="round"
                            transform="rotate(-90 60 60)"
                            style={{ strokeDasharray: `${donutUnusualLen} ${donutCirc - donutUnusualLen}` }}
                          />
                        )}
                        <text x="60" y="56" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="700">{donutTotal}</text>
                        <text x="60" y="70" textAnchor="middle" fill="#64748b" fontSize="11">total</text>
                      </svg>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ color: "#14b8a6", fontSize: 11, fontWeight: 600 }}>{donutNormal} ok</span>
                        <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 600 }}>{donutUnusual} flag</span>
                      </div>
                    </div>
                    <button
                      style={btnStyle("health")}
                      onMouseEnter={() => setHoveredBtn("health")}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => scrollTo("ai-suggestions")}
                    >AI Tips →</button>
                  </div>
                </div>

              </div>

              {/* CATEGORY BAR CHART */}
              <div className="card" id="category-chart" style={{ marginBottom: 24 }}>
                <div className="section-title">Category Breakdown</div>
                {sortedCategories.map(([cat, amt], idx) => {
                  const pct = Math.round((amt / total) * 100)
                  let grad = "linear-gradient(90deg,#14b8a6,#06b6d4)"
                  if (idx === 0) grad = "linear-gradient(90deg,#ef4444,#f87171)"
                  else if (idx === 1) grad = "linear-gradient(90deg,#f59e0b,#fbbf24)"
                  return (
                    <div key={cat} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: "#d1d5db" }}>{cat}</span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>{pct}%</span>
                      </div>
                      <div style={{ height: 14, background: "#1a1a1a", borderRadius: 99, overflow: "hidden", position: "relative" }}>
                        <div style={{
                          width: (barWidths[cat] || 0) + "%",
                          height: "100%",
                          background: grad,
                          borderRadius: 99,
                          transition: "width 1s cubic-bezier(.22,1,.36,1)"
                        }} />
                        <span style={{
                          position: "absolute", right: 8, top: 0,
                          color: "#f1f5f9", fontWeight: 700, fontSize: 11,
                          lineHeight: "14px"
                        }}>
                          ₹{Math.round(amt).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* UNUSUAL TRANSACTIONS */}
              <div className="card" id="unusual-section" style={{ marginBottom: 24 }}>
                <div className="section-title">
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#ef4444", marginRight: 8 }} />
                  Unusual Transactions
                </div>
                {unusual.length === 0 && (
                  <div style={{ color: "#64748b", fontSize: 14 }}>No unusual transactions found ✓</div>
                )}
                {unusual.map((e, i) => {
                  let sev = "LOW", color = "#eab308"
                  if (Number(e.amount) > 20000) { sev = "HIGH"; color = "#ef4444" }
                  else if (Number(e.amount) > 10000) { sev = "MEDIUM"; color = "#f97316" }
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "stretch",
                      background: "rgba(239,68,68,0.05)",
                      border: "1px solid rgba(239,68,68,0.15)",
                      borderRadius: 10, marginBottom: 10, overflow: "hidden"
                    }}>
                      <div style={{ width: 4, background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, padding: "12px 14px" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{e.vendor}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{e.category}</div>
                        {e.suggestion && (
                          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{e.suggestion}</div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", padding: "12px 14px", gap: 4 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>
                          ₹{Number(e.amount).toLocaleString("en-IN")}
                        </span>
                        <span style={{ fontSize: 10, color: color, fontWeight: 700, border: `1px solid ${color}`, borderRadius: 6, padding: "1px 7px" }}>
                          {sev}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* AI SUGGESTIONS */}
              {suggestions.length > 0 && (
                <div className="card" id="ai-suggestions" style={{ marginBottom: 24 }}>
                  <div className="section-title" style={{ color: "#14b8a6" }}>✦ AI Suggestions</div>
                  {suggestions.map((s, i) => {
                    const savings = extractSavings(s)
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        borderLeft: "2px solid rgba(20,184,166,0.3)",
                        paddingLeft: 12, paddingBottom: 10, marginBottom: 10,
                        borderBottom: i < suggestions.length - 1 ? "1px solid #111" : "none"
                      }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: "linear-gradient(135deg,#14b8a6,#06b6d4)",
                          color: "#000", display: "flex", alignItems: "center",
                          justifyContent: "center", fontWeight: 700,
                          fontSize: 12, flexShrink: 0
                        }}>{i + 1}</span>
                        <span style={{ flex: 1, fontSize: 14, color: "#d1d5db" }}>{s}</span>
                        {savings && (
                          <span style={{
                            background: "rgba(20,184,166,0.15)",
                            color: "#14b8a6", borderRadius: 8,
                            fontSize: 11, fontWeight: 700,
                            padding: "2px 10px", flexShrink: 0
                          }}>Save {savings}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ALL EXPENSES TABLE */}
              <div className="card" id="expenses-table">
                <div className="section-title">All Expenses</div>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Vendor</th>
                        <th>Amount</th>
                        <th>Month</th>
                        <th>Status</th>
                        <th>Suggestion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e, i) => (
                        <tr key={i} className={e.is_unusual ? "unusual" : ""}>
                          <td>{e.category}</td>
                          <td style={{ fontWeight: 500 }}>{e.vendor}</td>
                          <td style={{ color: "#14b8a6", fontWeight: 600 }}>
                            ₹{Number(e.amount).toLocaleString("en-IN")}
                          </td>
                          <td style={{ color: "#64748b" }}>{e.month}/{e.year}</td>
                          <td>
                            {e.is_unusual
                              ? <span style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", borderRadius: 99, fontSize: 11, padding: "2px 10px", fontWeight: 600 }}>Unusual</span>
                              : <span style={{ background: "rgba(20,184,166,0.1)", color: "#14b8a6", borderRadius: 99, fontSize: 11, padding: "2px 10px", fontWeight: 600 }}>Normal</span>
                            }
                          </td>
                          <td style={{ color: "#94a3b8", fontSize: 12 }}>
                            {e.suggestion ? e.suggestion.substring(0, 60) + (e.suggestion.length > 60 ? "..." : "") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!loading && !error && expenses.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
              <div style={{ fontSize: 18, marginBottom: 8 }}>No expenses found</div>
              <a href="/analyze" style={{ color: "#14b8a6", fontSize: 14 }}>Start a new analysis →</a>
            </div>
          )}
        </div>

        {/* SIDE PANEL - NEW ANALYSIS */}
        {showAnalyze && (
          <div className="card" style={{ marginTop: 80, alignSelf: "start", position: "sticky", top: 80 }}>
            <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 16 }}>Analyze New Session</div>
            <input
              value={newSession.length === 0 && session ? session : newSession}
              onChange={e => setNewSession(e.target.value)}
              placeholder='Session name e.g. "April 2026"'
              style={{ marginBottom: 12 }}
            />
            <textarea
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Paste expenses here..."
              style={{ minHeight: 140, marginBottom: 12 }}
            />
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input
                id="file-upload"
                type="file"
                accept=".txt,.csv,.tsv,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files && e.target.files[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = ev => {
                      setNewText(ev.target.result)
                    }
                    reader.readAsText(file)
                  }
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById("file-upload").click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#1a1a1a",
                  border: "1.5px solid #14b8a6",
                  color: "#14b8a6",
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  marginBottom: 0,
                  width: "100%"
                }}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20" style={{ marginRight: 6 }}>
                  <path d="M4 13v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 10l3 3 3-3" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 3v10" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Upload File
              </button>
            </div>
            
            {/* The error message will now correctly show here if there is one */}
            {analyzeError && (
              <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 10 }}>{analyzeError}</div>
            )}
            
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                width: "100%",
                background: "linear-gradient(135deg,#14b8a6,#06b6d4)",
                color: "#000", fontWeight: 700, fontSize: 14,
                border: "none", padding: "12px", borderRadius: 8,
                cursor: analyzing ? "not-allowed" : "pointer",
                opacity: analyzing ? 0.7 : 1
              }}
            >
              {analyzing ? "Analyzing..." : "Analyze →"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  // Your Suspense boundary here is completely correct!
  return (
    <Suspense fallback={<div className="loading">Loading...</div>}>
      <Dashboard />
    </Suspense>
  )
}