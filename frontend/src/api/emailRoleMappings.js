import apiClient from './client'

export const emailRoleMappingsApi = {
  getAll: (params) => apiClient.get('/email-role-mappings/', { params }),
  create: (data) => apiClient.post('/email-role-mappings/', data),
  delete: (id) => apiClient.delete(`/email-role-mappings/${id}/`),
}
