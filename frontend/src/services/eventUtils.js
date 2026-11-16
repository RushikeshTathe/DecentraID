// Pure helpers for ordering and de-duplicating blockchain activity events.
// Kept free of Vite-only imports so they can be unit-tested in plain Node.

export function activityEventKey(event) {
  const hash = event.transactionHash || event.hash || 'nohash'
  const index = event.index ?? event.logIndex ?? event.blockNumber ?? ''
  return `${hash}:${index}`
}

export function dedupeActivityEvents(events) {
  const seen = new Set()
  const unique = []

  for (const event of events) {
    const key = activityEventKey(event)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(event)
  }

  return unique
}

export function sortActivityEvents(events) {
  return [...events].sort((left, right) => {
    const blockDiff = Number(right.blockNumber) - Number(left.blockNumber)
    if (blockDiff !== 0) return blockDiff

    const leftIndex = Number(left.index ?? left.logIndex ?? 0)
    const rightIndex = Number(right.index ?? right.logIndex ?? 0)
    return rightIndex - leftIndex
  })
}

export function combineActivityEvents(events) {
  return sortActivityEvents(dedupeActivityEvents(events))
}
