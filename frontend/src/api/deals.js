import apiClient from './client'

export const dealsApi = {
  getAll: (params) => apiClient.get('/deals/', { params }),
  getPipeline: () => apiClient.get('/dashboard/pipeline'),
  getStages: () => apiClient.get('/deals/stages/'),
  getById: (id) => apiClient.get(`/deals/${id}/`),
  getTimeline: (id) => apiClient.get(`/deals/${id}/timeline`),
  create: (data) => apiClient.post('/deals/', data),
  update: (id, data) => apiClient.patch(`/deals/${id}/`, data),
  moveDealStage: (id, data) => apiClient.patch(`/deals/${id}/stage`, null, {
    params: { stage_id: data.stage_id || data.stage },
  }),
  delete: (id) => apiClient.delete(`/deals/${id}/`),
  closeDeal: (id, data) => apiClient.patch(`/deals/${id}/close`, data),
  getVelocity: () => apiClient.get('/deals/velocity'),
  getFunnel: (pipelineId) => apiClient.get('/deals/funnel', { params: { pipeline_id: pipelineId } }),
  getPipelines: () => apiClient.get('/pipelines/'),
  createPipeline: (data) => apiClient.post('/pipelines/', data),
  updatePipeline: (id, data) => apiClient.patch(`/pipelines/${id}/`, data),
  deletePipeline: (id) => apiClient.delete(`/pipelines/${id}/`),
  addStage: (pipelineId, data) => apiClient.post(`/pipelines/${pipelineId}/stages`, data),
  updatePipelineStage: (pipelineId, stageId, data) => apiClient.patch(`/pipelines/${pipelineId}/stages/${stageId}`, data),
  deleteStage: (pipelineId, stageId) => apiClient.delete(`/pipelines/${pipelineId}/stages/${stageId}`),
  getAIHealth: (id) => apiClient.post(`/deals/${id}/ai-health`),
}
