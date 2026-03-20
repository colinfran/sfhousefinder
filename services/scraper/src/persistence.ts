export type PersistenceSummary = {
  persisted: boolean
  matchedCount: number
  modifiedCount: number
  upsertedCount: number
  deactivatedCount: number
  skippedDeactivation: boolean
  skipReason: string | null
}

export const emptyPersistenceSummary = (
  skipReason: string,
  skippedDeactivation = true,
): PersistenceSummary => ({
  persisted: false,
  matchedCount: 0,
  modifiedCount: 0,
  upsertedCount: 0,
  deactivatedCount: 0,
  skippedDeactivation,
  skipReason,
})
