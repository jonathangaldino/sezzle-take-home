import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  calculate,
  CalculatorApiError,
  type CalculationRequest,
  type CalculationResponse,
} from '../../services/calculatorApi'
import { Calculator } from './Calculator'

vi.mock('../../services/calculatorApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/calculatorApi')>()),
  calculate: vi.fn(),
}))

const calculateMock = vi.mocked(calculate)

afterEach(() => {
  calculateMock.mockReset()
})

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (reason: unknown) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function respondWith(result: number) {
  calculateMock.mockImplementation(async (request: CalculationRequest): Promise<CalculationResponse> => ({
    ...request,
    result,
  }))
}

function setup() {
  const user = userEvent.setup()
  render(<Calculator />)
  return {
    user,
    operation: () => screen.getByRole('combobox', { name: 'Operation' }),
    calculateButton: () => screen.getByRole('button', { name: /calculat/i }),
    clearButton: () => screen.getByRole('button', { name: 'Clear' }),
  }
}

describe('Calculator', () => {
  it('renders the initial form', () => {
    const { operation, calculateButton } = setup()

    expect(screen.getByRole('heading', { name: 'Calculator' })).toBeInTheDocument()
    expect(operation()).toHaveValue('add')
    expect(screen.getByLabelText('First number')).toHaveValue('')
    expect(screen.getByLabelText('Second number')).toHaveValue('')
    expect(calculateButton()).toBeEnabled()
    expect(screen.getByText('Enter values and press Calculate.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('updates operand labels when the operation changes', async () => {
    const { user, operation } = setup()

    await user.selectOptions(operation(), 'percentage')

    expect(screen.getByLabelText('Value')).toBeInTheDocument()
    expect(screen.getByLabelText('Percent')).toBeInTheDocument()
  })

  it('shows one field for square root, keeping the first value, and restores two afterwards', async () => {
    const { user, operation } = setup()
    await user.type(screen.getByLabelText('First number'), '16')
    await user.type(screen.getByLabelText('Second number'), '4')

    await user.selectOptions(operation(), 'sqrt')

    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getByLabelText('Number')).toHaveValue('16')

    await user.selectOptions(operation(), 'multiply')

    expect(screen.getAllByRole('textbox')).toHaveLength(2)
    expect(screen.getByLabelText('First number')).toHaveValue('16')
    expect(screen.getByLabelText('Second number')).toHaveValue('')
  })

  it('sends the operation and parsed operands, then shows the backend result with its expression', async () => {
    respondWith(2.5)
    const { user, operation, calculateButton } = setup()

    await user.selectOptions(operation(), 'divide')
    await user.type(screen.getByLabelText('Dividend'), '10')
    await user.type(screen.getByLabelText('Divisor'), '4')
    await user.click(calculateButton())

    expect(calculateMock).toHaveBeenCalledWith({ operation: 'divide', operands: [10, 4] }, expect.any(AbortSignal))
    expect(await screen.findByText('2.5')).toBeInTheDocument()
    expect(screen.getByText('10 ÷ 4 =')).toBeInTheDocument()
  })

  it('submits square root with a single operand', async () => {
    respondWith(3)
    const { user, operation, calculateButton } = setup()

    await user.selectOptions(operation(), 'sqrt')
    await user.type(screen.getByLabelText('Number'), '9')
    await user.click(calculateButton())

    expect(calculateMock).toHaveBeenCalledWith({ operation: 'sqrt', operands: [9] }, expect.any(AbortSignal))
    expect(await screen.findByText('√9 =')).toBeInTheDocument()
  })

  it('formats the displayed result without recomputing it', async () => {
    respondWith(0.30000000000000004)
    const { user } = setup()

    await user.type(screen.getByLabelText('First number'), '0.1')
    await user.type(screen.getByLabelText('Second number'), '0.2{Enter}')

    expect(await screen.findByText('0.3')).toBeInTheDocument()
  })

  it('submits when Enter is pressed in a field', async () => {
    respondWith(15)
    const { user } = setup()

    await user.type(screen.getByLabelText('First number'), '10')
    await user.type(screen.getByLabelText('Second number'), '5{Enter}')

    expect(calculateMock).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('15')).toBeInTheDocument()
  })

  it('validates empty and non-numeric input without calling the API', async () => {
    const { user, calculateButton } = setup()
    const first = screen.getByLabelText('First number')
    const second = screen.getByLabelText('Second number')

    await user.type(second, 'abc')
    await user.click(calculateButton())

    expect(calculateMock).not.toHaveBeenCalled()
    expect(first).toHaveAttribute('aria-invalid', 'true')
    expect(first).toHaveAccessibleDescription('Enter a number.')
    expect(second).toHaveAttribute('aria-invalid', 'true')
    expect(second).toHaveAccessibleDescription(/valid number/)
    expect(first).toHaveFocus()
  })

  it.each(['1e', '1,5', 'Infinity', 'NaN', '   '])('rejects %j as an operand', async (value) => {
    const { user, calculateButton } = setup()

    await user.type(screen.getByLabelText('First number'), value)
    await user.type(screen.getByLabelText('Second number'), '1')
    await user.click(calculateButton())

    expect(calculateMock).not.toHaveBeenCalled()
    expect(screen.getByLabelText('First number')).toHaveAttribute('aria-invalid', 'true')
  })

  it('clears a field error once that field is edited', async () => {
    const { user, calculateButton } = setup()
    const first = screen.getByLabelText('First number')

    await user.click(calculateButton())
    expect(first).toHaveAttribute('aria-invalid', 'true')

    await user.type(first, '1')

    expect(first).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText('Second number')).toHaveAttribute('aria-invalid', 'true')
  })

  it('leaves math rules such as division by zero to the backend', async () => {
    calculateMock.mockRejectedValue(
      new CalculatorApiError('api', 'Cannot divide by zero', { code: 'DIVISION_BY_ZERO', status: 422 }),
    )
    const { user, operation, calculateButton } = setup()

    await user.selectOptions(operation(), 'divide')
    await user.type(screen.getByLabelText('Dividend'), '1')
    await user.type(screen.getByLabelText('Divisor'), '0')
    await user.click(calculateButton())

    expect(calculateMock).toHaveBeenCalledWith({ operation: 'divide', operands: [1, 0] }, expect.any(AbortSignal))
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot divide by zero')
  })

  it('shows a network failure message', async () => {
    calculateMock.mockRejectedValue(
      new CalculatorApiError('network', 'Could not reach the calculator service. Check your connection and try again.'),
    )
    const { user } = setup()

    await user.type(screen.getByLabelText('First number'), '1')
    await user.type(screen.getByLabelText('Second number'), '2{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the calculator service/i)
  })

  it('shows a generic message for unknown errors', async () => {
    calculateMock.mockRejectedValue(new Error('boom'))
    const { user } = setup()

    await user.type(screen.getByLabelText('First number'), '1')
    await user.type(screen.getByLabelText('Second number'), '2{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
  })

  it('shows a loading state and blocks double submission while a request is in flight', async () => {
    const pending = deferred<CalculationResponse>()
    calculateMock.mockReturnValue(pending.promise)
    const { user, calculateButton } = setup()

    await user.type(screen.getByLabelText('First number'), '10')
    await user.type(screen.getByLabelText('Second number'), '5')
    await user.click(calculateButton())

    expect(calculateButton()).toBeDisabled()
    expect(calculateButton()).toHaveTextContent('Calculating…')

    await user.click(calculateButton())
    await user.type(screen.getByLabelText('Second number'), '{Enter}')
    expect(calculateMock).toHaveBeenCalledTimes(1)

    pending.resolve({ operation: 'add', operands: [10, 5], result: 15 })

    expect(await screen.findByText('15')).toBeInTheDocument()
    expect(calculateButton()).toBeEnabled()
    expect(calculateButton()).toHaveTextContent('Calculate')
  })

  it('clears a stale result when an input changes', async () => {
    respondWith(15)
    const { user } = setup()

    await user.type(screen.getByLabelText('First number'), '10')
    await user.type(screen.getByLabelText('Second number'), '5{Enter}')
    expect(await screen.findByText('15')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Second number'), '0')

    expect(screen.queryByText('15')).not.toBeInTheDocument()
  })

  it('clears a stale error when the operation changes', async () => {
    calculateMock.mockRejectedValue(new CalculatorApiError('api', 'Cannot divide by zero'))
    const { user, operation } = setup()

    await user.type(screen.getByLabelText('First number'), '1')
    await user.type(screen.getByLabelText('Second number'), '0{Enter}')
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.selectOptions(operation(), 'multiply')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('resets the form, result and errors with Clear', async () => {
    respondWith(9)
    const { user, operation, clearButton } = setup()

    await user.selectOptions(operation(), 'power')
    await user.type(screen.getByLabelText('Base'), '3')
    await user.type(screen.getByLabelText('Exponent'), '2{Enter}')
    expect(await screen.findByText('9')).toBeInTheDocument()

    await user.click(clearButton())

    expect(operation()).toHaveValue('add')
    expect(screen.getByLabelText('First number')).toHaveValue('')
    expect(screen.getByLabelText('Second number')).toHaveValue('')
    expect(screen.queryByText('9')).not.toBeInTheDocument()
    expect(screen.getByText('Enter values and press Calculate.')).toBeInTheDocument()
  })

  it('ignores a response that arrives after Clear', async () => {
    const pending = deferred<CalculationResponse>()
    calculateMock.mockReturnValue(pending.promise)
    const { user, clearButton, calculateButton } = setup()

    await user.type(screen.getByLabelText('First number'), '10')
    await user.type(screen.getByLabelText('Second number'), '5{Enter}')
    const signal = calculateMock.mock.calls[0]?.[1]

    await user.click(clearButton())
    expect(signal?.aborted).toBe(true)
    expect(calculateButton()).toBeEnabled()

    await act(async () => pending.resolve({ operation: 'add', operands: [10, 5], result: 15 }))
    expect(screen.getByText('Enter values and press Calculate.')).toBeInTheDocument()
    expect(screen.queryByText('15')).not.toBeInTheDocument()
  })

  it('ignores a failure that arrives after the inputs changed', async () => {
    const pending = deferred<CalculationResponse>()
    calculateMock.mockReturnValue(pending.promise)
    const { user } = setup()

    await user.type(screen.getByLabelText('First number'), '10')
    await user.type(screen.getByLabelText('Second number'), '5{Enter}')
    await user.type(screen.getByLabelText('Second number'), '0')

    await act(async () => pending.reject(new CalculatorApiError('network', 'Could not reach the calculator service.')))
    expect(screen.getByRole('button', { name: 'Calculate' })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
