"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition, type JSX } from "react"
import { ArrowUpRight, EllipsisVertical, Map, ThumbsDown, ThumbsUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DashboardListing } from "@/lib/dashboard-data"
import { LISTING_ADMIN_ACCESS_STORAGE_KEY } from "@/lib/listing-admin-access"

type ListingActionsMenuProps = {
  listing: DashboardListing
}

const ListingActionsMenu = ({ listing }: ListingActionsMenuProps): JSX.Element => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)

  useEffect(() => {
    setHasAdminAccess(window.localStorage.getItem(LISTING_ADMIN_ACCESS_STORAGE_KEY) === "true")
  }, [])

  const handleMarkNotRelevant = (): void => {
    setErrorMessage(null)

    startTransition(async () => {
      try {
        const response = await fetch("/api/listings/not-relevant", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: listing.source,
            listingId: listing.id,
            notRelevant: !listing.notRelevant,
          }),
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "Failed to update listing relevance.")
        }

        router.refresh()
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to update listing relevance.",
        )
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Open listing actions" className="cursor-pointer" variant="outline">
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {listing.googleMapsUrl ? (
            <DropdownMenuItem className="cursor-pointer" asChild>
              <a href={listing.googleMapsUrl} rel="noreferrer" target="_blank">
                Map
                <Map className="ml-auto h-4 w-4" />
              </a>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem className="cursor-pointer" asChild>
            <a href={listing.url} rel="noreferrer" target="_blank">
              View
              <ArrowUpRight className="ml-auto h-4 w-4" />
            </a>
          </DropdownMenuItem>
          {hasAdminAccess ? (
            <DropdownMenuItem
              className="cursor-pointer"
              disabled={isPending}
              onSelect={handleMarkNotRelevant}
            >
              {listing.notRelevant ? "Relevant" : "Not Relevant"}
              {listing.notRelevant ? (
                <ThumbsUp className="ml-auto h-4 w-4" />
              ) : (
                <ThumbsDown className="ml-auto h-4 w-4" />
              )}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {errorMessage ? <span className="text-[11px] text-destructive">{errorMessage}</span> : null}
    </div>
  )
}

export { ListingActionsMenu }
