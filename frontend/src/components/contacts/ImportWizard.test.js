import { describe, expect, it } from 'vitest'
import { isImportMappingValid } from './ImportWizard'

describe('ImportWizard mapping flow', () => {
  it('requires first and last name mappings before preview or confirm', () => {
    expect(isImportMappingValid({ first_name: 'First Name' })).toBe(false)
    expect(isImportMappingValid({ last_name: 'Last Name' })).toBe(false)
    expect(isImportMappingValid({ first_name: 'First Name', last_name: 'Last Name' })).toBe(true)
  })
})
