import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpensesClient from '@/components/expenses/ExpensesClient'
import type { Expense, Project } from '@/types'

export const metadata = { title: 'Expenses — Traklaim' }

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single()
  const companyId = (profile as any)?.company_id

  const [{ data: expenses }, { data: projects }] = await Promise.all([
    supabase.from('expenses').select('*').eq('company_id', companyId).order('date', { ascending: false }),
    supabase.from('projects').select('id, name, status').eq('company_id', companyId).order('name'),
  ])

  return (
    <ExpensesClient
      expenses={(expenses ?? []) as Expense[]}
      projects={(projects ?? []) as Pick<Project, 'id' | 'name' | 'status'>[]}
      companyId={companyId}
      role={(profile as any)?.role}
    />
  )
}
