import { ChevronDownIcon } from "lucide-react"
import type { JSX, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { DashboardListing } from "@/lib/dashboard-data"

import { ListingRow } from "./listing-row"

type ListingGridProps = {
  listings: DashboardListing[]
}

type ListingSectionProps = {
  children: ReactNode
  title?: string
}

const ListingSection = ({ children, title }: ListingSectionProps): JSX.Element => {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {title ? (
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
      ) : null}

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

      <div className="flex flex-col divide-y divide-border">{children}</div>
    </div>
  )
}

type CollapsibleListingSectionProps = {
  defaultOpen?: boolean
  listings: DashboardListing[]
  title: string
}

const CollapsibleListingSection = ({
  defaultOpen = false,
  listings,
  title,
}: CollapsibleListingSectionProps): JSX.Element | null => {
  if (listings.length === 0) {
    return null
  }

  return (
    <Collapsible
      className="overflow-hidden rounded-lg border border-border"
      defaultOpen={defaultOpen}
    >
      <CollapsibleTrigger asChild>
        <Button
          className="group flex h-auto w-full items-center justify-between rounded-none px-4 py-3"
          variant="ghost"
        >
          <span className="text-sm font-semibold text-foreground">
            {title} ({listings.length})
          </span>
          <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t border-border">
          <ListingSection>
            {listings.map((listing) => (
              <ListingRow key={listing.id} listing={listing} />
            ))}
          </ListingSection>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

const ListingGrid = ({ listings }: ListingGridProps): JSX.Element => {
  const relevantListings = listings.filter((listing) => listing.isActive && !listing.notRelevant)
  const notRelevantListings = listings.filter((listing) => listing.isActive && listing.notRelevant)
  const inactiveListings = listings.filter((listing) => !listing.isActive)
  const relevantTitle =
    relevantListings.length !== listings.length
      ? `Relevant (${relevantListings.length})`
      : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {relevantListings.length > 0 ? (
        <ListingSection title={relevantTitle}>
          {relevantListings.map((listing) => (
            <ListingRow key={listing.id} listing={listing} />
          ))}
        </ListingSection>
      ) : null}

      <CollapsibleListingSection listings={notRelevantListings} title="Not Relevant" />
      <CollapsibleListingSection listings={inactiveListings} title="Inactive" />
    </div>
  )
}

export { ListingGrid }
