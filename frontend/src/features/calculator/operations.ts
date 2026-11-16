import type { Operation } from '../../services/calculatorApi'

export interface OperationMeta {
  id: Operation
  label: string
  symbol: string
  /** One label per operand; its length is the operand count the backend expects. */
  operandLabels: readonly string[]
}

export const OPERATIONS: readonly OperationMeta[] = [
  { id: 'add', label: 'Add', symbol: '+', operandLabels: ['First number', 'Second number'] },
  { id: 'subtract', label: 'Subtract', symbol: '−', operandLabels: ['First number', 'Second number'] },
  { id: 'multiply', label: 'Multiply', symbol: '×', operandLabels: ['First number', 'Second number'] },
  { id: 'divide', label: 'Divide', symbol: '÷', operandLabels: ['Dividend', 'Divisor'] },
  { id: 'power', label: 'Power', symbol: '^', operandLabels: ['Base', 'Exponent'] },
  { id: 'sqrt', label: 'Square root', symbol: '√', operandLabels: ['Number'] },
  { id: 'percentage', label: 'Percentage', symbol: '%', operandLabels: ['Value', 'Percent'] },
]

export const DEFAULT_OPERATION: Operation = 'add'

export function getOperation(id: Operation): OperationMeta {
  const meta = OPERATIONS.find((operation) => operation.id === id)
  if (!meta) throw new Error(`Unknown operation: ${id}`)
  return meta
}

export function isOperation(value: string): value is Operation {
  return OPERATIONS.some((operation) => operation.id === value)
}
