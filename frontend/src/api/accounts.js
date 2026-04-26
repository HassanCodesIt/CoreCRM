import apiClient from './client'

export const accountsApi = {
  getAll: (params) => apiClient.get('/accounts', { params }),
  getById: (id) => apiClient.get(`/accounts/${id}`),
  create: (data) => apiClient.post('/accounts', data),
  update: (id, data) => apiClient.put(`/accounts/${id}`, data),
  delete: (id) => apiClient.delete(`/accounts/${id}`),
  getContacts: (id) => apiClient.get(`/accounts/${id}/contacts`),
  getDeals: (id) => apiClient.get(`/accounts/${id}/deals`),
  getActivities: (id) => apiClient.get(`/accounts/${id}/activities`),
}
