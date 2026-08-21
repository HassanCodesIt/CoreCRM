import { describe, it, expect } from 'vitest'
import { renderBadge } from './RottenBadge.test.helper'

describe('RottenBadge', () => {
  it('shows badge when is_rotting is true', () => {
    const result = renderBadge(true)
    expect(result).toBe('Rotting')
  })

  it('hides badge when is_rotting is false', () => {
    const result = renderBadge(false)
    expect(result).toBeNull()
  })

  it('hides badge when is_rotting is undefined', () => {
    const result = renderBadge(undefined)
    expect(result).toBeNull()
  })
})
