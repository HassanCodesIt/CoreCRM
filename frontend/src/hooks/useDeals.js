import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dealsApi } from '../api/deals'

export function useDeals(params = {}) {
  return useQuery({
    queryKey: ['deals', params],
    queryFn: async () => {
      const response = await dealsApi.getAll(params)
      return response.data
    },
  })
}

export function useDeal(id) {
  return useQuery({
    queryKey: ['deals', id],
    queryFn: async () => {
      const response = await dealsApi.getById(id)
      return response.data
    },
    enabled: Boolean(id),
  })
}

export function useCloseDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ dealId, ...payload }) => {
      const response = await dealsApi.closeDeal(dealId, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useVelocity() {
  return useQuery({
    queryKey: ['deals', 'velocity'],
    queryFn: async () => {
      const response = await dealsApi.getVelocity()
      return response.data
    },
  })
}

export function useFunnel(pipelineId) {
  return useQuery({
    queryKey: ['deals', 'funnel', pipelineId],
    queryFn: async () => {
      const response = await dealsApi.getFunnel(pipelineId)
      return response.data
    },
    enabled: Boolean(pipelineId),
  })
}
