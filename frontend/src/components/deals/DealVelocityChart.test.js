import { describe, it, expect } from 'vitest'
import { buildVelocityRows } from './DealVelocityChart'

describe('DealVelocityChart', () => {
  it('renders horizontal bars from pipeline velocity data', () => {
    const pipelines = [
      {
        pipeline_id: 'p1',
        pipeline_name: 'Sales',
        stages: [
          { stage_id: 's1', stage_name: 'Prospecting', avg_days: 3.5 },
          { stage_id: 's2', stage_name: 'Qualified', avg_days: 7.2 },
        ]
      }
    ]
    const rows = buildVelocityRows(pipelines)
    expect(rows).toHaveLength(2)
    expect(rows[0].stage).toBe('Prospecting')
    expect(rows[0].avg_days).toBe(3.5)
    expect(rows[1].pipeline).toBe('Sales')
  })

  it('handles empty pipelines', () => {
    expect(buildVelocityRows([])).toEqual([])
    expect(buildVelocityRows()).toEqual([])
  })
})
