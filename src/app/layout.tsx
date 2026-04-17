import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { Toaster } from "sonner"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
})
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
})

export const metadata: Metadata = {
  title: "Libra - Scopri storie un blocco alla volta",
  description: "La piattaforma dove gli autori pubblicano libri a blocchi e i lettori scoprono storie nuove ogni settimana.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const t = localStorage.getItem('libra-theme');
              if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              }
              if (localStorage.getItem('libra-blue-light') === 'true') {
                document.documentElement.classList.add('blue-light-filter');
              }
            } catch(e) {}
          `
        }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-cream-50 dark:bg-[#161a14] min-h-screen transition-colors duration-300`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: 'var(--background)',
                  border: '1px solid var(--sage)',
                  color: 'var(--foreground)',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
