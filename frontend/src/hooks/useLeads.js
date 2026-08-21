import { useQuery } from '@tanstack/react-query'
import { leadsApi } from '../api/leads'

// Fetch list of leads
export const useLeads = (params) => {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      const res = await leadsApi.getAll(params)
      // API returns { items, total, skip, limit }
      return res.data?.items ?? []
    }
  })
}

// Lead SLA hook
export const useLeadSLA = (id) => {
  return useQuery({
    queryKey: ['lead-sla', id],
    queryFn: async () => {
      if (!id) return null
      const res = await leadsApi.getLeadSLA(id)
      return res.data
    },
    enabled: !!id
  })
}

// Fetch single lead
export const useLead = (id) => {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const res = await leadsApi.getById(id)
      return res.data
    }
  })
}
