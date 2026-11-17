import { groupHistory, type HistoryEntry } from './history'
import { formatNumber } from './numbers'

interface HistoryPanelProps {
  id: string
  entries: readonly HistoryEntry[]
  onRecall: (result: number) => void
  onClear: () => void
}

export function HistoryPanel({ id, entries, onRecall, onClear }: HistoryPanelProps) {
  return (
    // The absolute inner box keeps the panel from growing the row: on wide screens it matches the keypad's height.
    <section id={id} aria-label="History" className="relative h-72 [view-transition-name:history] md:h-auto">
      <div className="absolute inset-0 flex flex-col rounded-2xl bg-linear-to-br from-card-from to-card-to shadow-card">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-sm font-bold">History</h2>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="rounded text-sm font-bold text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Clear
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <p className="px-5 text-sm text-muted">No calculations yet.</p>
        ) : (
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {groupHistory(entries).map((group) => (
              <div key={group.label}>
                <h3 className="px-3 pt-3 pb-1 text-xs text-muted">{group.label}</h3>
                <ul>
                  {group.entries.map((entry) => (
                    <li key={entry.id} className="border-t border-ink/10 first:border-t-0">
                      <button
                        type="button"
                        onClick={() => onRecall(entry.result)}
                        aria-label={`${entry.expression} = ${formatNumber(entry.result)}`}
                        className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-key-hover focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <span className="block text-xs break-all text-muted">{entry.expression}</span>
                        <span className="block text-xl break-all">{formatNumber(entry.result)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
