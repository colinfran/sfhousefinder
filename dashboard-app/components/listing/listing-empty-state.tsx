import type { JSX } from "react"

const ListingEmptyState = (): JSX.Element => {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
      <p className="text-sm text-muted-foreground">No listings match your current filters.</p>
    </div>
  )
}

export { ListingEmptyState }
