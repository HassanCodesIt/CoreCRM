export default function transformFunnelData(data) {
  if (!data || typeof data !== 'object') return [];
  
  const { leads = {}, contacts = {}, deals = {} } = data;
  return [
    { stage: 'Total Leads', count: leads.total || 0 },
    { stage: 'Converted Leads', count: leads.converted || 0 },
    { stage: 'Contacts from Leads', count: contacts.from_leads || 0 },
    { stage: 'Total Deals', count: deals.total || 0 },
    { stage: 'Won Deals', count: deals.won || 0 },
  ];
}
