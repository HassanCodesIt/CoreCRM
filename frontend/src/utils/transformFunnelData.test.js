import { describe, it, expect } from 'vitest';
import transformFunnelData from './transformFunnelData';

describe('transformFunnelData', () => {
  it('transforms backend funnel response to array format for FunnelChart', () => {
    const backendData = {
      leads: { total: 100, converted: 30, conversion_rate: 30 },
      contacts: { from_leads: 25 },
      deals: { total: 40, won: 15, win_rate: 37.5, pipeline_value: 100000, won_value: 50000 }
    };
    const result = transformFunnelData(backendData);
    expect(result).toEqual([
      { stage: 'Total Leads', count: 100 },
      { stage: 'Converted Leads', count: 30 },
      { stage: 'Contacts from Leads', count: 25 },
      { stage: 'Total Deals', count: 40 },
      { stage: 'Won Deals', count: 15 }
    ]);
  });

  it('returns empty array for null/undefined input', () => {
    expect(transformFunnelData(null)).toEqual([]);
    expect(transformFunnelData(undefined)).toEqual([]);
  });

  it('handles partial data gracefully', () => {
    const result = transformFunnelData({ leads: { total: 50 } });
    expect(result[0].count).toBe(50);
    expect(result[1].count).toBe(0);
  });
});
