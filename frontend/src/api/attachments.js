import apiClient from './client'

export const attachmentsApi = {
  upload: (data) => {
    const formData = new FormData()
    formData.append('file', data.file)
    formData.append('reference_type', data.reference_type)
    formData.append('reference_id', data.reference_id)
    return apiClient.post('/attachments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  list: (refType, refId) => apiClient.get(`/attachments/${refType}/${refId}`),
  delete: (id) => apiClient.delete(`/attachments/${id}`),
}
