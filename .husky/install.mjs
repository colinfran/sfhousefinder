const isVercel = process.env.VERCEL === "1"
const isCi = process.env.CI === "true"
const isProduction = process.env.NODE_ENV === "production"

if (isVercel || isCi || isProduction) {
  process.exit(0)
}

try {
  const husky = (await import("husky")).default
  await husky()
} catch {
  process.exit(0)
}
