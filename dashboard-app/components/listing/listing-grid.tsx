import type { JSX } from "react"

import type { DashboardListing } from "@/lib/dashboard-data"

import { ListingRow } from "./listing-row"

type ListingGridProps = {
  listings: DashboardListing[]
}

const ListingGrid = ({ listings }: ListingGridProps): JSX.Element => {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
      <div className="hidden border-b border-border bg-muted/50 px-4 py-3 lg:grid lg:grid-cols-12 lg:gap-4">
        <div className="col-span-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Listing
        </div>
        <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Details
        </div>
        <div className="col-span-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Source / Found
        </div>
        <div className="col-span-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Actions
        </div>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {listings.map((listing) => (
          <ListingRow key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  )
}

export { ListingGrid }
