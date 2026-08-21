import { describe, expect, it } from 'vitest'
import { canMergeContacts } from './MergeContactsModal'

describe('MergeContactsModal behavior', () => {
  it('requires a primary contact and at least one secondary contact', () => {
    expect(canMergeContacts('', ['secondary'])).toBe(false)
    expect(canMergeContacts('primary', ['primary'])).toBe(false)
    expect(canMergeContacts('primary', ['primary', 'secondary'])).toBe(true)
  })
})
