import apiClient from './client'

export const ticketsApi = {
  getAll: (params) => apiClient.get('/tickets', { params }),
  getById: (id) => apiClient.get(`/tickets/${id}`),
  create: (data) => apiClient.post('/tickets', data),
  update: (id, data) => apiClient.put(`/tickets/${id}`, data),
  updateStatus: (id, data) => apiClient.patch(`/tickets/${id}/status`, data),
  assign: (id, data) => apiClient.patch(`/tickets/${id}/assign`, data),
  delete: (id) => apiClient.delete(`/tickets/${id}`),
  getMetrics: () => apiClient.get('/tickets/metrics'),
}
