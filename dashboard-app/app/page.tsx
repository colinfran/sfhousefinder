import type { JSX } from "react"

import { ListingEmptyState, ListingErrorState, ListingGrid } from "@/components/listing"
import { getDashboardData, parseDashboardFilters } from "@/lib/dashboard-data"
import Filters from "@/components/filters"
import { formatTimestamp } from "@/components/listing/listing-utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const HomePage = async ({ searchParams }: PageProps): Promise<JSX.Element> => {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const filters = parseDashboardFilters(resolvedSearchParams)
  const { data, error } = await getDashboardData(filters)

  if (error) {
    return <ListingErrorState error={error} />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 py-4 sm:px-6 sm:py-0">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Last refresh {formatTimestamp(data.summary.latestSeenAt)}
          </p>
        </div>
        <Filters cityOptions={data.cityOptions} filters={filters} />
      </div>

      {data.listings.length === 0 ? (
        <ListingEmptyState />
      ) : (
        <ListingGrid listings={data.listings} />
      )}
    </div>
  )
}

export default HomePage
