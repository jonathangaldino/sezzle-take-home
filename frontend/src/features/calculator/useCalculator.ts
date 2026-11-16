import { useCallback, useEffect, useRef, useState } from 'react'
import {
  calculate,
  CalculatorApiError,
  type CalculationResponse,
  type Operation,
} from '../../services/calculatorApi'
import { DEFAULT_OPERATION, getOperation } from './operations'
import { parseOperand } from './numbers'

export type CalculatorStatus = 'idle' | 'loading' | 'success' | 'error'

function emptyOperands(operation: Operation): string[] {
  return getOperation(operation).operandLabels.map(() => '')
}

export function useCalculator() {
  const [operation, setOperationState] = useState<Operation>(DEFAULT_OPERATION)
  const [operands, setOperands] = useState<string[]>(() => emptyOperands(DEFAULT_OPERATION))
  const [fieldErrors, setFieldErrors] = useState<(string | undefined)[]>([])
  const [status, setStatus] = useState<CalculatorStatus>('idle')
  const [result, setResult] = useState<CalculationResponse>()
  const [errorMessage, setErrorMessage] = useState<string>()
  // The in-flight request; aborting it also marks its eventual response as stale.
  const requestRef = useRef<AbortController>(undefined)

  const cancelRequest = useCallback(() => {
    requestRef.current?.abort()
    requestRef.current = undefined
  }, [])

  useEffect(() => cancelRequest, [cancelRequest])

  // Any edit makes the shown outcome (or the pending one) describe inputs that no longer exist.
  const clearOutcome = useCallback(() => {
    cancelRequest()
    setStatus('idle')
    setResult(undefined)
    setErrorMessage(undefined)
  }, [cancelRequest])

  const setOperation = useCallback(
    (next: Operation) => {
      const count = getOperation(next).operandLabels.length
      setOperationState(next)
      setOperands((current) => Array.from({ length: count }, (_, index) => current[index] ?? ''))
      setFieldErrors((current) => current.slice(0, count))
      clearOutcome()
    },
    [clearOutcome],
  )

  const setOperand = useCallback(
    (index: number, value: string) => {
      setOperands((current) => current.map((operand, i) => (i === index ? value : operand)))
      setFieldErrors((current) => current.map((error, i) => (i === index ? undefined : error)))
      clearOutcome()
    },
    [clearOutcome],
  )

  /** Validates and sends the request. Returns the index of the first invalid operand, or -1. */
  const submit = useCallback((): number => {
    if (requestRef.current) return -1

    const parsed = operands.map(parseOperand)
    const errors = parsed.map((entry) => (entry.ok ? undefined : entry.error))
    setFieldErrors(errors)
    const firstInvalid = errors.findIndex((error) => error !== undefined)
    if (firstInvalid !== -1) {
      clearOutcome()
      return firstInvalid
    }

    const values = parsed.flatMap((entry) => (entry.ok ? [entry.value] : []))
    const controller = new AbortController()
    requestRef.current = controller
    setStatus('loading')
    setResult(undefined)
    setErrorMessage(undefined)

    calculate({ operation, operands: values }, controller.signal).then(
      (response) => {
        if (controller.signal.aborted) return
        requestRef.current = undefined
        setResult(response)
        setStatus('success')
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        requestRef.current = undefined
        setErrorMessage(
          error instanceof CalculatorApiError ? error.message : 'Something went wrong. Please try again.',
        )
        setStatus('error')
      },
    )
    return -1
  }, [operands, operation, clearOutcome])

  const reset = useCallback(() => {
    cancelRequest()
    setOperationState(DEFAULT_OPERATION)
    setOperands(emptyOperands(DEFAULT_OPERATION))
    setFieldErrors([])
    setStatus('idle')
    setResult(undefined)
    setErrorMessage(undefined)
  }, [cancelRequest])

  return {
    operation,
    operands,
    fieldErrors,
    status,
    result,
    errorMessage,
    setOperation,
    setOperand,
    submit,
    reset,
  }
}
