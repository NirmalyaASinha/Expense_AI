"use client"
import { useEffect, useState } from "react"

export default function History() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/sessions")
      .then(r => r.json())
      .then(data => { setSessions(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function deleteSession(label) {
    if (!confirm("Delete " + label + "?")) return
    await fetch("/api/expenses?session=" + encodeURIComponent(label), { method: "DELETE" })
    setSessions(s => s.filter(x => x.session_label !== label))
  }

  return (
    <div>
      <nav className="navbar">
        <div className="container navbar-inner">
          <span className="navbar-logo">● ExpenseAI</span>
          <div className="navbar-links">
            <a href="/">Home</a>
            <a href="/analyze">Analyze</a>
            <a href="/history" className="active">History</a>
          </div>
        </div>
      </nav>
      <div className="container page" style={{ maxWidth: "720px" }}>
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#f1f5f9" }}>Your Sessions</h1>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>All previous expense analyses</p>
        </div>
        {loading && <div className="loading">Loading sessions...</div>}
        {!loading && sessions.length === 0 && (
          <div className="empty-state">
            No sessions yet.<br />
            <a href="/analyze" style={{ color: "#14b8a6", marginTop: "12px", display: "inline-block" }}>Start your first analysis →</a>
          </div>
        )}
        {sessions.map((s, i) => (
          <div key={i} className="card" style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span className="teal-dot" />
              <div>
                <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "15px" }}>{s.session_label}</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                  {s.expense_count} expenses · {s.unusual_count} unusual
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontWeight: 700, fontSize: "16px", color: "#14b8a6" }}>₹{Number(s.total).toLocaleString("en-IN")}</span>
              <a href={"/dashboard?session=" + encodeURIComponent(s.session_label)} className="btn btn-ghost" style={{ padding: "7px 16px", fontSize: "13px" }}>View →</a>
              <button onClick={() => deleteSession(s.session_label)} className="btn btn-danger" style={{ padding: "7px 14px", fontSize: "12px" }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}