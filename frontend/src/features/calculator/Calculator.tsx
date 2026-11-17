import { useEffect, useState } from 'react'
import { ThemeToggle } from '../theme/ThemeToggle'
import { withViewTransition } from '../../viewTransition'
import { HistoryPanel } from './HistoryPanel'
import { getOperation } from './operations'
import { type BinaryOperation, useCalculator } from './useCalculator'

interface Key {
  label: string
  /** Accessible name when the label is a symbol. */
  name?: string
  onPress: () => void
  className?: string
}

const KEYBOARD_OPERATIONS: Record<string, BinaryOperation> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '^': 'power',
  '%': 'percentage',
}

export function Calculator() {
  const calculator = useCalculator()
  const { display, expression, status, errorMessage } = calculator
  const { inputDigit, deleteLast, toggleSign, chooseOperation, squareRoot, equals, clear } = calculator
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const { key } = event
      if (/^[0-9.]$/.test(key)) inputDigit(key)
      else if (key in KEYBOARD_OPERATIONS) chooseOperation(KEYBOARD_OPERATIONS[key])
      else if (key === 'Enter' || key === '=') equals()
      else if (key === 'Backspace') deleteLast()
      else if (key === 'Escape') clear()
      else return
      // Stops Enter from also clicking a focused key, and "/" from opening Firefox's quick find.
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const digit = (value: string): Key => ({ label: value, onPress: () => inputDigit(value) })
  const operation = (id: BinaryOperation): Key => {
    const { symbol, label } = getOperation(id)
    return { label: symbol, name: label, onPress: () => chooseOperation(id) }
  }

  const keys: Key[] = [
    { label: 'AC', name: 'All clear', onPress: clear },
    { label: 'DEL', name: 'Delete', onPress: deleteLast },
    operation('percentage'),
    operation('divide'),
    { label: '√', name: 'Square root', onPress: squareRoot },
    operation('power'),
    { label: '±', name: 'Toggle sign', onPress: toggleSign },
    operation('multiply'),
    digit('7'),
    digit('8'),
    digit('9'),
    operation('subtract'),
    digit('4'),
    digit('5'),
    digit('6'),
    operation('add'),
    digit('1'),
    digit('2'),
    digit('3'),
    {
      label: '=',
      name: 'Equals',
      onPress: equals,
      className: 'row-span-2 bg-accent text-white hover:brightness-110',
    },
    { ...digit('0'), className: 'col-span-2 bg-key text-ink hover:bg-key-hover' },
    { ...digit('.'), name: 'Decimal point' },
  ]

  return (
    <div
      className={`grid w-full gap-6 ${historyOpen ? 'max-w-sm md:max-w-[41.5rem] md:grid-cols-[16rem_1fr]' : 'max-w-sm'}`}
    >
      {historyOpen && (
        <HistoryPanel
          id="calculator-history"
          entries={calculator.history}
          onRecall={calculator.recall}
          onClear={calculator.clearHistory}
        />
      )}
      <div
        className="rounded-2xl bg-linear-to-br from-card-from to-card-to p-6 shadow-card [view-transition-name:calculator] sm:p-8"
        aria-busy={status === 'loading'}
      >
        <h1 className="sr-only">Calculator</h1>
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="History"
            aria-expanded={historyOpen}
            aria-controls="calculator-history"
            // The panel slides in while the keypad glides aside (see ::view-transition rules in index.css).
            onClick={() => withViewTransition(() => setHistoryOpen((open) => !open))}
            className={`grid size-9 place-items-center rounded-full bg-track shadow-[inset_1px_2px_4px_rgb(0_0_0/0.15)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${historyOpen ? 'text-accent-text' : 'text-muted'}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              // Winds the clock back a full turn on open, forward on close.
              className={`size-4 transition-transform duration-500 ease-out motion-reduce:transition-none ${historyOpen ? '-rotate-360' : ''}`}
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5M12 7v5l4 2" />
            </svg>
          </button>
          <ThemeToggle />
        </div>

        <section
          aria-label="Result"
          className="flex min-h-24 flex-col items-end justify-end gap-1 px-1 pb-6 text-right"
        >
          <p className="min-h-5 text-sm break-all text-muted">{expression}</p>
          {status === 'error' ? (
            <p role="alert" className="text-base text-danger">
              {errorMessage}
            </p>
          ) : (
            <output
              className={`break-all transition-opacity ${display.length > 10 ? 'text-2xl' : 'text-4xl'} ${status === 'loading' ? 'opacity-40' : ''}`}
            >
              {display}
            </output>
          )}
        </section>

        <div className="grid auto-rows-[3.75rem] grid-cols-4 gap-3 sm:gap-4">
          {keys.map(({ label, name, onPress, className = 'bg-key text-ink hover:bg-key-hover' }) => (
            <button
              key={label}
              type="button"
              aria-label={name}
              onClick={onPress}
              className={`rounded-lg text-lg font-bold shadow-key transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px active:shadow-key-pressed ${className}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
