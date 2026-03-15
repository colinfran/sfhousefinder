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

const metadataBase = (() => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

  try {
    return new URL(siteUrl)
  } catch {
    return new URL("http://localhost:3000")
  }
})()

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "sfhousefinder | Rental Dashboard",
    template: "%s | sfhousefinder",
  },
  description:
    "Track active and inactive Zillow and Craigslist rental listings across Bay Area cities.",
  icons: {
    icon: [
      {
        url: "/icon-light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    shortcut: [
      {
        url: "/icon-light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/icon-light.svg",
  },
  openGraph: {
    title: "sfhousefinder | Rental Dashboard",
    description:
      "Track active and inactive Zillow and Craigslist rental listings across Bay Area cities.",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        alt: "sfhousefinder rental dashboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "sfhousefinder | Rental Dashboard",
    description:
      "Track active and inactive Zillow and Craigslist rental listings across Bay Area cities.",
    images: ["/og-image.jpg"],
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
