import { Router } from 'express'
import type { Request } from 'express'
import type { ContactsService } from '../services/contacts.service.js'
import type { IdempotencyService } from '../services/idempotency.service.js'
import { createContactInput, updateContactInput, listContactsQuery, reorderContactsInput, type ListContactsQuery } from '../domain/contact.js'
import { validate } from '../middleware/validate.js'
import { idempotency } from '../middleware/idempotency.js'
import { z } from 'zod'

const idParam = z.object({ id: z.string().uuid() })

export function contactsRouter(contacts: ContactsService, idemService: IdempotencyService): Router {
  const router = Router()
  const idem = idempotency(idemService)

  router.get('/', validate(listContactsQuery, 'query'), (req, res) => {
    const query = (req as Request & { validatedQuery: ListContactsQuery }).validatedQuery
    res.json(contacts.list(query))
  })

  router.post('/', idem, validate(createContactInput, 'body'), (req, res) => {
    const created = contacts.create(req.body)
    res.status(201).json(created)
  })

  router.put('/reorder', validate(reorderContactsInput, 'body'), (req, res) => {
    contacts.reorder(req.body.items)
    res.status(204).end()
  })

  router.get('/:id', validate(idParam, 'params'), (req, res) => {
    res.json(contacts.get(req.params.id as string))
  })

  router.patch('/:id', idem, validate(idParam, 'params'), validate(updateContactInput, 'body'), (req, res) => {
    res.json(contacts.update(req.params.id as string, req.body))
  })

  router.delete('/:id', validate(idParam, 'params'), (req, res) => {
    contacts.delete(req.params.id as string)
    res.status(204).end()
  })

  return router
}
