import { ArrowUpRight, Bath, BedDouble, MapPin } from "lucide-react"
import type { JSX } from "react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import type { DashboardListing } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

import { ListingImage } from "./listing-image"
import { formatCurrency, formatHomeType, formatSource, formatTimestamp } from "./listing-utils"

type ListingRowProps = {
  listing: DashboardListing
}

const ListingRow = ({ listing }: ListingRowProps): JSX.Element => {
  const isCraigslist = listing.source.toLowerCase() === "craigslist"
  const primaryLabel = isCraigslist ? (listing.title ?? listing.address) : listing.address
  const locationLabel = isCraigslist ? (listing.location ?? listing.address) : listing.city

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/30 lg:grid lg:grid-cols-12 lg:items-center lg:gap-4",
        !listing.isActive && "opacity-60",
      )}
    >
      <div className="col-span-5 flex min-w-0 gap-3 overflow-hidden">
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
          <ListingImage listing={listing} />
        </div>

        <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
          <a
            className="truncate text-sm font-medium text-foreground underline-offset-2 hover:underline"
            href={listing.url}
            rel="noopener noreferrer"
            target="_blank"
            title={primaryLabel}
          >
            {primaryLabel}
          </a>

          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {locationLabel}
          </span>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge
              className={
                listing.isActive
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : undefined
              }
              variant={listing.isActive ? "secondary" : "outline"}
            >
              {listing.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline">{formatHomeType(listing.homeType)}</Badge>
          </div>
        </div>
      </div>

      <div className="col-span-2 flex flex-wrap items-center gap-3 lg:flex-col lg:items-start lg:gap-1">
        <span className="text-sm font-medium text-foreground">{formatCurrency(listing.price)}</span>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" />
            {listing.beds ?? "-"} bd
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath className="h-3.5 w-3.5" />
            {listing.baths ?? "-"} ba
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <Badge variant="outline">{formatSource(listing.source)}</Badge>
          <span className="truncate text-xs text-muted-foreground">
            {formatTimestamp(listing.lastSeenAt)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {listing.googleMapsUrl ? (
            <a
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={listing.googleMapsUrl}
              rel="noreferrer"
              target="_blank"
            >
              Map
            </a>
          ) : null}
          <a
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
            href={listing.url}
            rel="noreferrer"
            target="_blank"
          >
            View
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="col-span-1 hidden lg:block">
        <Badge variant="outline">{formatSource(listing.source)}</Badge>
      </div>

      <div className="col-span-2 hidden lg:block">
        <span className="text-xs text-muted-foreground">{formatTimestamp(listing.lastSeenAt)}</span>
      </div>

      <div className="col-span-2 hidden items-center gap-2 lg:flex lg:justify-end">
        {listing.googleMapsUrl ? (
          <a
            className={buttonVariants({ size: "sm", variant: "outline" })}
            href={listing.googleMapsUrl}
            rel="noreferrer"
            target="_blank"
          >
            Map
          </a>
        ) : null}
        <a
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
          href={listing.url}
          rel="noreferrer"
          target="_blank"
        >
          View
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}

export { ListingRow }
