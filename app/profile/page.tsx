import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/profile-form'
import { getDisplayName, NAME_MAX } from '@/lib/db/profiles'
import { getUserIdentity } from '@/lib/supabase/server'

/** The learner's name, which they can change, and their email, which they can't yet. Opened from the menu. */
export default async function ProfilePage() {
  const user = await getUserIdentity()
  if (!user)
    redirect('/login')
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <ProfileForm name={await getDisplayName(user.id) ?? ''} email={user.email} nameMax={NAME_MAX} />
    </main>
  )
}
