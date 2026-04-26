'use client'

import { useState, useTransition } from 'react'
import { Plus, FolderOpen, CheckCircle2, Clock, PauseCircle, AlertCircle, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project, ProjectStatus, SREDEligibility } from '@/types'
import { addProject, updateProject, deleteProject } from '@/app/actions/projects'

const STATUS_STYLES: Record<ProjectStatus, string> = {
  'Active': 'text-emerald-400 bg-emerald-400/10',
  'Completed': 'text-blue-400 bg-blue-400/10',
  'On Hold': 'text-amber-400 bg-amber-400/10',
}
const ELIGIBILITY_STYLES: Record<SREDEligibility, string> = {
  'Eligible': 'text-teal-400 bg-teal-400/10',
  'Partially Eligible': 'text-yellow-400 bg-yellow-400/10',
  'Under Review': 'text-orange-400 bg-orange-400/10',
  'Not Eligible': 'text-slate-400 bg-slate-400/10',
}

function docProgress(p: Project): number {
  const fields = [p.hypothesis, p.technological_uncertainty, p.experimental_approach, p.outcome]
  return Math.round((fields.filter(f => f && f.trim().length > 5).length / 4) * 100)
}

interface Props { projects: Project[]; companyId: string; role: string }

export default function ProjectsClient({ projects: initial, companyId, role }: Props) {
  const [projects, setProjects] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<Project | null>(null)
  const [, startTransition] = useTransition()

  const canEdit = role === 'company'

  function handleSaved(project: Project) {
    setProjects(prev => {
      const idx = prev.findIndex(p => p.id === project.id)
      if (idx >= 0) { const u = [...prev]; u[idx] = project; return u }
      return [project, ...prev]
    })
    setShowForm(false)
    setEditing(null)
  }

  function handleDeleted(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 text-sm mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''} tracked</p>
        </div>
        {canEdit && (
          <button onClick={() => { setShowForm(true); setEditing(null) }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Project
          </button>
        )}
      </div>

      {(showForm || editing) && (
        <ProjectForm
          project={editing ?? undefined}
          companyId={companyId}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {projects.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-navy-700 flex items-center justify-center mb-4">
            <FolderOpen className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-slate-300 font-medium">No projects yet</p>
          <p className="text-slate-500 text-sm mt-1">Add your first R&D project to start tracking SR&ED eligibility.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => {
            const prog = docProgress(p)
            const isOpen = expanded === p.id
            return (
              <div key={p.id} className="bg-navy-800 border border-navy-600 rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-navy-700/40 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold truncate">{p.name}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[p.status])}>{p.status}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ELIGIBILITY_STYLES[p.sred_eligibility])}>{p.sred_eligibility}</span>
                    </div>
                    {p.description && <p className="text-slate-400 text-sm mt-0.5 truncate">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <span className="text-xs text-slate-400">Documentation</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-navy-600 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', prog === 100 ? 'bg-teal-400' : prog >= 50 ? 'bg-yellow-400' : 'bg-orange-400')} style={{ width: `${prog}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{prog}%</span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-navy-600 px-5 py-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Hypothesis', value: p.hypothesis, key: 'hypothesis' },
                        { label: 'Technological Uncertainty', value: p.technological_uncertainty, key: 'uncertainty' },
                        { label: 'Experimental Approach', value: p.experimental_approach, key: 'approach' },
                        { label: 'Outcome', value: p.outcome, key: 'outcome' },
                      ].map(field => (
                        <div key={field.key}>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{field.label}</p>
                          {field.value ? (
                            <p className="text-sm text-slate-200 leading-relaxed">{field.value}</p>
                          ) : (
                            <p className="text-sm text-slate-500 italic">Not yet documented</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => { setEditing(p); setShowForm(false) }} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-navy-700 hover:bg-navy-600 text-slate-200 transition-colors">Edit</button>
                        <button onClick={() => startTransition(async () => { await deleteProject(p.id); handleDeleted(p.id) })} className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors">Delete</button>
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

function ProjectForm({ project, companyId, onSaved, onCancel }: { project?: Project; companyId: string; onSaved: (p: Project) => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const data = {
      company_id: companyId,
      name: fd.get('name') as string,
      description: fd.get('description') as string || null,
      start_date: fd.get('start_date') as string || null,
      status: fd.get('status') as ProjectStatus,
      sred_eligibility: fd.get('sred_eligibility') as SREDEligibility,
      hypothesis: fd.get('hypothesis') as string || null,
      technological_uncertainty: fd.get('technological_uncertainty') as string || null,
      experimental_approach: fd.get('experimental_approach') as string || null,
      outcome: fd.get('outcome') as string || null,
    }
    const result = project ? await updateProject(project.id, data) : await addProject(data)
    if ('error' in result) { setError(result.error); setLoading(false); return }
    onSaved(result.project as Project)
    setLoading(false)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-navy-700 border border-navy-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60'
  const textareaCls = `${inputCls} resize-none`

  return (
    <div className="bg-navy-800 border border-teal-500/30 rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{project ? 'Edit Project' : 'New Project'}</h3>
        <button onClick={onCancel}><X className="w-4 h-4 text-slate-400 hover:text-white" /></button>
      </div>
      {error && <div className="mb-3 text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Project name *</label>
            <input name="name" required defaultValue={project?.name} className={inputCls} placeholder="e.g. Novel enzyme formulation development" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea name="description" rows={2} defaultValue={project?.description ?? ''} className={textareaCls} placeholder="Brief overview of the project" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Start date</label>
            <input type="date" name="start_date" defaultValue={project?.start_date ?? ''} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
            <select name="status" defaultValue={project?.status ?? 'Active'} className={inputCls}>
              {['Active', 'Completed', 'On Hold'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">SR&ED Eligibility</label>
            <select name="sred_eligibility" defaultValue={project?.sred_eligibility ?? 'Under Review'} className={inputCls}>
              {['Eligible', 'Partially Eligible', 'Under Review', 'Not Eligible'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="border-t border-navy-600 pt-3">
          <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-3">Technical Narrative</p>
          <div className="space-y-3">
            {[
              { name: 'hypothesis', label: 'Hypothesis — What were you trying to achieve?', placeholder: 'Describe the scientific or technological objective...' },
              { name: 'technological_uncertainty', label: 'Technological Uncertainty — What was the obstacle?', placeholder: 'Describe what was unknown and could not be resolved without experimentation...' },
              { name: 'experimental_approach', label: 'Experimental Approach — How did you investigate it?', placeholder: 'Describe the systematic investigation or experimental methodology used...' },
              { name: 'outcome', label: 'Outcome — What was the result?', placeholder: 'Describe findings, whether successful or not. Negative results are valid SR&ED.' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-slate-400 mb-1">{f.label}</label>
                <textarea name={f.name} rows={3} defaultValue={(project as any)?.[f.name] ?? ''} className={textareaCls} placeholder={f.placeholder} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-medium transition-colors">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {project ? 'Save changes' : 'Add project'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-navy-700 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  )
}
