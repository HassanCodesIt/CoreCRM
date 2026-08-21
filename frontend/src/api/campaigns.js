import apiClient from './client'

export const campaignsApi = {
  getAll: (params) => apiClient.get('/campaigns/', { params }),
  getById: (id) => apiClient.get(`/campaigns/${id}/`),
  create: (data) => apiClient.post('/campaigns/', data),
  update: (id, data) => apiClient.put(`/campaigns/${id}/`, data),
  delete: (id) => apiClient.delete(`/campaigns/${id}/`),
}
