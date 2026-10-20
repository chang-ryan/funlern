import Link from 'next/link'
import { redirect } from 'next/navigation'
import { WizardForm } from '@/components/plan/wizard-form'
import { getUserId } from '@/lib/supabase/server'

export default async function NewPlanPage() {
  if (!await getUserId())
    redirect('/login')
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
      <Link href="/" className="-ml-2 self-start rounded-lg px-2 py-1 text-sm text-muted hover:bg-tutor hover:text-foreground">← All plans</Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">New plan</h1>
        <p className="text-sm text-muted">Tell the tutor what you're after. It drafts a brief and a syllabus you can change later.</p>
      </header>
      <WizardForm />
    </main>
  )
}
