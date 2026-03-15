import Link from "next/link"
import type { JSX } from "react"

import type { DashboardFilters } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

import { buildQueryString } from "./listing/listing-utils"

type FiltersProps = {
  cityOptions: string[]
  filters: DashboardFilters
}

const Filters = ({ cityOptions, filters }: FiltersProps): JSX.Element => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        className={cn(
          "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
          filters.city === "all"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:text-foreground",
        )}
        href={buildQueryString(filters, { city: "all" })}
      >
        All cities
      </Link>
      {cityOptions.map((city) => (
        <Link
          className={cn(
            "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            filters.city === city
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
          href={buildQueryString(filters, { city })}
          key={city}
        >
          {city}
        </Link>
      ))}
    </div>
  )
}

export default Filters
