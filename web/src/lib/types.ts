export interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  photo: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface PagedContacts {
  data: Contact[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface CreateContactInput {
  name: string
  email?: string | null
  phone?: string | null
  photo?: string | null
}

export interface UpdateContactInput {
  name?: string
  email?: string | null
  phone?: string | null
  photo?: string | null
}

export interface ListContactsQuery {
  sort?: 'sortOrder' | 'name' | 'createdAt'
  dir?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface ReorderItem {
  id: string
  sortOrder: number
}

export interface ApiError {
  statusCode: number
  error: string
  message: string
  details?: unknown
}
