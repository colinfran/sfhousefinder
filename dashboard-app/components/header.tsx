import { Home } from "lucide-react"
import Link from "next/link"
import type { JSX } from "react"

import { ThemeToggle } from "@/components/theme-toggle"

const Header = (): JSX.Element => {
  return (
    <header className="sticky top-0 z-30 flex h-[50px] items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:border-0 sm:bg-transparent sm:px-6">
      <Link className="flex w-full items-center gap-3" href="/">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card">
          <Home className="h-4 w-4" />
        </div>
        <div className="text-sm font-medium">Housefinder</div>
      </Link>
      <ThemeToggle />
    </header>
  )
}

export default Header
