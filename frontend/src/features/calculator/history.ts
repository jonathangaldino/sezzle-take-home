export interface HistoryEntry {
  id: string
  /** Already formatted, e.g. "12 × 3.5". */
  expression: string
  result: number
  /** Epoch milliseconds. */
  at: number
}

const STORAGE_KEY = 'calculator-history'
export const MAX_HISTORY = 50

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    typeof entry.expression === 'string' &&
    typeof entry.result === 'number' &&
    Number.isFinite(entry.result) &&
    typeof entry.at === 'number'
  )
}

/** Reads saved history, dropping anything malformed (storage is user-editable). */
export function loadHistory(): HistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, MAX_HISTORY) : []
  } catch {
    return []
  }
}

export function saveHistory(entries: readonly HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage blocked or full: history still works for this session.
  }
}

const DAY = 24 * 60 * 60 * 1000

/** Groups newest-first entries into "Today", "Previous 7 Days" and "Older", skipping empty groups. */
export function groupHistory(entries: readonly HistoryEntry[], now = Date.now()) {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  const groups: { label: string; entries: HistoryEntry[] }[] = [
    { label: 'Today', entries: [] },
    { label: 'Previous 7 Days', entries: [] },
    { label: 'Older', entries: [] },
  ]
  for (const entry of entries) {
    const index = entry.at >= startOfToday ? 0 : entry.at >= startOfToday - 7 * DAY ? 1 : 2
    groups[index].entries.push(entry)
  }
  return groups.filter((group) => group.entries.length > 0)
}
