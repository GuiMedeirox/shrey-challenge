import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ContactsRepo } from '../../src/repositories/contacts.repo.js'
import { makeTestDb } from '../helpers/db.js'
import type { DbHandle } from '../../src/db/connection.js'

let dbh: DbHandle
let repo: ContactsRepo

const NOW = '2026-04-19T12:00:00.000Z'

beforeEach(async () => {
  dbh = await makeTestDb()
  repo = new ContactsRepo(dbh.db)
})

afterEach(() => {
  dbh.close()
})

const createMany = () => {
  repo.create('11111111-1111-1111-1111-111111111111', { name: 'Charlie', email: 'c@x.com' }, '2026-04-10T00:00:00.000Z')
  repo.create('22222222-2222-2222-2222-222222222222', { name: 'Alice', email: 'a@x.com' }, '2026-04-12T00:00:00.000Z')
  repo.create('33333333-3333-3333-3333-333333333333', { name: 'Bob', email: 'b@x.com' }, '2026-04-14T00:00:00.000Z')
}

describe('ContactsRepo', () => {
  it('creates and reads a contact', () => {
    const c = repo.create('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', { name: 'Ada' }, NOW)
    expect(c).toMatchObject({ name: 'Ada', email: null, phone: null, createdAt: NOW, updatedAt: NOW })
    expect(repo.get(c.id)).toEqual(c)
  })

  it('returns null for missing id', () => {
    expect(repo.get('00000000-0000-0000-0000-000000000000')).toBeNull()
  })

  it('lists with pagination and sort name asc', () => {
    createMany()
    const res = repo.list({ sort: 'name', dir: 'asc', page: 1, limit: 10 })
    expect(res.total).toBe(3)
    expect(res.data.map(c => c.name)).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('lists with sort name desc', () => {
    createMany()
    const res = repo.list({ sort: 'name', dir: 'desc', page: 1, limit: 10 })
    expect(res.data.map(c => c.name)).toEqual(['Charlie', 'Bob', 'Alice'])
  })

  it('lists with sort createdAt asc', () => {
    createMany()
    const res = repo.list({ sort: 'createdAt', dir: 'asc', page: 1, limit: 10 })
    expect(res.data.map(c => c.name)).toEqual(['Charlie', 'Alice', 'Bob'])
  })

  it('lists with sort createdAt desc', () => {
    createMany()
    const res = repo.list({ sort: 'createdAt', dir: 'desc', page: 1, limit: 10 })
    expect(res.data.map(c => c.name)).toEqual(['Bob', 'Alice', 'Charlie'])
  })

  it('paginates correctly', () => {
    createMany()
    const page1 = repo.list({ sort: 'name', dir: 'asc', page: 1, limit: 2 })
    expect(page1.data.map(c => c.name)).toEqual(['Alice', 'Bob'])
    expect(page1.totalPages).toBe(2)

    const page2 = repo.list({ sort: 'name', dir: 'asc', page: 2, limit: 2 })
    expect(page2.data.map(c => c.name)).toEqual(['Charlie'])
  })

  it('updates fields and bumps updatedAt', () => {
    const c = repo.create('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', { name: 'Ada' }, NOW)
    const later = '2026-04-20T12:00:00.000Z'
    const updated = repo.update(c.id, { email: 'ada@x.com' }, later)
    expect(updated).toMatchObject({ name: 'Ada', email: 'ada@x.com', createdAt: NOW, updatedAt: later })
  })

  it('update returns null for missing id', () => {
    expect(repo.update('00000000-0000-0000-0000-000000000000', { name: 'x' }, NOW)).toBeNull()
  })

  it('deletes an existing contact', () => {
    const c = repo.create('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', { name: 'Ada' }, NOW)
    expect(repo.delete(c.id)).toBe(true)
    expect(repo.get(c.id)).toBeNull()
  })

  it('delete returns false for missing id', () => {
    expect(repo.delete('00000000-0000-0000-0000-000000000000')).toBe(false)
  })

  it('allows null email/phone to be set explicitly via update', () => {
    const c = repo.create('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', { name: 'Ada', email: 'ada@x.com' }, NOW)
    const updated = repo.update(c.id, { email: null }, NOW)
    expect(updated?.email).toBeNull()
  })
})
