import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/')

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4efe6] px-6 py-12 text-[#1c1917]">
      <section className="w-full max-w-sm rounded-2xl border border-[#d6d0c6] bg-[#fffdf9] p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a2e22]">PO Transformer</p>
        <h1 className="mt-2 font-serif text-3xl">Pilot sign in</h1>
        <p className="mt-2 text-sm text-[#5c564e]">Use the account provided by your project team.</p>
        <LoginForm />
      </section>
    </main>
  )
}
