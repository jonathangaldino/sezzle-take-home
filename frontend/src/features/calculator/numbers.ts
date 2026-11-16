import type { Operation } from '../../services/calculatorApi'
import { getOperation } from './operations'

export type ParsedOperand = { ok: true; value: number } | { ok: false; error: string }

// Plain decimal with optional sign and exponent. Rejects "1e", "1,5", "Infinity", "NaN", hex, etc.
const DECIMAL_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i

export function parseOperand(raw: string): ParsedOperand {
  const text = raw.trim()
  if (text === '') return { ok: false, error: 'Enter a number.' }
  if (!DECIMAL_PATTERN.test(text)) return { ok: false, error: 'Enter a valid number, like 42 or -3.5.' }
  const value = Number(text)
  if (!Number.isFinite(value)) return { ok: false, error: 'This number is too large.' }
  return { ok: true, value }
}

const SIGNIFICANT_DIGITS = 12

// Presentation only: rounds the backend's value for display (0.30000000000000004 -> 0.3); never computes.
export function formatNumber(value: number): string {
  const magnitude = Math.abs(value)
  if (magnitude !== 0 && (magnitude >= 1e12 || magnitude < 1e-6)) {
    const [mantissa, exponent] = value.toExponential(SIGNIFICANT_DIGITS - 1).split('e')
    return `${mantissa.replace(/\.?0+$/, '')}e${exponent}`
  }
  // String(-0) is "0", so negative zero needs no special case.
  return String(Number(value.toPrecision(SIGNIFICANT_DIGITS)))
}

function formatOperand(value: number): string {
  const text = formatNumber(value)
  return value < 0 ? `(${text})` : text
}

export function formatExpression(operation: Operation, operands: readonly number[]): string {
  const { symbol } = getOperation(operation)
  const [first = 0, second = 0] = operands
  if (operation === 'sqrt') return `${symbol}${formatOperand(first)}`
  if (operation === 'percentage') return `${formatNumber(second)}% of ${formatNumber(first)}`
  return `${formatOperand(first)} ${symbol} ${formatOperand(second)}`
}
