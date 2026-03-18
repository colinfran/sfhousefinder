"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent, type JSX } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  LISTING_ADMIN_ACCESS_STORAGE_KEY,
  LISTING_ADMIN_UNLOCK_CODE,
} from "@/lib/listing-admin-access"

const ListingsUnlockPage = (): JSX.Element => {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleUnlock = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (!LISTING_ADMIN_UNLOCK_CODE) {
      setErrorMessage("Unlock code is not configured for this app.")
      setSuccessMessage(null)
      return
    }

    if (code.trim() !== LISTING_ADMIN_UNLOCK_CODE) {
      setErrorMessage("Incorrect code.")
      setSuccessMessage(null)
      return
    }

    window.localStorage.setItem(LISTING_ADMIN_ACCESS_STORAGE_KEY, "true")
    setErrorMessage(null)
    setSuccessMessage("Access enabled on this device.")
    setCode("")
    router.push("/")
    router.refresh()
  }

  const handleRemoveAccess = (): void => {
    window.localStorage.removeItem(LISTING_ADMIN_ACCESS_STORAGE_KEY)
    setErrorMessage(null)
    setSuccessMessage("Access removed from this device.")
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Listing Access</CardTitle>
          <CardDescription>
            Enter the shared code to enable the relevance controls on this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-3" onSubmit={handleUnlock}>
            <Input
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              placeholder="Enter access code"
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <Button className="w-full" type="submit">
              Unlock
            </Button>
          </form>

          <Button className="w-full" type="button" variant="outline" onClick={handleRemoveAccess}>
            Remove Access
          </Button>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

          <p className="text-xs text-muted-foreground">
            This only hides or shows the control on this device. It is not full authentication.
          </p>

          <Link className="text-sm text-primary underline-offset-4 hover:underline" href="/">
            Back to listings
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default ListingsUnlockPage
