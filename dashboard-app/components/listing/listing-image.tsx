import Image from "next/image"
import type { JSX } from "react"

import type { DashboardListing } from "@/lib/dashboard-data"

type ListingImageProps = {
  listing: DashboardListing
}

const ListingImage = ({ listing }: ListingImageProps): JSX.Element => {
  const imageSrc = listing.primaryImageUrl?.trim() ? listing.primaryImageUrl : "/placeholder.svg"

  return (
    <div className="relative aspect-[4/3] overflow-hidden">
      <Image
        alt={listing.address}
        className="object-cover transition duration-500 group-hover:scale-[1.03]"
        sizes="(min-width: 1536px) 30vw, (min-width: 1024px) 45vw, (min-width: 768px) 50vw, 100vw"
        src={imageSrc}
        fill
      />
      <div className="listing-image-fade absolute inset-0" />
    </div>
  )
}

export { ListingImage }
