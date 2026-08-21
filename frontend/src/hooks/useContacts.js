import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '../api/contacts'

export function useContacts(params = {}) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: async () => {
      const response = await contactsApi.getAll(params)
      return response.data
    },
  })
}

export function useContact(id) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const response = await contactsApi.getById(id)
      return response.data
    },
    enabled: Boolean(id),
  })
}

export function useContactTimeline(id) {
  return useQuery({
    queryKey: ['contacts', id, 'timeline'],
    queryFn: async () => {
      const response = await contactsApi.getTimeline(id)
      return response.data
    },
    enabled: Boolean(id),
  })
}

export function useContactCustomFields() {
  return useQuery({
    queryKey: ['contacts', 'custom-fields'],
    queryFn: async () => {
      const response = await contactsApi.getCustomFields()
      return response.data
    },
  })
}

export function useContactCustomValues(id) {
  return useQuery({
    queryKey: ['contacts', id, 'custom-values'],
    queryFn: async () => {
      const response = await contactsApi.getCustomValues(id)
      return response.data
    },
    enabled: Boolean(id),
  })
}

export function useMergeContacts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const response = await contactsApi.merge(payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useImportContacts() {
  const queryClient = useQueryClient()
  return {
    upload: useMutation({
      mutationFn: async (file) => {
        const response = await contactsApi.uploadImport(file)
        return response.data
      },
    }),
    confirm: useMutation({
      mutationFn: async (payload) => {
        const response = await contactsApi.confirmImport(payload)
        return response.data
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['contacts'] })
      },
    }),
  }
}

export function useUpdateContactCustomValues(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values) => {
      const response = await contactsApi.updateCustomValues(id, { values })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', id, 'custom-values'] })
    },
  })
}

export function useContactNotes(id) {
  return useQuery({
    queryKey: ['contacts', id, 'notes'],
    queryFn: async () => {
      const response = await contactsApi.getNotes(id)
      return response.data?.items || []
    },
    enabled: Boolean(id),
  })
}

export function useAddContactNote(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data) => {
      const response = await contactsApi.addNote(id, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', id, 'notes'] })
    },
  })
}
