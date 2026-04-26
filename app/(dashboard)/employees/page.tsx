import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmployeesClient from '@/components/employees/EmployeesClient'
import type { Employee, EmployeeTimeLog, Project } from '@/types'

export const metadata = { title: 'Employees — Traklaim' }

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single()
  const companyId = (profile as any)?.company_id

  const [{ data: employees }, { data: timeLogs }, { data: projects }] = await Promise.all([
    supabase.from('employees').select('*').eq('company_id', companyId).order('full_name'),
    supabase.from('employee_time_logs').select('*').eq('company_id', companyId).order('week_start', { ascending: false }),
    supabase.from('projects').select('id, name, status').eq('company_id', companyId).order('name'),
  ])

  return (
    <EmployeesClient
      employees={(employees ?? []) as Employee[]}
      timeLogs={(timeLogs ?? []) as EmployeeTimeLog[]}
      projects={(projects ?? []) as Pick<Project, 'id' | 'name' | 'status'>[]}
      companyId={companyId}
      role={(profile as any)?.role}
      currentUserId={user.id}
    />
  )
}
