import apiClient from './client'

export const dealsApi = {
  getAll: (params) => apiClient.get('/deals', { params }),
  getPipeline: () => apiClient.get('/deals/pipeline'),
  getById: (id) => apiClient.get(`/deals/${id}`),
  create: (data) => apiClient.post('/deals', data),
  update: (id, data) => apiClient.put(`/deals/${id}`, data),
  updateStage: (id, data) => apiClient.patch(`/deals/${id}/stage`, data),
  delete: (id) => apiClient.delete(`/deals/${id}`),
}
