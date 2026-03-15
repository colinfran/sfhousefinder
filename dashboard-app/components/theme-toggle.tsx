"use client"

import { Moon, SunMedium } from "lucide-react"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

const ThemeToggle = (): React.JSX.Element => {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = (): void => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  if (!mounted) {
    return <div className="h-8 w-8 rounded-md border border-border bg-card" />
  }

  return (
    <Button
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="h-8 w-8 rounded-md border-border bg-card shadow-none hover:bg-accent"
      size="icon"
      variant="outline"
      onClick={toggleTheme}
    >
      {resolvedTheme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

export { ThemeToggle }
