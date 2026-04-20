import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from './api'
import type { CreateContactInput, ListContactsQuery, PagedContacts, ReorderItem, UpdateContactInput } from './types'

export const contactsRootKey = ['contacts'] as const
export const DEFAULT_PAGE_SIZE = 30

export function contactsKey(params: ListContactsQuery = {}): QueryKey {
  return [
    ...contactsRootKey,
    params.sort ?? 'sortOrder',
    params.dir ?? 'asc',
    params.page ?? 1,
    params.limit ?? DEFAULT_PAGE_SIZE,
  ]
}

export function useContacts(params: ListContactsQuery = {}) {
  const sort = params.sort ?? 'sortOrder'
  const dir = params.dir ?? 'asc'
  const page = params.page ?? 1
  const limit = params.limit ?? DEFAULT_PAGE_SIZE
  return useQuery({
    queryKey: contactsKey({ sort, dir, page, limit }),
    queryFn: () => api.list({ sort, dir, page, limit }),
    placeholderData: keepPreviousData,
  })
}

function genKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateContactInput) => api.create(input, genKey()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactsRootKey })
    },
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateContactInput }) =>
      api.update(id, patch, genKey()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactsRootKey })
    },
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: contactsRootKey })
      const snapshots = qc.getQueriesData<PagedContacts>({ queryKey: contactsRootKey })
      snapshots.forEach(([key, prev]) => {
        if (!prev) return
        qc.setQueryData<PagedContacts>(key, {
          ...prev,
          data: prev.data.filter((c) => c.id !== id),
          total: Math.max(0, prev.total - 1),
        })
      })
      return { snapshots }
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, prev]) => {
        if (prev) qc.setQueryData(key, prev)
      })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: contactsRootKey })
    },
  })
}

export function useReorderContacts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: ReorderItem[]) => api.reorder(items),
    onMutate: async (items) => {
      await qc.cancelQueries({ queryKey: contactsRootKey })
      const snapshots = qc.getQueriesData<PagedContacts>({ queryKey: contactsRootKey })
      const byId = new Map(items.map((i) => [i.id, i.sortOrder]))
      snapshots.forEach(([key, prev]) => {
        if (!prev) return
        const updated = prev.data.map((c) => {
          const next = byId.get(c.id)
          return next !== undefined ? { ...c, sortOrder: next } : c
        })
        const isManualKey = key[1] === 'sortOrder' && key[2] === 'asc'
        const sorted = isManualKey ? [...updated].sort((a, b) => a.sortOrder - b.sortOrder) : updated
        qc.setQueryData<PagedContacts>(key, { ...prev, data: sorted })
      })
      return { snapshots }
    },
    onError: (_err, _items, ctx) => {
      ctx?.snapshots.forEach(([key, prev]) => {
        if (prev) qc.setQueryData(key, prev)
      })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: contactsRootKey })
    },
  })
}
