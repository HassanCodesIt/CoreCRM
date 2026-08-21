import apiClient from './client'

export const searchApi = {
  globalSearch: (q) => apiClient.get('/search/', { params: { q } }),
}
