import apiClient from './client'

export const authApi = {
  login: (data) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get('/auth/me'),
  updateMe: (data) => apiClient.put('/auth/me', data),
  changePassword: (data) => apiClient.put('/auth/me/password', data),
}
