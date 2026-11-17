import type { Operation } from '../../services/calculatorApi'
import { getOperation } from './operations'

// 15 is the most decimal digits float64 always round-trips: hides 0.1 + 0.2 noise without
// misrepresenting inputs (12 showed 1.0000000000001 + 1 as "1 + 1 = 2").
const SIGNIFICANT_DIGITS = 15

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
