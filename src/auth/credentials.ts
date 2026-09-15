import { z } from 'zod'

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

export type Credentials = z.infer<typeof credentialsSchema>

export function parseCredentials(value: unknown): Credentials | null {
  const result = credentialsSchema.safeParse(value)
  return result.success ? result.data : null
}
