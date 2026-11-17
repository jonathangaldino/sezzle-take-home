import { describe, expect, it } from 'vitest'
import { formatExpression, formatNumber } from './numbers'

describe('formatNumber', () => {
  it.each([
    [0.30000000000000004, '0.3'],
    [2.5, '2.5'],
    [15, '15'],
    [-0, '0'],
    [-12.75, '-12.75'],
    [1.2100000000000002, '1.21'],
    [1 / 3, '0.333333333333333'],
    [1.0000000000001, '1.0000000000001'],
    [2.0000000000001, '2.0000000000001'],
    [123456789012, '123456789012'],
    [1e21, '1e+21'],
    [1234567890123456, '1.23456789012346e+15'],
    [-2.5e15, '-2.5e+15'],
    [1e-7, '1e-7'],
    [3.3333333333333334e-8, '3.33333333333333e-8'],
    [0.000001, '0.000001'],
    [1.7976931348623157e308, '1.79769313486232e+308'],
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
