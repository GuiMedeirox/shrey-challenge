import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ContactsRepo } from '../../src/repositories/contacts.repo.js'
import { ContactsService } from '../../src/services/contacts.service.js'
import { NotFoundError } from '../../src/lib/errors.js'
import { makeTestDb } from '../helpers/db.js'
import type { DbHandle } from '../../src/db/connection.js'

let dbh: DbHandle
let service: ContactsService
let persistCount = 0

const FIXED_NOW = new Date('2026-04-19T12:00:00.000Z')
const FIXED_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

beforeEach(async () => {
  dbh = await makeTestDb()
  persistCount = 0
  const repo = new ContactsRepo(dbh.db)
  service = new ContactsService(
    repo,
    () => { persistCount++ },
    () => FIXED_NOW,
    () => FIXED_ID
  )
})

afterEach(() => dbh.close())

describe('ContactsService', () => {
  it('creates a contact and persists', () => {
    const c = service.create({ name: 'Ada' })
    expect(c).toMatchObject({ id: FIXED_ID, name: 'Ada', createdAt: FIXED_NOW.toISOString() })
    expect(persistCount).toBe(1)
  })

  it('get throws NotFoundError for unknown id', () => {
    expect(() => service.get('00000000-0000-0000-0000-000000000000')).toThrow(NotFoundError)
  })

  it('update throws NotFoundError for unknown id', () => {
    expect(() => service.update('00000000-0000-0000-0000-000000000000', { name: 'x' })).toThrow(NotFoundError)
  })

  it('delete throws NotFoundError for unknown id', () => {
    expect(() => service.delete('00000000-0000-0000-0000-000000000000')).toThrow(NotFoundError)
  })

  it('updates a contact and persists', () => {
    service.create({ name: 'Ada' })
    persistCount = 0
    const updated = service.update(FIXED_ID, { name: 'Ada Lovelace' })
    expect(updated.name).toBe('Ada Lovelace')
    expect(persistCount).toBe(1)
  })
})
