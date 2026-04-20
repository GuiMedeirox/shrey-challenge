import { createHash } from 'node:crypto'
import type { Database } from 'sql.js'
import { IdempotencyConflictError } from '../lib/errors.js'

export interface StoredResponse {
  status: number
  body: unknown
}

export function hashRequest(method: string, url: string, body: unknown): string {
  const serialized = JSON.stringify({ method, url, body: body ?? null })
  return createHash('sha256').update(serialized).digest('hex')
}

export class IdempotencyService {
  constructor(
    private readonly db: Database,
    private readonly ttlHours: number,
    private readonly persist: () => void = () => {},
    private readonly now: () => Date = () => new Date()
  ) {}

  lookup(key: string, requestHash: string): StoredResponse | null {
    this.purgeExpired()

    const stmt = this.db.prepare(
      'SELECT request_hash, response_status, response_body FROM idempotency_keys WHERE key = :key'
    )
    stmt.bind({ ':key': key })
    const row = stmt.step() ? (stmt.getAsObject() as { request_hash: string; response_status: number; response_body: string }) : null
    stmt.free()

    if (!row) return null
    if (row.request_hash !== requestHash) throw new IdempotencyConflictError()
    return { status: row.response_status, body: JSON.parse(row.response_body) }
  }

  store(key: string, requestHash: string, response: StoredResponse): void {
    const stmt = this.db.prepare(
      `INSERT INTO idempotency_keys (key, request_hash, response_status, response_body, created_at)
       VALUES (:key, :hash, :status, :body, :createdAt)`
    )
    stmt.run({
      ':key': key,
      ':hash': requestHash,
      ':status': response.status,
      ':body': JSON.stringify(response.body),
      ':createdAt': this.now().toISOString(),
    })
    stmt.free()
    this.persist()
  }

  private purgeExpired(): void {
    const cutoff = new Date(this.now().getTime() - this.ttlHours * 3600 * 1000).toISOString()
    const stmt = this.db.prepare('DELETE FROM idempotency_keys WHERE created_at < :cutoff')
    stmt.run({ ':cutoff': cutoff })
    stmt.free()
  }
}
