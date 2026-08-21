import apiClient from './client'

export const ticketsApi = {
  getAll: (params) => apiClient.get('/tickets/', { params }),
  getById: (id) => apiClient.get(`/tickets/${id}/`),
  getTimeline: (id) => apiClient.get(`/tickets/${id}/timeline`),
  create: (data) => apiClient.post('/tickets/', data),
  update: (id, data) => apiClient.patch(`/tickets/${id}/`, data),
  updateStatus: (id, data) => apiClient.patch(`/tickets/${id}/`, data),
  assign: (id, data) => apiClient.patch(`/tickets/${id}/assign`, null, { params: data }),
  delete: (id) => apiClient.delete(`/tickets/${id}/`),
  getMetrics: () => apiClient.get('/tickets/metrics/'),
}
