"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { JSX } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DashboardFilters } from "@/lib/dashboard-data"

type FiltersProps = {
  cityOptions: string[]
  filters: DashboardFilters
}

const Filters = ({ cityOptions, filters }: FiltersProps): JSX.Element => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const sourceOptions = [
    { label: "All sources", value: "all" },
    { label: "Zillow", value: "zillow" },
    { label: "Craigslist", value: "craigslist" },
  ] as const

  const roomOptions = [
    { label: "All rooms", value: "all" },
    { label: "2 bedrooms", value: "2" },
    { label: "3+ bedrooms", value: "3plus" },
  ] as const

  const allCityOptions = ["all", ...cityOptions]

  const updateFilter = (key: "source" | "rooms" | "city", value: string): void => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === "all") {
      params.delete(key)
    } else {
      params.set(key, value)
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Select value={filters.source} onValueChange={(value) => updateFilter("source", value)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All sources" />
        </SelectTrigger>
        <SelectContent>
          {sourceOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.rooms} onValueChange={(value) => updateFilter("rooms", value)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All rooms" />
        </SelectTrigger>
        <SelectContent>
          {roomOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.city} onValueChange={(value) => updateFilter("city", value)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All cities" />
        </SelectTrigger>
        <SelectContent>
          {allCityOptions.map((city) => (
            <SelectItem key={city} value={city}>
              {city === "all" ? "All cities" : city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default Filters
