import { describe, it, expect } from 'vitest'
import { buildFunnelRows } from './StageFunnelChart'

describe('StageFunnelChart', () => {
  it('renders bars with conversion labels between stages', () => {
    const stages = [
      { stage_id: 's1', stage_name: 'Prospecting', count: 100, conversion_rate: null },
      { stage_id: 's2', stage_name: 'Qualified', count: 60, conversion_rate: 60.0 },
      { stage_id: 's3', stage_name: 'Won', count: 30, conversion_rate: 50.0 },
    ]
    const rows = buildFunnelRows(stages)
    expect(rows).toHaveLength(3)
    expect(rows[0].label).toBe('')
    expect(rows[1].label).toBe('60% ->')
    expect(rows[2].label).toBe('50% ->')
  })

  it('handles empty stages array', () => {
    expect(buildFunnelRows([])).toEqual([])
  })
})
