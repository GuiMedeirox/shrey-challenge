import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { DbHandle } from '../../src/db/connection.js'
import { buildApp } from '../../src/app.js'

let app: Express
let db: DbHandle

beforeEach(async () => {
  const built = await buildApp({ dbPath: ':memory:' })
  app = built.app
  db = built.db
})

afterEach(() => db.close())

const seed = async (name: string, extra: Record<string, unknown> = {}) => {
  const res = await request(app).post('/contacts').send({ name, ...extra })
  expect(res.status).toBe(201)
  return res.body
}

describe('Contacts API - CRUD', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('POST creates a contact', async () => {
    const res = await request(app).post('/contacts').send({ name: 'Ada', email: 'ada@x.com' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Ada', email: 'ada@x.com', phone: null })
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('POST rejects invalid body', async () => {
    const res = await request(app).post('/contacts').send({ email: 'nope' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('POST rejects duplicate phone across formats', async () => {
    await seed('Alice', { phone: '(555) 123-4567' })
    const res = await request(app).post('/contacts').send({ name: 'Bob', phone: '+1 555 123 4567' })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('CONFLICT')
  })

  it('PATCH rejects duplicate phone on update', async () => {
    await seed('Alice', { phone: '(555) 123-4567' })
    const bob = await seed('Bob', { phone: '(555) 999-0000' })
    const res = await request(app).patch(`/contacts/${bob.id}`).send({ phone: '5551234567' })
    expect(res.status).toBe(409)
  })

  it('POST allows multiple contacts with null phone', async () => {
    const a = await seed('Alice')
    const b = await seed('Bob')
    expect(a.phone).toBeNull()
    expect(b.phone).toBeNull()
  })

  it('GET /contacts/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/contacts/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })

  it('GET /contacts/:id rejects non-uuid', async () => {
    const res = await request(app).get('/contacts/not-a-uuid')
    expect(res.status).toBe(400)
  })

  it('PATCH updates a contact', async () => {
    const c = await seed('Ada')
    const res = await request(app).patch(`/contacts/${c.id}`).send({ name: 'Ada Lovelace' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Ada Lovelace')
  })

  it('DELETE removes a contact', async () => {
    const c = await seed('Ada')
    const del = await request(app).delete(`/contacts/${c.id}`)
    expect(del.status).toBe(204)
    const get = await request(app).get(`/contacts/${c.id}`)
    expect(get.status).toBe(404)
  })
})

describe('Contacts API - pagination & sort', () => {
  const seedThree = async () => {
    await seed('Charlie')
    await new Promise(r => setTimeout(r, 5))
    await seed('Alice')
    await new Promise(r => setTimeout(r, 5))
    await seed('Bob')
  }

  it('defaults to manual sort_order (insertion order)', async () => {
    await seedThree()
    const res = await request(app).get('/contacts')
    expect(res.status).toBe(200)
    expect(res.body.data.map((c: { name: string }) => c.name)).toEqual(['Charlie', 'Alice', 'Bob'])
    expect(res.body).toMatchObject({ page: 1, total: 3, totalPages: 1 })
  })

  it('sorts by name asc', async () => {
    await seedThree()
    const res = await request(app).get('/contacts?sort=name&dir=asc')
    expect(res.body.data.map((c: { name: string }) => c.name)).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('sorts by name desc', async () => {
    await seedThree()
    const res = await request(app).get('/contacts?sort=name&dir=desc')
    expect(res.body.data.map((c: { name: string }) => c.name)).toEqual(['Charlie', 'Bob', 'Alice'])
  })

  it('sorts by createdAt asc', async () => {
    await seedThree()
    const res = await request(app).get('/contacts?sort=createdAt&dir=asc')
    expect(res.body.data.map((c: { name: string }) => c.name)).toEqual(['Charlie', 'Alice', 'Bob'])
  })

  it('paginates with page & limit', async () => {
    await seedThree()
    const page1 = await request(app).get('/contacts?sort=name&dir=asc&page=1&limit=2')
    expect(page1.body.data.map((c: { name: string }) => c.name)).toEqual(['Alice', 'Bob'])
    expect(page1.body.totalPages).toBe(2)

    const page2 = await request(app).get('/contacts?sort=name&dir=asc&page=2&limit=2')
    expect(page2.body.data.map((c: { name: string }) => c.name)).toEqual(['Charlie'])
  })

  it('rejects invalid sort field', async () => {
    const res = await request(app).get('/contacts?sort=phone')
    expect(res.status).toBe(400)
  })
})

describe('Contacts API - reorder', () => {
  const seedThree = async () => {
    const a = await seed('Alpha')
    const b = await seed('Bravo')
    const c = await seed('Charlie')
    return { a, b, c }
  }

  it('reorders and persists new order', async () => {
    const { a, b, c } = await seedThree()
    const res = await request(app)
      .put('/contacts/reorder')
      .send({ items: [{ id: c.id, sortOrder: 0 }, { id: a.id, sortOrder: 1 }, { id: b.id, sortOrder: 2 }] })
    expect(res.status).toBe(204)

    const list = await request(app).get('/contacts')
    expect(list.body.data.map((x: { id: string }) => x.id)).toEqual([c.id, a.id, b.id])
  })

  it('rejects reorder with unknown id', async () => {
    const { a, b } = await seedThree()
    const res = await request(app)
      .put('/contacts/reorder')
      .send({
        items: [
          { id: a.id, sortOrder: 0 },
          { id: b.id, sortOrder: 1 },
          { id: '00000000-0000-0000-0000-000000000000', sortOrder: 2 },
        ],
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
  })

  it('rejects reorder with duplicate ids', async () => {
    const { a } = await seedThree()
    const res = await request(app)
      .put('/contacts/reorder')
      .send({ items: [{ id: a.id, sortOrder: 0 }, { id: a.id, sortOrder: 1 }] })
    expect(res.status).toBe(400)
  })

  it('rejects reorder with empty items', async () => {
    const res = await request(app).put('/contacts/reorder').send({ items: [] })
    expect(res.status).toBe(400)
  })

  it('accepts partial reorder with absolute positions', async () => {
    const { a, b, c } = await seedThree()
    const res = await request(app)
      .put('/contacts/reorder')
      .send({ items: [{ id: a.id, sortOrder: 5 }] })
    expect(res.status).toBe(204)

    const list = await request(app).get('/contacts')
    expect(list.body.data.map((x: { id: string }) => x.id)).toEqual([b.id, c.id, a.id])
  })

  it('newly created contact appears at the end of the sort order', async () => {
    const { a, b, c } = await seedThree()
    await request(app)
      .put('/contacts/reorder')
      .send({ items: [{ id: c.id, sortOrder: 0 }, { id: a.id, sortOrder: 1 }, { id: b.id, sortOrder: 2 }] })
    const d = await seed('Delta')
    const list = await request(app).get('/contacts')
    expect(list.body.data.map((x: { id: string }) => x.id)).toEqual([c.id, a.id, b.id, d.id])
  })
})

describe('Contacts API - photo', () => {
  const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

  it('accepts a valid photo data URL', async () => {
    const res = await request(app).post('/contacts').send({ name: 'Ada', photo: TINY_PNG })
    expect(res.status).toBe(201)
    expect(res.body.photo).toBe(TINY_PNG)
  })

  it('rejects a non-data-url photo', async () => {
    const res = await request(app).post('/contacts').send({ name: 'Ada', photo: 'https://example.com/a.png' })
    expect(res.status).toBe(400)
  })

  it('allows clearing photo via PATCH with null', async () => {
    const c = await seed('Ada', { photo: TINY_PNG })
    const res = await request(app).patch(`/contacts/${c.id}`).send({ photo: null })
    expect(res.status).toBe(200)
    expect(res.body.photo).toBeNull()
  })
})

describe('Contacts API - idempotency', () => {
  it('replays POST response for same key + same body', async () => {
    const key = '11111111-1111-1111-1111-111111111111'
    const first = await request(app).post('/contacts').set('Idempotency-Key', key).send({ name: 'Ada' })
    expect(first.status).toBe(201)

    const second = await request(app).post('/contacts').set('Idempotency-Key', key).send({ name: 'Ada' })
    expect(second.status).toBe(201)
    expect(second.body).toEqual(first.body)

    const list = await request(app).get('/contacts')
    expect(list.body.total).toBe(1)
  })

  it('rejects with 422 on key reuse with different body', async () => {
    const key = '11111111-1111-1111-1111-111111111111'
    await request(app).post('/contacts').set('Idempotency-Key', key).send({ name: 'Ada' })
    const conflict = await request(app).post('/contacts').set('Idempotency-Key', key).send({ name: 'Bob' })
    expect(conflict.status).toBe(422)
    expect(conflict.body.error).toBe('IDEMPOTENCY_KEY_CONFLICT')
  })

  it('replays PATCH response for same key + same body', async () => {
    const c = await seed('Ada')
    const key = '22222222-2222-2222-2222-222222222222'
    const first = await request(app).patch(`/contacts/${c.id}`).set('Idempotency-Key', key).send({ name: 'Ada Lovelace' })
    expect(first.status).toBe(200)

    const second = await request(app).patch(`/contacts/${c.id}`).set('Idempotency-Key', key).send({ name: 'Ada Lovelace' })
    expect(second.status).toBe(200)
    expect(second.body).toEqual(first.body)
  })

  it('different keys create separate records', async () => {
    await request(app).post('/contacts').set('Idempotency-Key', 'k-1').send({ name: 'Ada' })
    await request(app).post('/contacts').set('Idempotency-Key', 'k-2').send({ name: 'Ada' })
    const list = await request(app).get('/contacts')
    expect(list.body.total).toBe(2)
  })

  it('no key = no idempotency (creates new record each time)', async () => {
    await request(app).post('/contacts').send({ name: 'Ada' })
    await request(app).post('/contacts').send({ name: 'Ada' })
    const list = await request(app).get('/contacts')
    expect(list.body.total).toBe(2)
  })
})
