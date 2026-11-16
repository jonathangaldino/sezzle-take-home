import type { CalculationResponse } from '../../services/calculatorApi'
import styles from './Calculator.module.css'
import { formatExpression, formatNumber } from './numbers'
import type { CalculatorStatus } from './useCalculator'

interface ResultPanelProps {
  status: CalculatorStatus
  result: CalculationResponse | undefined
  errorMessage: string | undefined
}

export function ResultPanel({ status, result, errorMessage }: ResultPanelProps) {
  return (
    <section className={styles.output} aria-label="Result">
      {/* Always mounted so screen readers pick up changes to it. */}
      <div aria-live="polite">
        {status === 'success' && result && (
          <>
            <p className={styles.expression}>{formatExpression(result.operation, result.operands)} =</p>
            <p className={styles.result}>
              {formatNumber(result.result)}
            </p>
          </>
        )}
        {status === 'loading' && <p className={styles.hint}>Waiting for the server…</p>}
        {status === 'idle' && <p className={styles.hint}>Enter values and press Calculate.</p>}
      </div>
      {status === 'error' && errorMessage && (
        <p role="alert" className={styles.apiError}>
          {errorMessage}
        </p>
      )}
    </section>
  )
}
