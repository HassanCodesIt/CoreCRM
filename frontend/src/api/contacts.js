import apiClient from './client'

export const contactsApi = {
  getAll: (params) => apiClient.get('/contacts/', { params }),
  getById: (id) => apiClient.get(`/contacts/${id}/`),
  getDuplicates: (params) => apiClient.get('/contacts/duplicates', { params }),
  create: (data) => apiClient.post('/contacts/', data),
  update: (id, data) => apiClient.patch(`/contacts/${id}/`, data),
  delete: (id) => apiClient.delete(`/contacts/${id}/`),
  getCustomFields: () => apiClient.get('/contacts/custom-fields'),
  createCustomField: (data) => apiClient.post('/contacts/custom-fields', data),
  getCustomValues: (id) => apiClient.get(`/contacts/${id}/custom-values`),
  updateCustomValues: (id, data) => apiClient.put(`/contacts/${id}/custom-values`, data),
  getTimeline: (id) => apiClient.get(`/contacts/${id}/timeline`),
  getActivities: (id, params) => apiClient.get(`/contacts/${id}/activities/`, { params }),
  getDeals: (id) => apiClient.get(`/contacts/${id}/deals/`),
  getTickets: (id) => apiClient.get(`/contacts/${id}/tickets/`),
  getNotes: (id) => apiClient.get(`/contacts/${id}/notes/`),
  addNote: (id, data) => apiClient.post(`/contacts/${id}/notes/`, data),
  bulkUpdate: (data) => apiClient.patch('/contacts/bulk-update/', data),
  merge: (data) => apiClient.post('/contacts/merge', data),
  uploadImport: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/contacts/import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  confirmImport: (data) => apiClient.post('/contacts/import/confirm', data),
  import: (data) => apiClient.post('/contacts/import/', data),
}
