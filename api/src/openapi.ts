import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import {
  contactSchema,
  createContactInput,
  updateContactInput,
  listContactsQuery,
  reorderContactsInput,
} from './domain/contact.js'

const registry = new OpenAPIRegistry()

const ContactRef = registry.register('Contact', contactSchema)
const CreateContactInputRef = registry.register('CreateContactInput', createContactInput)
const UpdateContactInputRef = registry.register('UpdateContactInput', updateContactInput)
const ReorderContactsInputRef = registry.register('ReorderContactsInput', reorderContactsInput)

const PagedContactsRef = registry.register(
  'PagedContacts',
  z.object({
    data: z.array(ContactRef),
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  })
)

const ErrorBodyRef = registry.register(
  'ErrorBody',
  z.object({
    statusCode: z.number().int(),
    error: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  })
)

const idempotencyKeyHeader = z.string().min(1).optional().openapi({
  description: 'Optional idempotency key. Same key + same body replays the original response; same key + different body returns 422.',
  example: '11111111-1111-1111-1111-111111111111',
})

const idParam = z.string().uuid().openapi({ param: { name: 'id', in: 'path' }, example: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' })

registry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Health check',
  tags: ['Health'],
  responses: {
    200: {
      description: 'OK',
      content: { 'application/json': { schema: z.object({ status: z.literal('ok') }) } },
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/contacts',
  summary: 'List contacts',
  tags: ['Contacts'],
  request: { query: listContactsQuery },
  responses: {
    200: { description: 'Paged contact list', content: { 'application/json': { schema: PagedContactsRef } } },
    400: { description: 'Invalid query', content: { 'application/json': { schema: ErrorBodyRef } } },
  },
})

registry.registerPath({
  method: 'post',
  path: '/contacts',
  summary: 'Create a contact',
  tags: ['Contacts'],
  request: {
    headers: z.object({ 'idempotency-key': idempotencyKeyHeader }),
    body: { content: { 'application/json': { schema: CreateContactInputRef } } },
  },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: ContactRef } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorBodyRef } } },
    422: { description: 'Idempotency key conflict', content: { 'application/json': { schema: ErrorBodyRef } } },
  },
})

registry.registerPath({
  method: 'put',
  path: '/contacts/reorder',
  summary: 'Reorder contacts',
  description: 'Sets contacts.sort_order to match the given id sequence.',
  tags: ['Contacts'],
  request: {
    body: { content: { 'application/json': { schema: ReorderContactsInputRef } } },
  },
  responses: {
    204: { description: 'Reordered' },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorBodyRef } } },
  },
})

registry.registerPath({
  method: 'get',
  path: '/contacts/{id}',
  summary: 'Get a contact',
  tags: ['Contacts'],
  request: { params: z.object({ id: idParam }) },
  responses: {
    200: { description: 'Contact', content: { 'application/json': { schema: ContactRef } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorBodyRef } } },
  },
})

registry.registerPath({
  method: 'patch',
  path: '/contacts/{id}',
  summary: 'Update a contact',
  tags: ['Contacts'],
  request: {
    params: z.object({ id: idParam }),
    headers: z.object({ 'idempotency-key': idempotencyKeyHeader }),
    body: { content: { 'application/json': { schema: UpdateContactInputRef } } },
  },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: ContactRef } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorBodyRef } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorBodyRef } } },
    422: { description: 'Idempotency key conflict', content: { 'application/json': { schema: ErrorBodyRef } } },
  },
})

registry.registerPath({
  method: 'delete',
  path: '/contacts/{id}',
  summary: 'Delete a contact',
  tags: ['Contacts'],
  request: { params: z.object({ id: idParam }) },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorBodyRef } } },
  },
})

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions)
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Contacts API',
      version: '1.0.0',
      description: 'Simple contacts CRUD with idempotency keys and pagination.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local' }],
  })
}
