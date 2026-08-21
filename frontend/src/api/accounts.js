import apiClient from './client'

export const accountsApi = {
  getAll: (params) => apiClient.get('/accounts/', { params }),
  getById: (id) => apiClient.get(`/accounts/${id}/`),
  create: (data) => apiClient.post('/accounts/', data),
  update: (id, data) => apiClient.patch(`/accounts/${id}/`, data),
  delete: (id) => apiClient.delete(`/accounts/${id}/`),
  getContacts: (id) => apiClient.get(`/accounts/${id}/contacts/`),
  getDeals: (id) => apiClient.get(`/accounts/${id}/deals/`),
  getActivities: (id) => apiClient.get(`/accounts/${id}/activities/`),
  getTimeline: (id) => apiClient.get(`/accounts/${id}/timeline`),
}
