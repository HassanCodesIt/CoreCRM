import apiClient from './client'

export const getHostDetails = async (userId) => {
  const response = await apiClient.get(`/scheduler/host/${userId}`)
  return response.data
}

export const getAvailability = async (userId, date) => {
  const response = await apiClient.post('/scheduler/availability', {
    user_id: userId,
    date,
  })
  return response.data
}

export const bookMeeting = async (payload) => {
  const response = await apiClient.post('/scheduler/book', payload)
  return response.data
}
