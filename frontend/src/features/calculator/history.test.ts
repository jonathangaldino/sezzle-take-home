import { afterEach, describe, expect, it } from 'vitest'
import { groupHistory, type HistoryEntry, loadHistory, MAX_HISTORY, saveHistory } from './history'

const entry = (at: number, id = String(at)): HistoryEntry => ({ id, expression: '1 + 1', result: 2, at })

afterEach(() => localStorage.clear())

describe('loadHistory', () => {
  it('round-trips saved entries', () => {
    saveHistory([entry(1), entry(2)])
    expect(loadHistory()).toEqual([entry(1), entry(2)])
  })

  it('returns [] for missing or corrupt storage', () => {
    expect(loadHistory()).toEqual([])
    localStorage.setItem('calculator-history', '{nope')
    expect(loadHistory()).toEqual([])
    localStorage.setItem('calculator-history', '{"a":1}')
    expect(loadHistory()).toEqual([])
  })

  it('drops malformed entries and caps the length', () => {
    const many = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => entry(i))
    localStorage.setItem('calculator-history', JSON.stringify([{ id: 'x', result: '2' }, null, ...many]))
    expect(loadHistory()).toEqual(many.slice(0, MAX_HISTORY))
  })
})

describe('groupHistory', () => {
  it('groups by Today, Previous 7 Days and Older, skipping empty groups', () => {
    const now = new Date(2026, 10, 16, 15, 0).getTime()
    const today = new Date(2026, 10, 16, 0, 5).getTime()
    const yesterday = new Date(2026, 10, 15, 23, 59).getTime()
    const old = new Date(2026, 10, 1).getTime()

    expect(groupHistory([entry(today), entry(yesterday), entry(old)], now)).toEqual([
      { label: 'Today', entries: [entry(today)] },
      { label: 'Previous 7 Days', entries: [entry(yesterday)] },
      { label: 'Older', entries: [entry(old)] },
    ])
    expect(groupHistory([entry(yesterday)], now).map((group) => group.label)).toEqual(['Previous 7 Days'])
  })
})
