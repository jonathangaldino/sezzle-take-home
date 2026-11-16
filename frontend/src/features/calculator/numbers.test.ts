import { describe, expect, it } from 'vitest'
import { formatExpression, formatNumber, parseOperand } from './numbers'

describe('parseOperand', () => {
  it.each([
    ['42', 42],
    [' -3.5 ', -3.5],
    ['+7', 7],
    ['.5', 0.5],
    ['5.', 5],
    ['1e3', 1000],
    ['2.5E-3', 0.0025],
  ])('accepts %j', (raw, expected) => {
    expect(parseOperand(raw)).toEqual({ ok: true, value: expected })
  })

  it.each(['', '   '])('rejects empty input %j', (raw) => {
    expect(parseOperand(raw)).toEqual({ ok: false, error: 'Enter a number.' })
  })

  it.each(['abc', '1e', '1,5', 'Infinity', '-Infinity', 'NaN', '0x10', '1.2.3', '--1', '.'])(
    'rejects non-numeric input %j',
    (raw) => {
      expect(parseOperand(raw)).toMatchObject({ ok: false, error: expect.stringMatching(/valid number/) })
    },
  )

  it('rejects numbers that overflow to Infinity', () => {
    expect(parseOperand('1e400')).toEqual({ ok: false, error: 'This number is too large.' })
  })
})

describe('formatNumber', () => {
  it.each([
    [0.30000000000000004, '0.3'],
    [2.5, '2.5'],
    [15, '15'],
    [-0, '0'],
    [-12.75, '-12.75'],
    [1 / 3, '0.333333333333'],
    [123456789012, '123456789012'],
    [1e21, '1e+21'],
    [1234567890123456, '1.23456789012e+15'],
    [-2.5e15, '-2.5e+15'],
    [1e-7, '1e-7'],
    [0.000001, '0.000001'],
    [1.7976931348623157e308, '1.79769313486e+308'],
  ])('formats %d as %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected)
  })
})

describe('formatExpression', () => {
  it('formats binary operations with their symbol', () => {
    expect(formatExpression('divide', [10, 4])).toBe('10 ÷ 4')
  })

  it('wraps negative operands in parentheses', () => {
    expect(formatExpression('power', [-2, 2])).toBe('(-2) ^ 2')
  })

  it('formats square root as a prefix', () => {
    expect(formatExpression('sqrt', [9])).toBe('√9')
  })

  it('formats percentage as "percent of value"', () => {
    expect(formatExpression('percentage', [200, 10])).toBe('10% of 200')
  })
})
