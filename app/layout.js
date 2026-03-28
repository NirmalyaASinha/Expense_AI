import "./globals.css"
import { auth } from "@/auth";

export const metadata = { title: "ExpenseAI", description: "AI expense analyzer" }

export default async function RootLayout({ children }) {
  const session = await auth();
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div className="container navbar-inner">
            <span className="navbar-logo">● ExpenseAI</span>
            <div className="navbar-links" style={{ marginLeft: "auto" }}>
              <a href="/">Home</a>
              <a href="/analyze">Analyze</a>
              <a href="/history">History</a>
              {session?.user ? (
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <img
                    src={session.user.image}
                    alt={session.user.name}
                    style={{
                      width:"32px",height:"32px",
                      borderRadius:"50%",
                      border:"2px solid #14b8a6"
                    }}
                  />
                  <span style={{fontSize:"13px",color:"#94a3b8"}}>
                    {session.user.name}
                  </span>
                  <a
                    href="/api/auth/signout"
                    style={{
                      fontSize:"12px",color:"#64748b",
                      border:"1px solid #2d2d2d",
                      padding:"5px 12px",borderRadius:"9999px",
                      textDecoration:"none",transition:"all 0.2s"
                    }}
                  >
                    Sign out
                  </a>
                </div>
              ) : (
                <a
                  href="/api/auth/signin"
                  style={{
                    background:"linear-gradient(135deg,#14b8a6,#06b6d4)",
                    color:"#000",fontWeight:"600",fontSize:"13px",
                    padding:"8px 20px",borderRadius:"9999px",
                    textDecoration:"none"
                  }}
                >
                  Sign in with GitHub
                </a>
              )}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}