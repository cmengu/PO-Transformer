'use server'

import { redirect } from 'next/navigation'
import { parseCredentials } from '@/auth/credentials'
import { createClient } from '@/lib/supabase/server'

export type LoginState = {
  error?: string
}

export async function signIn(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const credentials = parseCredentials({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!credentials) return { error: 'Enter a valid email address and password.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(credentials)
  if (error) return { error: 'Invalid email or password.' }

  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
