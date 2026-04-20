import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IdempotencyService, hashRequest } from '../../src/services/idempotency.service.js'
import { IdempotencyConflictError } from '../../src/lib/errors.js'
import { makeTestDb } from '../helpers/db.js'
import type { DbHandle } from '../../src/db/connection.js'

let dbh: DbHandle
let service: IdempotencyService
let now = new Date('2026-04-19T12:00:00.000Z')

beforeEach(async () => {
  dbh = await makeTestDb()
  now = new Date('2026-04-19T12:00:00.000Z')
  service = new IdempotencyService(dbh.db, 24, () => {}, () => now)
})

afterEach(() => dbh.close())

describe('IdempotencyService', () => {
  const hash = hashRequest('POST', '/contacts', { name: 'Ada' })

  it('returns null on miss', () => {
    expect(service.lookup('key-1', hash)).toBeNull()
  })

  it('stores and replays response', () => {
    service.store('key-1', hash, { status: 201, body: { id: 'x', name: 'Ada' } })
    const replayed = service.lookup('key-1', hash)
    expect(replayed).toEqual({ status: 201, body: { id: 'x', name: 'Ada' } })
  })

  it('throws conflict if hash differs', () => {
    service.store('key-1', hash, { status: 201, body: {} })
    const otherHash = hashRequest('POST', '/contacts', { name: 'Bob' })
    expect(() => service.lookup('key-1', otherHash)).toThrow(IdempotencyConflictError)
  })

  it('purges expired keys on lookup', () => {
    service.store('old-key', hash, { status: 201, body: {} })
    now = new Date(now.getTime() + 25 * 3600 * 1000)
    expect(service.lookup('old-key', hash)).toBeNull()
  })

  it('keeps keys within ttl', () => {
    service.store('fresh-key', hash, { status: 201, body: { ok: true } })
    now = new Date(now.getTime() + 23 * 3600 * 1000)
    expect(service.lookup('fresh-key', hash)).toEqual({ status: 201, body: { ok: true } })
  })
})

describe('hashRequest', () => {
  it('same request produces same hash', () => {
    expect(hashRequest('POST', '/x', { a: 1 })).toBe(hashRequest('POST', '/x', { a: 1 }))
  })

  it('different bodies produce different hashes', () => {
    expect(hashRequest('POST', '/x', { a: 1 })).not.toBe(hashRequest('POST', '/x', { a: 2 }))
  })
})
