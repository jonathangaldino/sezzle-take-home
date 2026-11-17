import type { Operation } from '../../services/calculatorApi'

export interface OperationMeta {
  id: Operation
  /** Accessible name of the operation's key. */
  label: string
  symbol: string
}

export const OPERATIONS: readonly OperationMeta[] = [
  { id: 'add', label: 'Add', symbol: '+' },
  { id: 'subtract', label: 'Subtract', symbol: '−' },
  { id: 'multiply', label: 'Multiply', symbol: '×' },
  { id: 'divide', label: 'Divide', symbol: '÷' },
  { id: 'power', label: 'Power', symbol: '^' },
  { id: 'sqrt', label: 'Square root', symbol: '√' },
  { id: 'percentage', label: 'Percentage', symbol: '%' },
]

export function getOperation(id: Operation): OperationMeta {
  const meta = OPERATIONS.find((operation) => operation.id === id)
  if (!meta) throw new Error(`Unknown operation: ${id}`)
  return meta
}
