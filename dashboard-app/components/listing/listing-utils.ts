import type { DashboardFilters } from "@/lib/dashboard-data"

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
  timeZoneName: "short",
})

export const formatCurrency = (value: number | null): string => {
  if (value === null) {
    return "N/A"
  }

  return currencyFormatter.format(value)
}

export const formatTimestamp = (value: string | null): string => {
  if (!value) {
    return "Unknown"
  }

  return dateTimeFormatter.format(new Date(value))
}

export const formatHomeType = (value: string): string =>
  value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")

export const buildQueryString = (
  filters: DashboardFilters,
  overrides: Partial<DashboardFilters>,
): string => {
  const nextFilters = {
    ...filters,
    ...overrides,
  }

  const params = new URLSearchParams()

  if (nextFilters.city !== "all") {
    params.set("city", nextFilters.city)
  }

  if (nextFilters.rooms !== "all") {
    params.set("rooms", nextFilters.rooms)
  }

  if (nextFilters.source !== "all") {
    params.set("source", nextFilters.source)
  }

  const queryString = params.toString()
  return queryString ? `/?${queryString}` : "/"
}
