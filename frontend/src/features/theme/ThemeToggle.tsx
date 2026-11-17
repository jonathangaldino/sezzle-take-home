import { useState } from 'react'
import { withViewTransition } from '../../viewTransition'

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function ThemeToggle() {
  // index.html sets the initial class from the saved choice or the OS preference.
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !dark
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // Storage blocked (private mode): the choice just won't persist.
    }
    // Cross-fades the whole page between themes while the knob and icon slide across.
    withViewTransition(() => {
      document.documentElement.classList.toggle('dark', next)
      setDark(next)
    })
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark theme"
      onClick={toggle}
      className="relative flex h-9 w-18 items-center rounded-full bg-track px-1 text-muted shadow-[inset_1px_2px_4px_rgb(0_0_0/0.15)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span
        // Without View Transitions, a CSS transition slides the knob instead.
        className={`size-7 rounded-full bg-knob shadow-[0_2px_5px_rgb(0_0_0/0.25)] transition-transform duration-300 ease-out [view-transition-name:theme-knob] motion-reduce:transition-none supports-[view-transition-name:none]:transition-none ${dark ? 'translate-x-9' : ''}`}
      />
      {dark ? (
        <svg {...iconProps} className="absolute left-2.5 size-4 [view-transition-name:theme-icon]">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg {...iconProps} className="absolute right-2.5 size-4 [view-transition-name:theme-icon]">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  )
}
