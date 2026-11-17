import { flushSync } from 'react-dom'

/**
 * Runs a state update inside a View Transition so the browser animates between the old and new UI
 * (cross-fade, plus moving elements that share a `view-transition-name`; tuned in index.css).
 * Falls back to an instant update without the API or when the user prefers reduced motion.
 */
export function withViewTransition(update: () => void) {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return
  }
  // flushSync makes React commit inside the callback, so the "new" snapshot shows the updated DOM.
  document.startViewTransition(() => flushSync(update))
}
