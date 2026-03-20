"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition, type JSX } from "react"
import {
  ArrowUpRight,
  EllipsisVertical,
  Map,
  NotebookPen,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
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
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
  const [notesValue, setNotesValue] = useState(listing.notes ?? "")

  useEffect(() => {
    setHasAdminAccess(window.localStorage.getItem(LISTING_ADMIN_ACCESS_STORAGE_KEY) === "true")
  }, [])

  useEffect(() => {
    setNotesValue(listing.notes ?? "")
  }, [listing.notes])

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

  const handleSaveNotes = (): void => {
    setErrorMessage(null)

    startTransition(async () => {
      try {
        const response = await fetch("/api/listings/notes", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: listing.source,
            listingId: listing.id,
            notes: notesValue,
          }),
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(payload?.error ?? "Failed to save listing notes.")
        }

        setIsNotesDialogOpen(false)
        router.refresh()
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to save listing notes.")
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
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
                onSelect={() => {
                  setErrorMessage(null)
                  setIsNotesDialogOpen(true)
                }}
              >
                {listing.notes ? "Edit Notes" : "Add Notes"}
                <NotebookPen className="ml-auto h-4 w-4" />
              </DropdownMenuItem>
            ) : null}
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

        <DialogContent>
          <DialogHeader>
            <DialogTitle>{listing.notes ? "Edit Notes" : "Add Notes"}</DialogTitle>
          </DialogHeader>

          <Textarea
            placeholder="Add anything useful here..."
            rows={6}
            value={notesValue}
            onChange={(event) => setNotesValue(event.target.value)}
          />

          <DialogFooter showCloseButton>
            <Button disabled={isPending} onClick={handleSaveNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {errorMessage ? <span className="text-[11px] text-destructive">{errorMessage}</span> : null}
    </div>
  )
}

export { ListingActionsMenu }
