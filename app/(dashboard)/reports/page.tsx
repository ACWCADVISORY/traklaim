import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from '@/components/reports/ReportsClient'
import { computeEligibilityScore, estimatedRefund } from '@/lib/eligibilityScore'
import { formatCurrency } from '@/lib/utils'
import type { Project, Employee, EmployeeTimeLog, Expense } from '@/types'

export const metadata = { title: 'Reports — Traklaim' }

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single()
  const companyId = (profile as any)?.company_id

  const [
    { data: projectsRaw },
    { data: employeesRaw },
    { data: timeLogsRaw },
    { data: expensesRaw },
    { data: company },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('company_id', companyId),
    supabase.from('employees').select('*').eq('company_id', companyId),
    supabase.from('employee_time_logs').select('*').eq('company_id', companyId),
    supabase.from('expenses').select('*').eq('company_id', companyId),
    supabase.from('companies').select('name').eq('id', companyId).single(),
  ])

  const projects = (projectsRaw ?? []) as Project[]
  const employees = (employeesRaw ?? []) as Employee[]
  const timeLogs = (timeLogsRaw ?? []) as EmployeeTimeLog[]
  const expenses = (expensesRaw ?? []) as Expense[]

  const score = computeEligibilityScore({ projects, employees, timeLogs, expenses })
  const refund = estimatedRefund(expenses, employees)

  const summary = {
    companyName: (company as any)?.name ?? 'Your Company',
    score: score.total,
    grade: score.grade,
    grade_label: score.grade_label,
    estimatedRefund: formatCurrency(refund),
    projectCount: projects.length,
    eligibleProjectCount: projects.filter(p => p.sred_eligibility === 'Eligible').length,
    employeeCount: employees.length,
    expenseCount: expenses.length,
    totalEligibleSalary: formatCurrency(employees.reduce((s, e) => s + ((e.annual_salary ?? 0) * (e.sred_time_percentage ?? 0) / 100), 0)),
    totalEligibleExpenses: formatCurrency(expenses.reduce((s, e) => s + (e.amount * e.sred_eligible_percentage / 100), 0)),
  }

  return <ReportsClient summary={summary} companyId={companyId} />
}
