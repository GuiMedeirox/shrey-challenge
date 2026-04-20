import { randomUUID } from 'node:crypto'
import { env } from '../src/config/env.js'
import { openDatabase } from '../src/db/connection.js'
import { normalizePhone } from '../src/lib/phone.js'

const FIRST_NAMES = [
  'Ava', 'Liam', 'Olivia', 'Noah', 'Emma', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Lucas',
  'Mia', 'Jackson', 'Charlotte', 'Aiden', 'Amelia', 'Elijah', 'Harper', 'Logan', 'Evelyn', 'James',
  'Abigail', 'Benjamin', 'Emily', 'Alexander', 'Ella', 'Michael', 'Avery', 'Daniel', 'Sofia', 'Henry',
  'Camila', 'Jacob', 'Aria', 'Sebastian', 'Scarlett', 'Matthew', 'Victoria', 'David', 'Madison', 'Joseph',
  'Luna', 'Samuel', 'Grace', 'Carter', 'Chloe', 'Owen', 'Penelope', 'Wyatt', 'Layla', 'John',
  'Riley', 'Julian', 'Zoey', 'Levi', 'Nora', 'Isaac', 'Lily', 'Gabriel', 'Eleanor', 'Jayden',
  'Hannah', 'Mateo', 'Lillian', 'Anthony', 'Addison', 'Dylan', 'Aubrey', 'Leo', 'Ellie', 'Lincoln',
  'Stella', 'Jaxon', 'Natalie', 'Asher', 'Zoe', 'Christopher', 'Leah', 'Joshua', 'Hazel', 'Andrew',
  'Violet', 'Thomas', 'Aurora', 'Charles', 'Savannah', 'Ryan', 'Audrey', 'Nathan', 'Brooklyn', 'Hunter',
  'Bella', 'Caleb', 'Claire', 'Christian', 'Skylar', 'Isaiah', 'Lucy', 'Dominic', 'Paisley', 'Adrian',
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
]

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!

const pad = (n: number, width: number) => String(n).padStart(width, '0')

function randomPhone(): string {
  const area = 200 + Math.floor(Math.random() * 800)
  const mid = 200 + Math.floor(Math.random() * 800)
  const end = Math.floor(Math.random() * 10000)
  return `+1 (${area}) ${mid}-${pad(end, 4)}`
}

function main() {
  const args = process.argv.slice(2)
  const reset = args.includes('--reset')
  const countArg = args.find((a) => !a.startsWith('--'))
  const count = Number(countArg ?? 200)
  if (!Number.isFinite(count) || count <= 0) {
    console.error(`Invalid count: ${countArg}`)
    process.exit(1)
  }

  openDatabase(env.DB_PATH).then(({ db, persist, close }) => {
    if (reset) {
      db.exec('DELETE FROM contacts')
      console.log('Cleared existing contacts.')
    }

    const existingStmt = db.prepare('SELECT COUNT(*) AS n FROM contacts')
    existingStmt.step()
    const existing = (existingStmt.getAsObject() as { n: number }).n
    existingStmt.free()

    const maxStmt = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM contacts')
    maxStmt.step()
    const maxSort = (maxStmt.getAsObject() as { m: number }).m
    maxStmt.free()

    const usedPhonesStmt = db.prepare('SELECT phone_normalized FROM contacts WHERE phone_normalized IS NOT NULL')
    const usedPhones = new Set<string>()
    while (usedPhonesStmt.step()) {
      usedPhones.add((usedPhonesStmt.getAsObject() as { phone_normalized: string }).phone_normalized)
    }
    usedPhonesStmt.free()

    const started = Date.now()
    db.exec('BEGIN')
    try {
      const insert = db.prepare(
        `INSERT INTO contacts (id, name, email, phone, phone_normalized, photo, sort_order, created_at, updated_at)
         VALUES (:id, :name, :email, :phone, :phoneNormalized, NULL, :sortOrder, :now, :now)`
      )
      for (let i = 0; i < count; i++) {
        const first = pick(FIRST_NAMES)
        const last = pick(LAST_NAMES)
        const name = `${first} ${last}`
        const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`
        const now = new Date(Date.now() - Math.floor(Math.random() * 90 * 86_400_000)).toISOString()
        let phone = randomPhone()
        let normalized = normalizePhone(phone)
        while (normalized && usedPhones.has(normalized)) {
          phone = randomPhone()
          normalized = normalizePhone(phone)
        }
        if (normalized) usedPhones.add(normalized)
        insert.run({
          ':id': randomUUID(),
          ':name': name,
          ':email': email,
          ':phone': phone,
          ':phoneNormalized': normalized,
          ':sortOrder': maxSort + 1 + i,
          ':now': now,
        })
      }
      insert.free()
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }

    persist()
    const elapsed = Date.now() - started
    console.log(`Seeded ${count} contacts in ${elapsed}ms (was ${existing}, now ${existing + count}).`)
    close()
  }).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

main()
