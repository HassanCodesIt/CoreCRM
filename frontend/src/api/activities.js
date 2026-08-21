import apiClient from './client'

export const activitiesApi = {
  getAll: (params) => apiClient.get('/activities/', { params }),
  getById: (id) => apiClient.get(`/activities/${id}/`),
  create: (data) => apiClient.post('/activities/', data),
  update: (id, data) => apiClient.put(`/activities/${id}/`, data),
  complete: (id) => apiClient.patch(`/activities/${id}/complete`),
  delete: (id) => apiClient.delete(`/activities/${id}/`),
}
