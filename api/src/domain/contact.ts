import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

const MAX_PHOTO_CHARS = 700_000

const photoSchema = z.string().max(MAX_PHOTO_CHARS).regex(/^data:image\/(png|jpe?g|webp);base64,/, 'photo must be a data URL').nullable()

export const contactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email().nullable(),
  phone: z.string().max(50).nullable(),
  photo: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createContactInput = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  photo: photoSchema.optional(),
})

export const updateContactInput = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  photo: photoSchema.optional(),
}).refine(obj => Object.keys(obj).length > 0, {
  message: 'At least one field must be provided',
})

export const reorderContactsInput = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int().nonnegative(),
      })
    )
    .min(1),
})

export const listContactsQuery = z.object({
  sort: z.enum(['sortOrder', 'name', 'createdAt']).default('sortOrder'),
  dir: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
})

export type Contact = z.infer<typeof contactSchema>
export type CreateContactInput = z.infer<typeof createContactInput>
export type UpdateContactInput = z.infer<typeof updateContactInput>
export type ListContactsQuery = z.infer<typeof listContactsQuery>
export type ReorderContactsInput = z.infer<typeof reorderContactsInput>

export interface PagedResult<T> {
  data: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}
