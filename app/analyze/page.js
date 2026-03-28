"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function Analyze() {
  const router = useRouter()
  const [text, setText] = useState("")
  const [session, setSession] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fileName, setFileName] = useState("")

  const pills = ["Show unusual spend", "Top categories", "Last 3 months", "Cut subscriptions", "Biggest expenses"]

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setError("")

    try {
      const lowerName = file.name.toLowerCase()

      if (lowerName.endsWith(".csv")) {
        const csvText = await file.text()
        setText(csvText)
        return
      }

      if (lowerName.endsWith(".xlsx")) {
        const XLSX = await import("xlsx")
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer)
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_csv(ws)
        setText(data)
        return
      }

      if (lowerName.endsWith(".pdf")) {
        setError("PDF upload is accepted, but text extraction is not enabled yet. Please paste expense text manually.")
        return
      }

      setError("Unsupported file type. Please upload .xlsx, .csv, or .pdf")
    } catch (err) {
      setError(err.message || "Failed to read file")
    }
  }

  async function handleSubmit() {
    if (!text.trim()) { setError("Please enter expenses or upload a file"); return }
    if (!session.trim()) { setError("Please enter a session name like March 2026"); return }
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sessionLabel: session })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")

      if (Array.isArray(data.expenses)) {
        sessionStorage.setItem("expenses:" + session, JSON.stringify(data.expenses))
      }

      router.push("/dashboard?session=" + encodeURIComponent(session))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <nav className="navbar">
        <div className="container navbar-inner">
          <span className="navbar-logo">● ExpenseAI</span>
          <div className="navbar-links">
            <a href="/">Home</a>
            <a href="/analyze" className="active">Analyze</a>
            <a href="/history">History</a>
          </div>
        </div>
      </nav>
      <div className="container page" style={{ maxWidth: "720px" }}>
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "12px", color: "#14b8a6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>New Analysis</div>
          <h1 style={{ fontSize: "26px", fontWeight: 600, color: "#f1f5f9" }}>What would you like to analyze?</h1>
          <p style={{ color: "#64748b", marginTop: "6px", fontSize: "14px" }}>Paste expenses or upload a file to get started</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ fontSize: "13px", color: "#64748b", whiteSpace: "nowrap" }}>Session name</label>
          <input value={session} onChange={e => setSession(e.target.value)} placeholder='e.g. March 2026' style={{ maxWidth: "300px" }} />
        </div>

        <div className="card" style={{ marginBottom: "12px" }}>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder={"Type expenses naturally...\ne.g. AWS $4,200 | Slack $220 | Team lunch $850\n\nOr upload a .xlsx .csv file below"} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input type="file" accept=".xlsx,.csv,.pdf" onChange={handleFile} style={{ display: "none" }} />
              <span className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: "13px" }}>
                📎 {fileName || "Upload file"}
              </span>
            </label>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze →"}
            </button>
          </div>
        </div>

        <div style={{ fontSize: "12px", color: "#334155", marginBottom: "24px" }}>Supports .xlsx, .csv, .pdf</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {pills.map(p => (
            <button key={p} className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "99px" }}
              onClick={() => setText(t => t + (t ? "\n" : "") + p)}>
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}