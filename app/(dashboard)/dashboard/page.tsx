import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { computeEligibilityScore, gradeColor, gradeBg, estimatedRefund } from '@/lib/eligibilityScore'
import { formatCurrency } from '@/lib/utils'
import { ArrowRight, TrendingUp, Users, FolderOpen, Receipt, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Project, Employee, EmployeeTimeLog, Expense } from '@/types'

export const metadata = { title: 'Dashboard — Traklaim' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('company_id, full_name').eq('id', user.id).single()
  const companyId = (profile as any)?.company_id

  const [
    { data: projectsRaw },
    { data: employeesRaw },
    { data: timeLogsRaw },
    { data: expensesRaw },
    { data: company },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('company_id', companyId).order('created_at'),
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

  const eligibleProjects = projects.filter(p => p.sred_eligibility === 'Eligible')
  const totalSalary = employees.reduce((s, e) => s + ((e.annual_salary ?? 0) * (e.sred_time_percentage ?? 0) / 100), 0)
  const totalContractor = expenses.filter(e => e.category === 'Contractor Costs').reduce((s, e) => s + (e.amount * e.sred_eligible_percentage / 100), 0)
  const totalMaterials = expenses.filter(e => e.category !== 'Contractor Costs').reduce((s, e) => s + (e.amount * e.sred_eligible_percentage / 100), 0)

  const failing = score.criteria.filter(c => !c.complete)

  const gradeColorClass = gradeColor(score.grade)
  const gradeBgClass = gradeBg(score.grade)

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-slate-400 mb-1">{(company as any)?.name ?? 'Your Company'}</p>
        <h1 className="text-2xl font-bold text-white">SR&ED Dashboard</h1>
        <p className="text-slate-400 mt-1">Real-time view of your claim readiness.</p>
      </div>

      {/* Score + Metrics row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Eligibility Score — spans 1 col */}
        <div className={`bg-navy-800 border rounded-2xl p-6 flex flex-col items-center text-center ${gradeBgClass}`}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">SR&ED Eligibility Score</p>
          <div className={`text-7xl font-black mb-1 ${gradeColorClass}`}>{score.total}</div>
          <div className="text-slate-400 text-sm mb-3">out of 100</div>
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold ${gradeBgClass} ${gradeColorClass}`}>
            <span className="text-lg">{score.grade}</span>
            <span className="font-medium text-xs">{score.grade_label}</span>
          </div>
          <div className="w-full mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Projects', val: score.projects_score, max: 40 },
              { label: 'Employees', val: score.employees_score, max: 35 },
              { label: 'Expenses', val: score.expenses_score, max: 25 },
            ].map(s => (
              <div key={s.label}>
                <div className="text-white font-bold text-lg">{s.val}<span className="text-slate-500 text-xs">/{s.max}</span></div>
                <div className="text-slate-500 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right metrics */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[
            { label: 'Estimated Refund', value: formatCurrency(refund), sub: '35% federal ITC (CCPC rate)', icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-400/10' },
            { label: 'Eligible Salary Costs', value: formatCurrency(totalSalary), sub: `${employees.length} employee${employees.length !== 1 ? 's' : ''} tracked`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'Eligible Contractor Costs', value: formatCurrency(totalContractor), sub: 'SR&ED-tagged contractor invoices', icon: Receipt, color: 'text-violet-400', bg: 'bg-violet-400/10' },
            { label: 'Eligible Material Costs', value: formatCurrency(totalMaterials), sub: `${eligibleProjects.length} eligible project${eligibleProjects.length !== 1 ? 's' : ''}`, icon: FolderOpen, color: 'text-orange-400', bg: 'bg-orange-400/10' },
          ].map(m => (
            <div key={m.label} className="bg-navy-800 border border-navy-600 rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center mb-3`}>
                <m.icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <p className="text-white font-bold text-xl">{m.value}</p>
              <p className="text-xs font-medium text-slate-300 mt-0.5">{m.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What's dragging it down */}
      <div className="bg-navy-800 border border-navy-600 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-600">
          <h2 className="text-base font-semibold text-white">
            {failing.length === 0 ? 'All criteria met' : `${failing.length} item${failing.length !== 1 ? 's' : ''} dragging your score down`}
          </h2>
        </div>
        {failing.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-teal-400 mb-3" />
            <p className="text-white font-semibold">Your claim is ready</p>
            <p className="text-slate-400 text-sm mt-1">All SR&ED criteria are met. Generate your report when ready.</p>
            <Link href="/reports" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors">
              Generate Report <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-navy-600/60">
            {failing.map(c => (
              <div key={c.id} className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-navy-700/40 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">{c.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-500">−{c.max_points} pts</span>
                  <Link href={c.fix_href} className="inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 font-medium whitespace-nowrap">
                    Fix <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
