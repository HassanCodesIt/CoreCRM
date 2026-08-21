import { describe, it, expect } from 'vitest'
import { canSubmitWinLoss } from './WinLossModal'

describe('WinLossModal', () => {
  it('requires won outcome and reason category to submit', () => {
    expect(canSubmitWinLoss('won', 'pricing')).toBe(true)
    expect(canSubmitWinLoss('lost', 'competitor')).toBe(true)
    expect(canSubmitWinLoss('', 'pricing')).toBe(false)
    expect(canSubmitWinLoss('won', '')).toBe(false)
    expect(canSubmitWinLoss('invalid', 'pricing')).toBe(false)
  })

  it('renders and submits correctly with valid data', () => {
    const payload = { status: 'won', reason_category: 'timing', reason_notes: 'Closed fast', amount_final: 50000 }
    expect(canSubmitWinLoss(payload.status, payload.reason_category)).toBe(true)
  })
})
