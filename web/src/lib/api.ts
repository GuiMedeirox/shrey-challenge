import type {
  Contact,
  CreateContactInput,
  UpdateContactInput,
  ListContactsQuery,
  PagedContacts,
  ReorderItem,
  ApiError,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export class HttpError extends Error {
  constructor(public status: number, public body: ApiError | null, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const body = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    const apiError = (body as ApiError | null) ?? null
    throw new HttpError(res.status, apiError, apiError?.message ?? res.statusText)
  }

  return body as T
}

export const api = {
  list(query: ListContactsQuery = {}): Promise<PagedContacts> {
    const params = new URLSearchParams()
    if (query.sort) params.set('sort', query.sort)
    if (query.dir) params.set('dir', query.dir)
    if (query.page) params.set('page', String(query.page))
    if (query.limit) params.set('limit', String(query.limit))
    const qs = params.toString()
    return request<PagedContacts>(`/contacts${qs ? `?${qs}` : ''}`)
  },

  get(id: string): Promise<Contact> {
    return request<Contact>(`/contacts/${id}`)
  },

  create(input: CreateContactInput, idempotencyKey?: string): Promise<Contact> {
    return request<Contact>('/contacts', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      body: JSON.stringify(input),
    })
  },

  update(id: string, input: UpdateContactInput, idempotencyKey?: string): Promise<Contact> {
    return request<Contact>(`/contacts/${id}`, {
      method: 'PATCH',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      body: JSON.stringify(input),
    })
  },

  delete(id: string): Promise<void> {
    return request<void>(`/contacts/${id}`, { method: 'DELETE' })
  },

  reorder(items: ReorderItem[]): Promise<void> {
    return request<void>('/contacts/reorder', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    })
  },
}
