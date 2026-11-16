import styles from './Calculator.module.css'

interface OperandFieldProps {
  index: number
  label: string
  value: string
  error: string | undefined
  onChange: (index: number, value: string) => void
}

export function OperandField({ index, label, value, error, onChange }: OperandFieldProps) {
  const id = `operand-${index}`
  const errorId = `${id}-error`
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        className={styles.input}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder="0"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(index, event.target.value)}
      />
      {error && (
        <p id={errorId} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  )
}
