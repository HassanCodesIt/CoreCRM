import apiClient from './client'

export const usersApi = {
  getAll: (params) => apiClient.get('/users/', { params }),
}
