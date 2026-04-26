'use client'

import { useState, useTransition } from 'react'
import { Plus, Users, ChevronDown, ChevronUp, X, Loader2, Clock, AlertCircle } from 'lucide-react'
import { cn, formatCurrency, getMondayOfWeek } from '@/lib/utils'
import type { Employee, EmployeeTimeLog, Project } from '@/types'
import { addEmployee, updateEmployee, deleteEmployee, addTimeLog, deleteTimeLog } from '@/app/actions/employees'

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract']

function employeeSREDCost(e: Employee): number {
  return ((e.annual_salary ?? 0) * (e.sred_time_percentage ?? 0)) / 100
}

interface Props {
  employees: Employee[]
  timeLogs: EmployeeTimeLog[]
  projects: Pick<Project, 'id' | 'name' | 'status'>[]
  companyId: string
  role: string
  currentUserId: string
}

export default function EmployeesClient({ employees: initial, timeLogs: initialLogs, projects, companyId, role, currentUserId }: Props) {
  const [employees, setEmployees] = useState(initial)
  const [timeLogs, setTimeLogs] = useState(initialLogs)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showLogForm, setShowLogForm] = useState<string | null>(null) // employee id
  const [, startTransition] = useTransition()

  const canEdit = role === 'company'
  // Employees can log their own time
  const canLogTime = role === 'company' || role === 'employee'

  function handleSaved(employee: Employee) {
    setEmployees(prev => {
      const idx = prev.findIndex(e => e.id === employee.id)
      if (idx >= 0) { const u = [...prev]; u[idx] = employee; return u }
      return [...prev, employee].sort((a, b) => a.full_name.localeCompare(b.full_name))
    })
    setShowForm(false)
    setEditing(null)
  }

  function handleDeleted(id: string) {
    setEmployees(prev => prev.filter(e => e.id !== id))
    setTimeLogs(prev => prev.filter(l => l.employee_id !== id))
  }

  function handleLogSaved(log: EmployeeTimeLog) {
    setTimeLogs(prev => {
      const idx = prev.findIndex(l => l.id === log.id)
      if (idx >= 0) { const u = [...prev]; u[idx] = log; return u }
      return [log, ...prev]
    })
    setShowLogForm(null)
  }

  function handleLogDeleted(id: string) {
    setTimeLogs(prev => prev.filter(l => l.id !== id))
  }

  const totalSREDCost = employees.reduce((s, e) => s + employeeSREDCost(e), 0)

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Employees</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {employees.length} employee{employees.length !== 1 ? 's' : ''} · {formatCurrency(totalSREDCost)} eligible salary
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setShowForm(true); setEditing(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
      </div>

      {(showForm || editing) && (
        <EmployeeForm
          employee={editing ?? undefined}
          companyId={companyId}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {employees.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-navy-700 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-slate-300 font-medium">No employees tracked</p>
          <p className="text-slate-500 text-sm mt-1">Add employees to calculate eligible salary costs for your SR&ED claim.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map(emp => {
            const logs = timeLogs.filter(l => l.employee_id === emp.id)
            const totalHrs = logs.reduce((s, l) => s + l.sred_hours, 0)
            const isOpen = expanded === emp.id
            const cost = employeeSREDCost(emp)

            return (
              <div key={emp.id} className="bg-navy-800 border border-navy-600 rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-navy-700/40 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : emp.id)}
                >
                  <div className="w-9 h-9 rounded-full bg-teal-600/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-teal-400 text-sm font-bold">{emp.full_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{emp.full_name}</span>
                      {emp.is_specified_employee && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-orange-400 bg-orange-400/10">Specified</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium text-slate-400 bg-slate-400/10">{emp.employment_type}</span>
                    </div>
                    {emp.title && <p className="text-slate-400 text-sm mt-0.5">{emp.title}</p>}
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-white text-sm font-semibold">{formatCurrency(cost)}</span>
                    <span className="text-slate-500 text-xs">{emp.sred_time_percentage ?? 0}% SR&ED · {logs.length} log{logs.length !== 1 ? 's' : ''}</span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>

                {isOpen && (
                  <div className="border-t border-navy-600 px-5 py-4 space-y-4">
                    {/* Employee details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Annual Salary', value: emp.annual_salary ? formatCurrency(emp.annual_salary) : '—' },
                        { label: 'SR&ED Time', value: `${emp.sred_time_percentage ?? 0}%` },
                        { label: 'Eligible Cost', value: formatCurrency(cost) },
                        { label: 'Total SR&ED Hrs', value: `${totalHrs.toFixed(1)} hrs` },
                      ].map(f => (
                        <div key={f.label}>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{f.label}</p>
                          <p className="text-sm text-slate-200 font-medium">{f.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Time logs */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Time Logs</p>
                        {canLogTime && (
                          <button
                            onClick={() => setShowLogForm(showLogForm === emp.id ? null : emp.id)}
                            className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 font-medium"
                          >
                            <Plus className="w-3 h-3" /> Log time
                          </button>
                        )}
                      </div>

                      {showLogForm === emp.id && (
                        <TimeLogForm
                          employeeId={emp.id}
                          companyId={companyId}
                          projects={projects}
                          onSaved={handleLogSaved}
                          onCancel={() => setShowLogForm(null)}
                        />
                      )}

                      {logs.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No time logged yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {logs.slice(0, 8).map(log => {
                            const proj = projects.find(p => p.id === log.project_id)
                            return (
                              <div key={log.id} className="flex items-start justify-between gap-3 bg-navy-700/60 rounded-lg px-3 py-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-slate-300">{log.week_start}</span>
                                    <span className="text-xs text-teal-400 font-semibold">{log.sred_hours} SR&ED hrs</span>
                                    {log.total_hours && <span className="text-xs text-slate-500">of {log.total_hours} total</span>}
                                    {proj && <span className="text-xs text-slate-400 truncate">· {proj.name}</span>}
                                  </div>
                                  {log.technical_obstacle && (
                                    <p className="text-xs text-slate-400 mt-0.5 truncate">{log.technical_obstacle}</p>
                                  )}
                                </div>
                                {canEdit && (
                                  <button
                                    onClick={() => startTransition(async () => { await deleteTimeLog(log.id); handleLogDeleted(log.id) })}
                                    className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )
                          })}
                          {logs.length > 8 && (
                            <p className="text-xs text-slate-500 text-center pt-1">+{logs.length - 8} more entries</p>
                          )}
                        </div>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex gap-2 pt-2 border-t border-navy-600">
                        <button
                          onClick={() => { setEditing(emp); setShowForm(false) }}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-navy-700 hover:bg-navy-600 text-slate-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => startTransition(async () => { await deleteEmployee(emp.id); handleDeleted(emp.id) })}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmployeeForm({ employee, companyId, onSaved, onCancel }: { employee?: Employee; companyId: string; onSaved: (e: Employee) => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const data = {
      company_id: companyId,
      full_name: fd.get('full_name') as string,
      title: fd.get('title') as string || null,
      employment_type: fd.get('employment_type') as string,
      annual_salary: fd.get('annual_salary') ? Number(fd.get('annual_salary')) : null,
      sred_time_percentage: fd.get('sred_time_percentage') ? Number(fd.get('sred_time_percentage')) : null,
      is_specified_employee: fd.get('is_specified_employee') === 'true',
    }
    const result = employee ? await updateEmployee(employee.id, data) : await addEmployee(data)
    if ('error' in result) { setError(result.error); setLoading(false); return }
    onSaved(result.employee)
    setLoading(false)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-navy-700 border border-navy-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60'

  return (
    <div className="bg-navy-800 border border-teal-500/30 rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{employee ? 'Edit Employee' : 'New Employee'}</h3>
        <button onClick={onCancel}><X className="w-4 h-4 text-slate-400 hover:text-white" /></button>
      </div>
      {error && <div className="mb-3 text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Full name *</label>
            <input name="full_name" required defaultValue={employee?.full_name} className={inputCls} placeholder="Jane Smith" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title / Role</label>
            <input name="title" defaultValue={employee?.title ?? ''} className={inputCls} placeholder="Research Scientist" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Employment type</label>
            <select name="employment_type" defaultValue={employee?.employment_type ?? 'Full-time'} className={inputCls}>
              {EMPLOYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Annual salary (CAD)</label>
            <input type="number" name="annual_salary" defaultValue={employee?.annual_salary ?? ''} className={inputCls} placeholder="120000" min="0" step="1000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">SR&ED time %</label>
            <input type="number" name="sred_time_percentage" defaultValue={employee?.sred_time_percentage ?? ''} className={inputCls} placeholder="60" min="0" max="100" />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_specified_employee"
                value="true"
                defaultChecked={employee?.is_specified_employee ?? false}
                className="w-4 h-4 rounded border-navy-600 bg-navy-700 text-teal-500 focus:ring-teal-500/20"
              />
              <span className="text-sm text-slate-300">Specified employee</span>
            </label>
          </div>
        </div>
        <div className="bg-navy-700/50 rounded-lg px-3 py-2">
          <p className="text-xs text-slate-400"><span className="text-teal-400 font-medium">Specified employee</span> = shareholder owning ≥10% of shares, or does not deal at arm's length with the corporation. Different salary cap applies under SR&ED rules.</p>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-medium transition-colors">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {employee ? 'Save changes' : 'Add employee'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-navy-700 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  )
}

function TimeLogForm({ employeeId, companyId, projects, onSaved, onCancel }: {
  employeeId: string
  companyId: string
  projects: Pick<Project, 'id' | 'name' | 'status'>[]
  onSaved: (log: EmployeeTimeLog) => void
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultWeek = getMondayOfWeek(new Date())
  const activeProjects = projects.filter(p => p.status === 'Active')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const data = {
      company_id: companyId,
      employee_id: employeeId,
      project_id: fd.get('project_id') as string,
      week_start: fd.get('week_start') as string,
      sred_hours: Number(fd.get('sred_hours')),
      total_hours: fd.get('total_hours') ? Number(fd.get('total_hours')) : null,
      technical_obstacle: fd.get('technical_obstacle') as string || null,
      hypothesis_tested: fd.get('hypothesis_tested') as string || null,
    }
    const result = await addTimeLog(data)
    if ('error' in result) { setError(result.error); setLoading(false); return }
    onSaved(result.log)
    setLoading(false)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-navy-700 border border-navy-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60'
  const textareaCls = `${inputCls} resize-none`

  return (
    <div className="bg-navy-700/60 border border-navy-600 rounded-xl p-4 mb-3">
      {error && <div className="mb-3 text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Project *</label>
            <select name="project_id" required className={inputCls}>
              <option value="">Select project…</option>
              {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              {activeProjects.length === 0 && projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Week of (Monday) *</label>
            <input type="date" name="week_start" required defaultValue={defaultWeek} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">SR&ED hours *</label>
            <input type="number" name="sred_hours" required min="0.5" max="168" step="0.5" className={inputCls} placeholder="32" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Total hours worked</label>
            <input type="number" name="total_hours" min="0.5" max="168" step="0.5" className={inputCls} placeholder="40" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Technical obstacle encountered</label>
            <textarea name="technical_obstacle" rows={2} className={textareaCls} placeholder="Describe the technological challenge or uncertainty you worked on this week…" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Hypothesis / approach tested</label>
            <textarea name="hypothesis_tested" rows={2} className={textareaCls} placeholder="What specific hypothesis or experimental approach did you test?" />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-medium transition-colors">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Log time
          </button>
          <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-navy-700 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  )
}
