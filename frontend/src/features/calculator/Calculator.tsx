import type { FormEvent } from 'react'
import styles from './Calculator.module.css'
import { OperandField } from './OperandField'
import { getOperation, isOperation, OPERATIONS } from './operations'
import { ResultPanel } from './ResultPanel'
import { useCalculator } from './useCalculator'

export function Calculator() {
  const {
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
  } = useCalculator()
  const { operandLabels } = getOperation(operation)
  const isLoading = status === 'loading'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const firstInvalid = submit()
    if (firstInvalid === -1) return
    const field = event.currentTarget.elements.namedItem(`operand-${firstInvalid}`)
    if (field instanceof HTMLInputElement) field.focus()
  }

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <h1 className={styles.title}>Calculator</h1>
        <p className={styles.subtitle}>Calculations are performed by the server.</p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={isLoading}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="operation">
            Operation
          </label>
          <div className={styles.selectWrapper}>
            <select
              id="operation"
              className={styles.select}
              value={operation}
              onChange={(event) => {
                if (isOperation(event.target.value)) setOperation(event.target.value)
              }}
            >
              {OPERATIONS.map(({ id, label, symbol }) => (
                <option key={id} value={id}>
                  {label} ({symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={operandLabels.length > 1 ? styles.operandGrid : undefined}>
          {operandLabels.map((label, index) => (
            <OperandField
              key={index}
              index={index}
              label={label}
              value={operands[index] ?? ''}
              error={fieldErrors[index]}
              onChange={setOperand}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={isLoading}>
            {isLoading && <span className={styles.spinner} aria-hidden="true" />}
            {isLoading ? 'Calculating…' : 'Calculate'}
          </button>
          <button type="button" className={styles.secondary} onClick={reset}>
            Clear
          </button>
        </div>
      </form>

      <ResultPanel status={status} result={result} errorMessage={errorMessage} />
    </div>
  )
}
