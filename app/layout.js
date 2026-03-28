import "./globals.css"

export const metadata = { title: "ExpenseAI", description: "AI expense analyzer" }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}