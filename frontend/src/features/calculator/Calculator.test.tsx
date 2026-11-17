import { act, cleanup, render, screen } from '@testing-library/react'
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
  localStorage.clear()
})

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function respondWith(...results: number[]) {
  for (const result of results) {
    calculateMock.mockImplementationOnce(
      async (request: CalculationRequest): Promise<CalculationResponse> => ({ ...request, result }),
    )
  }
}

function requests() {
  return calculateMock.mock.calls.map(([request]) => request)
}

function setup() {
  const user = userEvent.setup()
  render(<Calculator />)
  return {
    user,
    /** Clicks keys by accessible name, e.g. press('1', '2', 'Add'). */
    press: async (...names: string[]) => {
      for (const name of names) await user.click(screen.getByRole('button', { name }))
    },
    display: () => screen.getByRole('status'),
    region: () => screen.getByRole('region', { name: 'Result' }),
  }
}

describe('Calculator', () => {
  it('starts at 0 with every key available', () => {
    const { display } = setup()

    expect(screen.getByRole('heading', { name: 'Calculator' })).toBeInTheDocument()
    expect(display()).toHaveTextContent(/^0$/)
    // 22 keypad keys plus the history toggle.
    expect(screen.getAllByRole('button')).toHaveLength(23)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  describe('entering a number', () => {
    it('builds the number from digits and one decimal point', async () => {
      const { press, display } = setup()
      await press('0', '1', '2', 'Decimal point', '5', 'Decimal point', '0')
      expect(display()).toHaveTextContent(/^12\.50$/)
    })

    it('starts "." with a leading zero', async () => {
      const { press, display } = setup()
      await press('Decimal point', '5')
      expect(display()).toHaveTextContent(/^0\.5$/)
    })

    it(`stops accepting digits after 15`, async () => {
      const { press, display } = setup()
      await press(...'1234567890123456'.split(''))
      expect(display()).toHaveTextContent(/^123456789012345$/)
    })

    it('deletes the last character, down to 0', async () => {
      const { press, display } = setup()
      await press('4', '2', 'Delete')
      expect(display()).toHaveTextContent(/^4$/)
      await press('Delete', 'Delete')
      expect(display()).toHaveTextContent(/^0$/)
    })

    it('toggles the sign', async () => {
      const { press, display } = setup()
      await press('Toggle sign', '7')
      expect(display()).toHaveTextContent(/^-7$/)
      await press('Toggle sign')
      expect(display()).toHaveTextContent(/^7$/)
    })
  })

  it('sends a binary operation to the backend on "="', async () => {
    respondWith(42)
    const { press, display, region } = setup()

    await press('1', '2', 'Multiply')
    expect(region()).toHaveTextContent('12 ×')
    await press('3', 'Decimal point', '5', 'Equals')

    expect(requests()).toEqual([{ operation: 'multiply', operands: [12, 3.5] }])
    expect(display()).toHaveTextContent(/^42$/)
    expect(region()).toHaveTextContent('12 × 3.5 =')
  })

  it('chains operations left to right through the backend', async () => {
    respondWith(5, 20)
    const { press, display, region } = setup()

    await press('2', 'Add', '3', 'Multiply')
    expect(display()).toHaveTextContent(/^5$/)
    expect(region()).toHaveTextContent('5 ×')
    await press('4', 'Equals')

    expect(requests()).toEqual([
      { operation: 'add', operands: [2, 3] },
      { operation: 'multiply', operands: [5, 4] },
    ])
    expect(display()).toHaveTextContent(/^20$/)
  })

  it('replaces the pending operation when two operators are pressed in a row', async () => {
    respondWith(6)
    const { press } = setup()
    await press('2', 'Add', 'Multiply', '3', 'Equals')
    expect(requests()).toEqual([{ operation: 'multiply', operands: [2, 3] }])
  })

  it('sends percentage as (value, percent)', async () => {
    respondWith(20)
    const { press, region } = setup()
    await press('2', '0', '0', 'Percentage', '1', '0', 'Equals')

    expect(requests()).toEqual([{ operation: 'percentage', operands: [200, 10] }])
    expect(region()).toHaveTextContent('10% of 200 =')
  })

  it('applies square root to the displayed number straight away', async () => {
    respondWith(4, 13)
    const { press, display, region } = setup()

    await press('9', 'Add', '1', '6', 'Square root')
    expect(display()).toHaveTextContent(/^4$/)
    expect(region()).toHaveTextContent('9 +')
    await press('Equals')

    expect(requests()).toEqual([
      { operation: 'sqrt', operands: [16] },
      { operation: 'add', operands: [9, 4] },
    ])
    expect(display()).toHaveTextContent(/^13$/)
  })

  it('does nothing on "=" without a pending operation', async () => {
    const { press, display } = setup()
    await press('5', 'Equals')
    expect(calculateMock).not.toHaveBeenCalled()
    expect(display()).toHaveTextContent(/^5$/)
  })

  it('rounds the displayed result but keeps full precision for the next operation', async () => {
    respondWith(0.30000000000000004, 0.6000000000000001)
    const { press, display } = setup()

    await press('Decimal point', '1', 'Add', 'Decimal point', '2', 'Equals')
    expect(display()).toHaveTextContent(/^0\.3$/)
    await press('Multiply', '2', 'Equals')

    expect(requests()[1]).toEqual({ operation: 'multiply', operands: [0.30000000000000004, 2] })
  })

  it('starts a new calculation when a digit follows a result', async () => {
    respondWith(3)
    const { press, display, region } = setup()
    await press('1', 'Add', '2', 'Equals', '7')

    expect(display()).toHaveTextContent(/^7$/)
    expect(region()).not.toHaveTextContent('=')
  })

  it('ignores keys while waiting for the backend', async () => {
    const pending = deferred<CalculationResponse>()
    calculateMock.mockReturnValueOnce(pending.promise)
    const { press, display } = setup()

    await press('8', 'Divide', '2', 'Equals')
    expect(screen.getByRole('region', { name: 'Result' }).parentElement).toHaveAttribute('aria-busy', 'true')
    await press('5', 'Equals')

    await act(async () => pending.resolve({ operation: 'divide', operands: [8, 2], result: 4 }))
    expect(calculateMock).toHaveBeenCalledOnce()
    expect(display()).toHaveTextContent(/^4$/)
  })

  it('AC cancels the in-flight request and ignores its response', async () => {
    const pending = deferred<CalculationResponse>()
    calculateMock.mockReturnValueOnce(pending.promise)
    const { press, display, region } = setup()

    await press('8', 'Divide', '2', 'Equals', 'All clear')
    expect(calculateMock.mock.calls[0][1]?.aborted).toBe(true)
    await act(async () => pending.resolve({ operation: 'divide', operands: [8, 2], result: 4 }))

    expect(display()).toHaveTextContent(/^0$/)
    expect(region()).not.toHaveTextContent('÷')
  })

  it('shows the backend error message, then clears it on the next key', async () => {
    calculateMock.mockRejectedValueOnce(
      new CalculatorApiError('api', 'Cannot divide by zero', { code: 'division_by_zero', status: 422 }),
    )
    const { press, display } = setup()

    await press('1', 'Divide', '0', 'Equals')
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot divide by zero')

    await press('3')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(display()).toHaveTextContent(/^3$/)
  })

  it('shows a generic message for unexpected errors', async () => {
    calculateMock.mockRejectedValueOnce(new TypeError('boom'))
    const { press } = setup()
    await press('1', 'Add', '1', 'Equals')
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
  })

  it('supports the keyboard', async () => {
    respondWith(42)
    const { user, display } = setup()

    await user.keyboard('7*6{Enter}')
    expect(requests()).toEqual([{ operation: 'multiply', operands: [7, 6] }])
    expect(display()).toHaveTextContent(/^42$/)

    await user.keyboard('15{Backspace}')
    expect(display()).toHaveTextContent(/^1$/)
    await user.keyboard('{Escape}')
    expect(display()).toHaveTextContent(/^0$/)
  })

  describe('history', () => {
    it('opens and closes from the toggle, empty at first', async () => {
      const { press } = setup()
      const toggle = screen.getByRole('button', { name: 'History' })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('region', { name: 'History' })).not.toBeInTheDocument()

      await press('History')
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('region', { name: 'History' })).toHaveTextContent('No calculations yet.')

      await press('History')
      expect(screen.queryByRole('region', { name: 'History' })).not.toBeInTheDocument()
    })

    it('lists every backend result newest first and survives a reload', async () => {
      respondWith(5, 20)
      const { press } = setup()
      await press('2', 'Add', '3', 'Multiply', '4', 'Equals', 'History')

      const items = screen.getAllByRole('button', { name: / = / })
      expect(items.map((item) => item.getAttribute('aria-label'))).toEqual(['5 × 4 = 20', '2 + 3 = 5'])
      expect(screen.getByRole('region', { name: 'History' })).toHaveTextContent('Today')

      cleanup()
      render(<Calculator />)
      await userEvent.click(screen.getByRole('button', { name: 'History' }))
      expect(screen.getAllByRole('button', { name: / = / })).toHaveLength(2)
    })

    it('recalls a past result as the next operand', async () => {
      respondWith(5, 8)
      const { press, display } = setup()
      await press('2', 'Add', '3', 'Equals', 'History', 'All clear', '3', 'Add')
      await press('2 + 3 = 5')
      expect(display()).toHaveTextContent(/^5$/)

      await press('Equals')
      expect(requests()[1]).toEqual({ operation: 'add', operands: [3, 5] })
    })

    it('clears the history', async () => {
      respondWith(2)
      const { press } = setup()
      await press('1', 'Add', '1', 'Equals', 'History', 'Clear')

      expect(screen.getByRole('region', { name: 'History' })).toHaveTextContent('No calculations yet.')
      expect(localStorage.getItem('calculator-history')).toBe('[]')
    })
  })

  it('does not double-press a focused key on Enter', async () => {
    respondWith(3)
    const { user, press } = setup()
    await press('1', 'Add', '2')
    screen.getByRole('button', { name: '2' }).focus()

    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent(/^3$/)
  })
})
