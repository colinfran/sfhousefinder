import { Building2 } from "lucide-react"
import Image from "next/image"
import type { JSX } from "react"

import type { DashboardListing } from "@/lib/dashboard-data"

type ListingImageProps = {
  listing: DashboardListing
}

const ListingImage = ({ listing }: ListingImageProps): JSX.Element => {
  if (!listing.primaryImageUrl) {
    return (
      <div className="relative flex aspect-[4/3] items-center justify-center bg-[linear-gradient(135deg,hsl(var(--primary)/0.24),hsl(var(--accent)/0.28),hsl(var(--secondary)))]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.3),transparent_34%)]" />
        <div className="relative flex flex-col items-center gap-3 text-foreground/75">
          <div className="rounded-full border border-white/30 bg-white/20 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <Building2 className="size-7" />
          </div>
          <p className="text-sm font-medium">Photo unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative aspect-[4/3] overflow-hidden">
      <Image
        alt={listing.address}
        className="object-cover transition duration-500 group-hover:scale-[1.03]"
        sizes="(min-width: 1536px) 30vw, (min-width: 1024px) 45vw, (min-width: 768px) 50vw, 100vw"
        src={listing.primaryImageUrl}
        fill
      />
      <div className="listing-image-fade absolute inset-0" />
    </div>
  )
}

export { ListingImage }
