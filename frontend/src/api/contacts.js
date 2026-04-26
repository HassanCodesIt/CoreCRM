import apiClient from './client'

export const contactsApi = {
  getAll: (params) => apiClient.get('/contacts', { params }),
  getById: (id) => apiClient.get(`/contacts/${id}`),
  create: (data) => apiClient.post('/contacts', data),
  update: (id, data) => apiClient.put(`/contacts/${id}`, data),
  delete: (id) => apiClient.delete(`/contacts/${id}`),
  getActivities: (id, params) => apiClient.get(`/contacts/${id}/activities`, { params }),
  getDeals: (id) => apiClient.get(`/contacts/${id}/deals`),
  getTickets: (id) => apiClient.get(`/contacts/${id}/tickets`),
  addNote: (id, data) => apiClient.post(`/contacts/${id}/notes`, data),
  bulkUpdate: (data) => apiClient.patch('/contacts/bulk-update', data),
  import: (data) => apiClient.post('/contacts/import', data),
}
