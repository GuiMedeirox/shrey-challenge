import type { Database } from 'sql.js'
import type { Contact, CreateContactInput, UpdateContactInput, ListContactsQuery, PagedResult } from '../domain/contact.js'
import { normalizePhone } from '../lib/phone.js'

function isUniquePhoneError(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed: contacts\.phone_normalized/i.test(err.message)
}

interface ContactRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  photo: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

const rowToContact = (r: ContactRow): Contact => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  photo: r.photo,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const SORT_COLUMNS = { name: 'name', createdAt: 'created_at', sortOrder: 'sort_order' } as const

export class ContactsRepo {
  constructor(private readonly db: Database) {}

  list(query: ListContactsQuery): PagedResult<Contact> {
    const column = SORT_COLUMNS[query.sort]
    const direction = query.dir === 'asc' ? 'ASC' : 'DESC'
    const offset = (query.page - 1) * query.limit

    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM contacts')
    totalStmt.step()
    const total = (totalStmt.getAsObject() as { count: number }).count
    totalStmt.free()

    const stmt = this.db.prepare(
      `SELECT id, name, email, phone, photo, sort_order, created_at, updated_at
       FROM contacts
       ORDER BY ${column} ${direction}, id ${direction}
       LIMIT :limit OFFSET :offset`
    )
    stmt.bind({ ':limit': query.limit, ':offset': offset })
    const data: Contact[] = []
    while (stmt.step()) data.push(rowToContact(stmt.getAsObject() as unknown as ContactRow))
    stmt.free()

    return {
      data,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    }
  }

  get(id: string): Contact | null {
    const stmt = this.db.prepare(
      'SELECT id, name, email, phone, photo, sort_order, created_at, updated_at FROM contacts WHERE id = :id'
    )
    stmt.bind({ ':id': id })
    const found = stmt.step() ? rowToContact(stmt.getAsObject() as unknown as ContactRow) : null
    stmt.free()
    return found
  }

  create(id: string, input: CreateContactInput, now: string): Contact {
    const maxStmt = this.db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM contacts')
    maxStmt.step()
    const sortOrder = (maxStmt.getAsObject() as { next: number }).next
    maxStmt.free()

    const stmt = this.db.prepare(
      `INSERT INTO contacts (id, name, email, phone, phone_normalized, photo, sort_order, created_at, updated_at)
       VALUES (:id, :name, :email, :phone, :phoneNormalized, :photo, :sortOrder, :createdAt, :updatedAt)`
    )
    try {
      stmt.run({
        ':id': id,
        ':name': input.name,
        ':email': input.email ?? null,
        ':phone': input.phone ?? null,
        ':phoneNormalized': normalizePhone(input.phone),
        ':photo': input.photo ?? null,
        ':sortOrder': sortOrder,
        ':createdAt': now,
        ':updatedAt': now,
      })
    } catch (err) {
      if (isUniquePhoneError(err)) throw new Error('DUPLICATE_PHONE')
      throw err
    } finally {
      stmt.free()
    }

    return {
      id,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      photo: input.photo ?? null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    }
  }

  update(id: string, patch: UpdateContactInput, now: string): Contact | null {
    const existing = this.get(id)
    if (!existing) return null

    const merged: Contact = {
      ...existing,
      ...('name' in patch && patch.name !== undefined ? { name: patch.name } : {}),
      ...('email' in patch ? { email: patch.email ?? null } : {}),
      ...('phone' in patch ? { phone: patch.phone ?? null } : {}),
      ...('photo' in patch ? { photo: patch.photo ?? null } : {}),
      updatedAt: now,
    }

    const stmt = this.db.prepare(
      `UPDATE contacts
       SET name = :name, email = :email, phone = :phone, phone_normalized = :phoneNormalized,
           photo = :photo, updated_at = :updatedAt
       WHERE id = :id`
    )
    try {
      stmt.run({
        ':id': id,
        ':name': merged.name,
        ':email': merged.email,
        ':phone': merged.phone,
        ':phoneNormalized': normalizePhone(merged.phone),
        ':photo': merged.photo,
        ':updatedAt': merged.updatedAt,
      })
    } catch (err) {
      if (isUniquePhoneError(err)) throw new Error('DUPLICATE_PHONE')
      throw err
    } finally {
      stmt.free()
    }
    return merged
  }

  delete(id: string): boolean {
    const existing = this.get(id)
    if (!existing) return false
    const stmt = this.db.prepare('DELETE FROM contacts WHERE id = :id')
    stmt.run({ ':id': id })
    stmt.free()
    return true
  }

  reorder(items: { id: string; sortOrder: number }[]): { reordered: number } {
    const ids = items.map((i) => i.id)
    const placeholders = ids.map(() => '?').join(',')
    const countStmt = this.db.prepare(`SELECT COUNT(*) AS count FROM contacts WHERE id IN (${placeholders})`)
    countStmt.bind(ids)
    countStmt.step()
    const matched = (countStmt.getAsObject() as { count: number }).count
    countStmt.free()
    if (matched !== ids.length) {
      throw new Error('UNKNOWN_IDS')
    }

    this.db.exec('BEGIN')
    try {
      const update = this.db.prepare('UPDATE contacts SET sort_order = :sortOrder WHERE id = :id')
      for (const { id, sortOrder } of items) {
        update.run({ ':id': id, ':sortOrder': sortOrder })
      }
      update.free()
      this.db.exec('COMMIT')
    } catch (err) {
      this.db.exec('ROLLBACK')
      throw err
    }
    return { reordered: items.length }
  }
}
