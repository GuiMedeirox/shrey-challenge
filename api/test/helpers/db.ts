import { openDatabase, type DbHandle } from '../../src/db/connection.js'

export async function makeTestDb(): Promise<DbHandle> {
  return openDatabase(':memory:')
}
