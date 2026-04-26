'use client'

import { useState } from 'react'
import { FileText, Download, Loader2, CheckCircle2, TrendingUp, Users, Receipt, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

type ReportType = 'summary' | 'technical' | 'financial'

interface Summary {
  companyName: string
  score: number
  grade: string
  grade_label: string
  estimatedRefund: string
  projectCount: number
  eligibleProjectCount: number
  employeeCount: number
  expenseCount: number
  totalEligibleSalary: string
  totalEligibleExpenses: string
}

interface Props {
  summary: Summary
  companyId: string
}

const REPORTS: { type: ReportType; title: string; description: string; icon: React.ElementType; color: string }[] = [
  {
    type: 'summary',
    title: 'SR&ED Claim Summary',
    description: 'High-level overview of your claim: eligibility score, estimated refund, project list, and key financials. Share with leadership or your CPA.',
    icon: FileText,
    color: 'text-teal-400',
  },
  {
    type: 'technical',
    title: 'Technical Narrative Report',
    description: 'Full technical documentation for all eligible projects — hypothesis, technological uncertainty, experimental approach, and outcomes. Required for T661 filing.',
    icon: FlaskConical,
    color: 'text-blue-400',
  },
  {
    type: 'financial',
    title: 'Financial Backup Report',
    description: 'Itemized breakdown of SR&ED-eligible salary costs, contractor invoices, materials, and equipment expenses with percentages and totals.',
    icon: TrendingUp,
    color: 'text-violet-400',
  },
]

export default function ReportsClient({ summary, companyId }: Props) {
  const [generating, setGenerating] = useState<ReportType | null>(null)
  const [done, setDone] = useState<ReportType | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate(type: ReportType) {
    setGenerating(type)
    setDone(null)
    setError(null)
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, companyId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Failed to generate report (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `traklaim-${type}-report.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setDone(type)
      setTimeout(() => setDone(null), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-400 text-sm mt-0.5">Generate PDF reports for your SR&ED tax credit claim.</p>
      </div>

      {/* Claim snapshot */}
      <div className="bg-navy-800 border border-navy-600 rounded-2xl p-5 mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Claim Snapshot — {summary.companyName}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Score', value: `${summary.score}/100` },
            { label: 'Grade', value: `${summary.grade} — ${summary.grade_label}` },
            { label: 'Est. Refund', value: summary.estimatedRefund },
            { label: 'Projects', value: `${summary.eligibleProjectCount}/${summary.projectCount} eligible` },
            { label: 'Eligible Salary', value: summary.totalEligibleSalary },
            { label: 'Eligible Expenses', value: summary.totalEligibleExpenses },
          ].map(f => (
            <div key={f.label}>
              <p className="text-xs text-slate-500 mb-0.5">{f.label}</p>
              <p className="text-sm text-white font-semibold">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="space-y-4">
        {REPORTS.map(r => (
          <div key={r.type} className="bg-navy-800 border border-navy-600 rounded-xl p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', r.type === 'summary' ? 'bg-teal-400/10' : r.type === 'technical' ? 'bg-blue-400/10' : 'bg-violet-400/10')}>
                <r.icon className={cn('w-5 h-5', r.color)} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{r.title}</p>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed max-w-lg">{r.description}</p>
              </div>
            </div>
            <button
              onClick={() => generate(r.type)}
              disabled={!!generating}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0',
                done === r.type
                  ? 'bg-teal-600/20 text-teal-400'
                  : 'bg-navy-700 hover:bg-navy-600 text-slate-200 disabled:opacity-50'
              )}
            >
              {generating === r.type ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              ) : done === r.type ? (
                <><CheckCircle2 className="w-4 h-4" /> Downloaded</>
              ) : (
                <><Download className="w-4 h-4" /> Generate PDF</>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-navy-800/50 border border-navy-600/50 rounded-xl p-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="text-slate-400 font-medium">Note:</span> These reports are for internal use and CPA review. They are not official CRA submissions. Your SR&ED claim must be filed by a qualified preparer on Form T661 and Schedule 31. Ensure all supporting documentation is retained for at least 6 years from the date of assessment.
        </p>
      </div>
    </div>
  )
}
