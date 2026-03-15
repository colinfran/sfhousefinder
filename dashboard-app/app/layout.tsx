import type { Metadata } from "next"
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google"
import type { JSX, ReactNode } from "react"

import Header from "@/components/header"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
})

export const metadata: Metadata = {
  title: "Housefinder Dashboard",
  description: "Server-rendered rental listings backed by MongoDB",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
}

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} font-[family-name:var(--font-sans)]`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <div className="flex min-h-0 flex-1 flex-col sm:gap-4 sm:px-7 sm:py-4">
            <Header />
            <main className="flex min-h-0 flex-1 flex-col gap-2 md:gap-4">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
