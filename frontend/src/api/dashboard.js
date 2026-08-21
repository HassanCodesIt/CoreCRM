import apiClient from './client'

export const dashboardApi = {
  getSummary: () => apiClient.get('/dashboard/summary'),
  getPipeline: () => apiClient.get('/dashboard/pipeline'),
  getActivities: () => apiClient.get('/dashboard/activities'),
  getDealsClosingSoon: () => apiClient.get('/dashboard/deals-closing-soon'),
  getTickets: () => apiClient.get('/dashboard/tickets'),
  getRecentLeads: () => apiClient.get('/dashboard/recent-leads'),
  getFunnel: () => apiClient.get('/dashboard/funnel'),
  getTopReps: () => apiClient.get('/dashboard/top-reps'),
  getAIInsight: () => apiClient.get('/dashboard/ai-insight'),
  getTicketStats: () => apiClient.get('/dashboard/ticket-stats'),
  getStats: () => apiClient.get('/dashboard/stats'),
}
