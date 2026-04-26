'use client'

import { useState, useTransition } from 'react'
import { Plus, Receipt, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { Expense, ExpenseCategory, Project } from '@/types'
import { addExpense, updateExpense, deleteExpense } from '@/app/actions/expenses'

const CATEGORIES: ExpenseCategory[] = [
  'Contractor Costs',
  'Materials & Supplies',
  'Equipment',
  'Software & Cloud',
  'Travel & Field Work',
  'Other',
]

const CATEGORY_STYLES: Record<string, string> = {
  'Contractor Costs': 'text-violet-400 bg-violet-400/10',
  'Materials & Supplies': 'text-blue-400 bg-blue-400/10',
  'Equipment': 'text-teal-400 bg-teal-400/10',
  'Software & Cloud': 'text-cyan-400 bg-cyan-400/10',
  'Travel & Field Work': 'text-orange-400 bg-orange-400/10',
  'Other': 'text-slate-400 bg-slate-400/10',
}

interface Props {
  expenses: Expense[]
  projects: Pick<Project, 'id' | 'name' | 'status'>[]
  companyId: string
  role: string
}

export default function ExpensesClient({ expenses: initial, projects, companyId, role }: Props) {
  const [expenses, setExpenses] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [, startTransition] = useTransition()

  const canEdit = role === 'company'

  function handleSaved(expense: Expense) {
    setExpenses(prev => {
      const idx = prev.findIndex(e => e.id === expense.id)
      if (idx >= 0) { const u = [...prev]; u[idx] = expense; return u }
      return [expense, ...prev]
    })
    setShowForm(false)
    setEditing(null)
  }

  function handleDeleted(id: string) {
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const filtered = filterCategory === 'All' ? expenses : expenses.filter(e => e.category === filterCategory)
  const totalEligible = expenses.reduce((s, e) => s + (e.amount * e.sred_eligible_percentage / 100), 0)
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0)

  // Group by category for summary
  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
    eligible: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount * e.sred_eligible_percentage / 100), 0),
    count: expenses.filter(e => e.category === cat).length,
  })).filter(c => c.count > 0)

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · {formatCurrency(totalEligible)} eligible of {formatCurrency(totalAmount)} total
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setShowForm(true); setEditing(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        )}
      </div>

      {/* Category summary chips */}
      {byCategory.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setFilterCategory('All')}
            className={cn('text-xs px-3 py-1.5 rounded-full font-medium transition-colors', filterCategory === 'All' ? 'bg-teal-600 text-white' : 'bg-navy-700 text-slate-400 hover:text-white')}
          >
            All ({expenses.length})
          </button>
          {byCategory.map(c => (
            <button
              key={c.cat}
              onClick={() => setFilterCategory(filterCategory === c.cat ? 'All' : c.cat)}
              className={cn('text-xs px-3 py-1.5 rounded-full font-medium transition-colors', filterCategory === c.cat ? 'bg-teal-600 text-white' : 'bg-navy-700 text-slate-400 hover:text-white')}
            >
              {c.cat} ({c.count})
            </button>
          ))}
        </div>
      )}

      {(showForm || editing) && (
        <ExpenseForm
          expense={editing ?? undefined}
          companyId={companyId}
          projects={projects}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {expenses.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-navy-700 flex items-center justify-center mb-4">
            <Receipt className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-slate-300 font-medium">No expenses tracked</p>
          <p className="text-slate-500 text-sm mt-1">Log contractor invoices, materials, equipment, and other SR&ED-eligible costs.</p>
        </div>
      ) : (
        <div className="bg-navy-800 border border-navy-600 rounded-xl overflow-hidden">
          <div className="divide-y divide-navy-600/60">
            {filtered.map(exp => {
              const eligibleAmount = exp.amount * exp.sred_eligible_percentage / 100
              const proj = projects.find(p => p.id === exp.project_id)
              return (
                <div key={exp.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-navy-700/40 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">{exp.vendor}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', CATEGORY_STYLES[exp.category] ?? 'text-slate-400 bg-slate-400/10')}>{exp.category}</span>
                      {proj && <span className="text-xs text-slate-500">· {proj.name}</span>}
                    </div>
                    {exp.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{exp.description}</p>}
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(exp.date)}{exp.receipt_url ? ' · Receipt attached' : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white text-sm font-semibold">{formatCurrency(exp.amount)}</p>
                    <p className="text-xs text-teal-400">{formatCurrency(eligibleAmount)} eligible ({exp.sred_eligible_percentage}%)</p>
                  </div>
                  {canEdit && (
                    <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditing(exp); setShowForm(false) }}
                        className="p-1.5 rounded hover:bg-navy-600 text-slate-400 hover:text-white transition-colors text-xs font-medium px-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => startTransition(async () => { await deleteExpense(exp.id); handleDeleted(exp.id) })}
                        className="p-1.5 rounded hover:bg-red-400/10 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {filtered.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-sm">No expenses in this category.</div>
          )}
        </div>
      )}
    </div>
  )
}

function ExpenseForm({ expense, companyId, projects, onSaved, onCancel }: {
  expense?: Expense
  companyId: string
  projects: Pick<Project, 'id' | 'name' | 'status'>[]
  onSaved: (e: Expense) => void
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>(expense?.category ?? 'Materials & Supplies')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const data = {
      company_id: companyId,
      project_id: fd.get('project_id') as string || null,
      vendor: fd.get('vendor') as string,
      description: fd.get('description') as string || null,
      category: fd.get('category') as string,
      amount: Number(fd.get('amount')),
      date: fd.get('date') as string,
      sred_eligible_percentage: Number(fd.get('sred_eligible_percentage')),
      receipt_url: fd.get('receipt_url') as string || null,
      contractor_sred_hours: fd.get('contractor_sred_hours') ? Number(fd.get('contractor_sred_hours')) : null,
      notes: fd.get('notes') as string || null,
    }
    const result = expense ? await updateExpense(expense.id, data) : await addExpense(data)
    if ('error' in result) { setError(result.error); setLoading(false); return }
    onSaved(result.expense)
    setLoading(false)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-navy-700 border border-navy-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60'
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="bg-navy-800 border border-teal-500/30 rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{expense ? 'Edit Expense' : 'New Expense'}</h3>
        <button onClick={onCancel}><X className="w-4 h-4 text-slate-400 hover:text-white" /></button>
      </div>
      {error && <div className="mb-3 text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Vendor / Supplier *</label>
            <input name="vendor" required defaultValue={expense?.vendor} className={inputCls} placeholder="ACME Biotech Supplies" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Category *</label>
            <select name="category" defaultValue={expense?.category ?? 'Materials & Supplies'} className={inputCls} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <input name="description" defaultValue={expense?.description ?? ''} className={inputCls} placeholder="Brief description of the expense" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Amount (CAD) *</label>
            <input type="number" name="amount" required min="0.01" step="0.01" defaultValue={expense?.amount ?? ''} className={inputCls} placeholder="5000.00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Date *</label>
            <input type="date" name="date" required defaultValue={expense?.date ?? today} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">SR&ED eligible % *</label>
            <input type="number" name="sred_eligible_percentage" required min="0" max="100" defaultValue={expense?.sred_eligible_percentage ?? 100} className={inputCls} placeholder="100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Project</label>
            <select name="project_id" defaultValue={expense?.project_id ?? ''} className={inputCls}>
              <option value="">None</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {category === 'Contractor Costs' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Contractor SR&ED hours (for proxy method)</label>
              <input type="number" name="contractor_sred_hours" min="0" step="0.5" defaultValue={expense?.contractor_sred_hours ?? ''} className={inputCls} placeholder="e.g. 80" />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Receipt URL</label>
            <input name="receipt_url" type="url" defaultValue={expense?.receipt_url ?? ''} className={inputCls} placeholder="https://drive.google.com/…" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
            <input name="notes" defaultValue={expense?.notes ?? ''} className={inputCls} placeholder="Additional context for your accountant" />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-medium transition-colors">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {expense ? 'Save changes' : 'Add expense'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-navy-700 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  )
}
