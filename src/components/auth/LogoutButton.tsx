import { signOut } from '@/app/login/actions'

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        className="rounded-full border border-[#c4b8a6] px-3 py-1.5 text-xs font-medium hover:bg-[#eee7dc]"
        type="submit"
      >
        Sign out
      </button>
    </form>
  )
}
