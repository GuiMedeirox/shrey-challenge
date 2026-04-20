import initSqlJs, { type Database } from 'sql.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { normalizePhone } from '../lib/phone.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = join(__dirname, 'schema.sql')

function migrate(db: Database): void {
  const stmt = db.prepare("PRAGMA table_info(contacts)")
  const columns: string[] = []
  while (stmt.step()) {
    columns.push((stmt.getAsObject() as { name: string }).name)
  }
  stmt.free()

  if (!columns.includes('phone_normalized')) {
    db.exec('ALTER TABLE contacts ADD COLUMN phone_normalized TEXT')

    const rows: { id: string; phone: string | null }[] = []
    const read = db.prepare('SELECT id, phone FROM contacts WHERE phone IS NOT NULL')
    while (read.step()) {
      rows.push(read.getAsObject() as { id: string; phone: string | null })
    }
    read.free()

    const seen = new Set<string>()
    const update = db.prepare('UPDATE contacts SET phone_normalized = :norm WHERE id = :id')
    for (const row of rows) {
      const norm = normalizePhone(row.phone)
      if (!norm || seen.has(norm)) continue
      seen.add(norm)
      update.run({ ':id': row.id, ':norm': norm })
    }
    update.free()
  }

  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_phone_normalized
     ON contacts(phone_normalized) WHERE phone_normalized IS NOT NULL`
  )
}

export interface DbHandle {
  db: Database
  persist: () => void
  close: () => void
}

export async function openDatabase(dbPath: string | ':memory:'): Promise<DbHandle> {
  const SQL = await initSqlJs()
  const inMemory = dbPath === ':memory:'

  let db: Database
  if (!inMemory && existsSync(dbPath)) {
    const buf = readFileSync(dbPath)
    db = new SQL.Database(buf)
  } else {
    db = new SQL.Database()
  }

  const schema = readFileSync(SCHEMA_PATH, 'utf8')
  db.exec(schema)
  migrate(db)

  if (!inMemory) {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }

  const persist = () => {
    if (inMemory) return
    const data = db.export()
    writeFileSync(dbPath, data)
  }

  const close = () => {
    persist()
    db.close()
  }

  persist()
  return { db, persist, close }
}
