import apiClient from './client'

export const reportsApi = {
  getMetrics: () => apiClient.get('/reports/metrics'),
  exportEntity: (entity) => apiClient.get(`/reports/export/${entity}`),
}
