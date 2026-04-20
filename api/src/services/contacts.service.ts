import { v4 as uuidv4 } from 'uuid'
import type { ContactsRepo } from '../repositories/contacts.repo.js'
import type { Contact, CreateContactInput, UpdateContactInput, ListContactsQuery, PagedResult } from '../domain/contact.js'
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js'

export class ContactsService {
  constructor(
    private readonly repo: ContactsRepo,
    private readonly persist: () => void = () => {},
    private readonly now: () => Date = () => new Date(),
    private readonly genId: () => string = () => uuidv4()
  ) {}

  list(query: ListContactsQuery): PagedResult<Contact> {
    return this.repo.list(query)
  }

  get(id: string): Contact {
    const c = this.repo.get(id)
    if (!c) throw new NotFoundError('Contact', id)
    return c
  }

  create(input: CreateContactInput): Contact {
    let created: Contact
    try {
      created = this.repo.create(this.genId(), input, this.now().toISOString())
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_PHONE') {
        throw new ConflictError('A contact with this phone number already exists')
      }
      throw err
    }
    this.persist()
    return created
  }

  update(id: string, patch: UpdateContactInput): Contact {
    let updated: Contact | null
    try {
      updated = this.repo.update(id, patch, this.now().toISOString())
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_PHONE') {
        throw new ConflictError('A contact with this phone number already exists')
      }
      throw err
    }
    if (!updated) throw new NotFoundError('Contact', id)
    this.persist()
    return updated
  }

  delete(id: string): void {
    const ok = this.repo.delete(id)
    if (!ok) throw new NotFoundError('Contact', id)
    this.persist()
  }

  reorder(items: { id: string; sortOrder: number }[]): void {
    const ids = items.map((i) => i.id)
    if (new Set(ids).size !== ids.length) {
      throw new ValidationError('ids must be unique')
    }
    try {
      this.repo.reorder(items)
    } catch (err) {
      if (err instanceof Error && err.message === 'UNKNOWN_IDS') {
        throw new ValidationError('one or more ids do not exist')
      }
      throw err
    }
    this.persist()
  }
}
