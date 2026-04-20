import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  DB_PATH: z.string().default('./data/contacts.sqlite'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  IDEMPOTENCY_TTL_HOURS: z.coerce.number().int().positive().default(24),
  CORS_ORIGIN: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export const env: Env = envSchema.parse(process.env)
