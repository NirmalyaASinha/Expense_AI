export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px", gap: "0" }}>
      <div style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", color: "#14b8a6", padding: "6px 18px", borderRadius: "99px", fontSize: "12px", marginBottom: "28px", display: "inline-block" }}>
        ● AI-powered expense intelligence
      </div>
      <h1 style={{ fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.15, marginBottom: "20px" }}>
        Track. Detect.<br />
        <span style={{ background: "linear-gradient(135deg, #14b8a6, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Optimize.
        </span>
      </h1>
      <p style={{ fontSize: "16px", color: "#64748b", maxWidth: "440px", marginBottom: "36px", lineHeight: 1.7 }}>
        Upload your expenses and let AI categorize, flag anomalies, and suggest savings in seconds.
      </p>
      <a href="/analyze" className="btn btn-primary" style={{ fontSize: "15px", padding: "14px 36px" }}>
        Start New Analysis →
      </a>
      <div style={{ display: "flex", gap: "48px", marginTop: "72px" }}>
        {[["2s", "Analysis time"], ["AI", "Powered"], ["Free", "To use"]].map(([val, label]) => (
          <div key={val} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, background: "linear-gradient(135deg, #14b8a6, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{val}</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}