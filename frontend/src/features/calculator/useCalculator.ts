import { useEffect, useRef, useState } from 'react'
import {
  calculate,
  CalculatorApiError,
  type CalculationRequest,
  type CalculationResponse,
  type Operation,
} from '../../services/calculatorApi'
import { type HistoryEntry, loadHistory, MAX_HISTORY, saveHistory } from './history'
import { formatExpression, formatNumber } from './numbers'
import { getOperation } from './operations'

export type BinaryOperation = Exclude<Operation, 'sqrt'>
export type CalculatorStatus = 'idle' | 'loading' | 'error'

interface CalculatorState {
  /** The number in the display: raw keypad text while typing, otherwise String() of a full-precision value. */
  entry: string
  /** Whether the next digit appends to `entry` rather than starting a new number. */
  typing: boolean
  /** First operand of `pending`. */
  left: number | undefined
  pending: BinaryOperation | undefined
  /** Secondary display line, e.g. "12 ×" or "12 × 3.5 =". */
  expression: string
  status: CalculatorStatus
  errorMessage: string | undefined
}

const INITIAL_STATE: CalculatorState = {
  entry: '0',
  typing: false,
  left: undefined,
  pending: undefined,
  expression: '',
  status: 'idle',
  errorMessage: undefined,
}

// Matches the significant digits formatNumber keeps, so typed numbers display exactly.
export const MAX_DIGITS = 15

export function useCalculator() {
  // The ref is the source of truth: fast typing can fire several keys before React re-renders,
  // and each key must see the previous key's effect. `rendered` only mirrors it for display.
  const stateRef = useRef(INITIAL_STATE)
  const [rendered, setRendered] = useState(INITIAL_STATE)
  // The in-flight request; aborting it also marks its eventual response as stale.
  const requestRef = useRef<AbortController>(undefined)
  // Every key except AC is ignored while the backend is computing.
  const busy = () => requestRef.current !== undefined

  // Client-side only; the backend keeps no history.
  const [history, setHistory] = useState(loadHistory)

  useEffect(() => () => requestRef.current?.abort(), [])
  useEffect(() => saveHistory(history), [history])

  function commit(next: CalculatorState) {
    stateRef.current = next
    setRendered(next)
  }

  /** Applies a key's effect; any key also dismisses a shown error. */
  function update(patch: Partial<CalculatorState>) {
    commit({ ...stateRef.current, status: 'idle', errorMessage: undefined, ...patch })
  }

  function send(request: CalculationRequest, next: (response: CalculationResponse) => Partial<CalculatorState>) {
    const controller = new AbortController()
    requestRef.current = controller
    update({ status: 'loading' })

    calculate(request, controller.signal).then(
      (response) => {
        if (controller.signal.aborted) return
        requestRef.current = undefined
        update(next(response))
        const entry: HistoryEntry = {
          id: crypto.randomUUID(),
          expression: formatExpression(response.operation, response.operands),
          result: response.result,
          at: Date.now(),
        }
        setHistory((previous) => [entry, ...previous].slice(0, MAX_HISTORY))
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        requestRef.current = undefined
        commit({
          ...INITIAL_STATE,
          status: 'error',
          errorMessage:
            error instanceof CalculatorApiError ? error.message : 'Something went wrong. Please try again.',
        })
      },
    )
  }

  /** Appends a digit or "." to the number being typed. */
  function inputDigit(key: string) {
    if (busy()) return
    const state = stateRef.current
    const current = state.typing ? state.entry : '0'
    let entry: string
    if (key === '.') {
      if (current.includes('.')) return
      entry = `${current}.`
    } else if (current === '0' || current === '-0') {
      entry = current.replace('0', key)
    } else if (current.replace(/[-.]/g, '').length >= MAX_DIGITS) {
      return
    } else {
      entry = current + key
    }
    // A digit after "=" starts a new calculation, so the old expression no longer applies.
    update({ entry, typing: true, expression: state.typing || state.pending ? state.expression : '' })
  }

  function deleteLast() {
    const { typing, entry } = stateRef.current
    if (busy() || !typing) return
    const shorter = entry.slice(0, -1)
    update({ entry: shorter === '' || shorter === '-' ? '0' : shorter })
  }

  function toggleSign() {
    if (busy()) return
    const { entry, typing } = stateRef.current
    update({
      entry: entry.startsWith('-') ? entry.slice(1) : `-${entry}`,
      // "±" on a fresh 0 begins a negative number, so the digits that follow must keep the sign.
      typing: typing || Number(entry) === 0,
    })
  }

  function chooseOperation(operation: BinaryOperation) {
    if (busy()) return
    const { pending, left, typing, entry } = stateRef.current
    const { symbol } = getOperation(operation)
    const pendingAfter = (value: number) => ({
      left: value,
      pending: operation,
      typing: false,
      expression: `${formatNumber(value)} ${symbol}`,
    })

    // Chain left to right: "2 + 3 ×" first asks the backend for 2 + 3.
    if (pending && left !== undefined && typing) {
      send({ operation: pending, operands: [left, Number(entry)] }, (response) => ({
        entry: String(response.result),
        ...pendingAfter(response.result),
      }))
    } else {
      // Otherwise start (or replace) the pending operation with the displayed number.
      update(pendingAfter(Number(entry)))
    }
  }

  function squareRoot() {
    if (busy()) return
    const { entry, pending, expression } = stateRef.current
    send({ operation: 'sqrt', operands: [Number(entry)] }, (response) => ({
      entry: String(response.result),
      typing: false,
      // Inside "9 + √16" keep showing "9 +"; on its own, show "√16 =".
      expression: pending ? expression : `${formatExpression('sqrt', response.operands)} =`,
    }))
  }

  function equals() {
    const { pending, left, entry } = stateRef.current
    if (busy() || !pending || left === undefined) return
    send({ operation: pending, operands: [left, Number(entry)] }, (response) => ({
      entry: String(response.result),
      typing: false,
      left: undefined,
      pending: undefined,
      expression: `${formatExpression(response.operation, response.operands)} =`,
    }))
  }

  /** Puts a past result in the display, usable as the next operand. */
  function recall(result: number) {
    if (busy()) return
    const { pending, expression } = stateRef.current
    update({ entry: String(result), typing: false, expression: pending ? expression : '' })
  }

  function clear() {
    requestRef.current?.abort()
    requestRef.current = undefined
    commit(INITIAL_STATE)
  }

  return {
    // Typed text is shown as typed (keeps "5."); computed values are rounded for display.
    display: rendered.typing ? rendered.entry : formatNumber(Number(rendered.entry)),
    expression: rendered.expression,
    status: rendered.status,
    errorMessage: rendered.errorMessage,
    inputDigit,
    deleteLast,
    toggleSign,
    chooseOperation,
    squareRoot,
    equals,
    clear,
    history,
    recall,
    clearHistory: () => setHistory([]),
  }
}
