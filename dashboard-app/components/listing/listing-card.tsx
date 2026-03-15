import { ArrowUpRight, Bath, BedDouble, MapPin } from "lucide-react"
import type { JSX } from "react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { DashboardListing } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

import { formatCurrency, formatHomeType, formatTimestamp } from "./listing-utils"
import { ListingImage } from "./listing-image"

type ListingCardProps = {
  listing: DashboardListing
}

const ListingCard = ({ listing }: ListingCardProps): JSX.Element => {
  const isCraigslist = listing.source.toLowerCase() === "craigslist"
  const primaryLabel = isCraigslist ? (listing.title ?? listing.address) : listing.address
  const locationLabel = isCraigslist ? (listing.location ?? listing.address) : listing.city

  return (
    <Card
      className={cn(
        "group listing-shell overflow-hidden border-border/70 pb-2 shadow-[0_22px_55px_-40px_rgba(15,23,42,0.65)] transition duration-200 hover:-translate-y-0.5",
        !listing.isActive && "opacity-60",
      )}
    >
      <div className="relative overflow-hidden rounded-b-[1.25rem]">
        <ListingImage listing={listing} />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
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
          <Badge className="capitalize backdrop-blur" variant="outline">
            {listing.source}
          </Badge>
          <Badge className="backdrop-blur" variant="outline">
            {formatHomeType(listing.homeType)}
          </Badge>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <p className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
            {listing.price === null ? "Contact for price" : formatCurrency(listing.price)}
          </p>
        </div>
      </div>

      <CardContent className="space-y-5 p-5 pt-5">
        <div className="space-y-2">
          <h2 className="line-clamp-2 font-[family-name:var(--font-display)] text-2xl leading-tight">
            {primaryLabel}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" />
              {locationLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="size-4" />
              {listing.beds ?? "-"} bd
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Bath className="size-4" />
              {listing.baths ?? "-"} ba
            </span>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-border/70 bg-background/65 px-4 py-3 text-sm text-muted-foreground">
          Last seen {formatTimestamp(listing.lastSeenAt)}
        </div>

        <div className="flex gap-3">
          <a
            className={cn(buttonVariants({ variant: "default" }), "flex-1")}
            href={listing.url}
            rel="noreferrer"
            target="_blank"
          >
            View listing
            <ArrowUpRight className="size-4" />
          </a>
          {listing.googleMapsUrl ? (
            <a
              className={buttonVariants({ variant: "outline" })}
              href={listing.googleMapsUrl}
              rel="noreferrer"
              target="_blank"
            >
              Map
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export { ListingCard }
