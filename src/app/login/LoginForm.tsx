'use client'

import { useActionState } from 'react'
import { signIn, type LoginState } from './actions'

const initialState: LoginState = {}

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initialState)

  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm font-medium" htmlFor="email">
        Email
        <input
          autoComplete="email"
          className="mt-1 w-full rounded-xl border border-[#c4b8a6] bg-[#faf6ef] px-3 py-2 outline-none"
          id="email"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="block text-sm font-medium" htmlFor="password">
        Password
        <input
          autoComplete="current-password"
          className="mt-1 w-full rounded-xl border border-[#c4b8a6] bg-[#faf6ef] px-3 py-2 outline-none"
          id="password"
          name="password"
          required
          type="password"
        />
      </label>
      {state.error && <p className="text-sm text-[#9c1c1c]" role="alert">{state.error}</p>}
      <button
        className="w-full rounded-xl bg-[#1c1917] px-4 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
