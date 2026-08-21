import apiClient from './client'

export const leadsApi = {
  getAll: (params) => apiClient.get('/leads/', { params }),
  getById: (id) => apiClient.get(`/leads/${id}/`),
  create: (data) => apiClient.post('/leads/', data),
  update: (id, data) => apiClient.patch(`/leads/${id}/`, data),
  updateStatus: (id, data) => apiClient.patch(`/leads/${id}/status`, data),
  delete: (id) => apiClient.delete(`/leads/${id}/`),
  getPipeline: () => apiClient.get('/dashboard/pipeline'),
  getStats: () => apiClient.get('/leads/stats'),
  bulkUpdate: (data) => apiClient.patch('/leads/bulk-update/', data),
  import: (data) => apiClient.post('/leads/import/', data),
  convert: (id, data) => apiClient.post(`/leads/${id}/convert`, data),
  getActivities: (id) => apiClient.get(`/leads/${id}/activities/`),
  addActivity: (id, data) => apiClient.post(`/leads/${id}/activities/`, data),
  updateScore: (id, action, score_delta = null) => apiClient.post(`/leads/${id}/score`, null, { params: { action, score_delta } }),
  getScoreEvents: (id) => apiClient.get(`/leads/${id}/score-events/`),
  getAISummary: (id) => apiClient.post(`/leads/${id}/ai-summary/`),
  qualifyLead: (id) => apiClient.post(`/leads/${id}/ai-qualify/`),
  generateEmail: (id, params) => apiClient.post(`/leads/${id}/ai-email/`, null, { params }),
  getInsights: (id) => apiClient.post(`/leads/${id}/ai-insights/`),
  getLeadSLA: (id) => apiClient.get(`/leads/${id}/sla`),
}
