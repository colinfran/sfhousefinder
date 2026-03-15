import type { JSX } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ListingErrorStateProps = {
  error: string
}

const ListingErrorState = ({ error }: ListingErrorStateProps): JSX.Element => {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-0">
      <Card className="border-destructive/20 bg-destructive/5 shadow-none">
        <CardHeader>
          <CardTitle>MongoDB connection unavailable</CardTitle>
          <CardDescription className="max-w-2xl text-base leading-7 text-muted-foreground">
            The listings page reads rental data directly on the server. Configure{" "}
            <span className="font-semibold text-foreground">MONGODB_URI</span> with a MongoDB
            connection string, then reload the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-foreground/75">{error}</CardContent>
      </Card>
    </div>
  )
}

export { ListingErrorState }
