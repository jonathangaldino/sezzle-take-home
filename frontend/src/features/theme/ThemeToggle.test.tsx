import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

afterEach(() => {
  document.documentElement.classList.remove('dark')
  localStorage.clear()
})

describe('ThemeToggle', () => {
  it('reflects the theme already applied by index.html', () => {
    document.documentElement.classList.add('dark')
    render(<ThemeToggle />)
    expect(screen.getByRole('switch', { name: 'Dark theme' })).toBeChecked()
  })

  it('switches the theme and remembers the choice', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const toggle = screen.getByRole('switch', { name: 'Dark theme' })
    expect(toggle).not.toBeChecked()

    await user.click(toggle)
    expect(toggle).toBeChecked()
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('dark')

    await user.click(toggle)
    expect(toggle).not.toBeChecked()
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
