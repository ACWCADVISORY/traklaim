'use client'

import { useState } from 'react'
import { signIn, signUp } from '@/app/actions/auth'
import { Loader2, FlaskConical } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    const fd = new FormData(e.currentTarget)
    const result = mode === 'login' ? await signIn(fd) : await signUp(fd)
    if (result && 'error' in result) setError(result.error ?? 'An error occurred')
    if (result && 'success' in result) setSuccess(result.success ?? 'Success')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-teal-400" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Traklaim</span>
        </div>

        <div className="bg-[#0f1f38] border border-[#1e3a5f] rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-1">
            {mode === 'login' ? 'Sign in to Traklaim' : 'Create your account'}
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            {mode === 'login' ? 'SR&ED tracking for Canadian life sciences.' : 'Start tracking your SR&ED claim in real time.'}
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-sm text-teal-400">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Full name</label>
                  <input name="full_name" required className="w-full px-3 py-2.5 rounded-lg bg-[#162440] border border-[#1e3a5f] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500/60" placeholder="Alex Campbell" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Company name</label>
                  <input name="company_name" required className="w-full px-3 py-2.5 rounded-lg bg-[#162440] border border-[#1e3a5f] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500/60" placeholder="BioCore Therapeutics Inc." />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input name="email" type="email" required className="w-full px-3 py-2.5 rounded-lg bg-[#162440] border border-[#1e3a5f] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500/60" placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input name="password" type="password" required minLength={8} className="w-full px-3 py-2.5 rounded-lg bg-[#162440] border border-[#1e3a5f] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500/60" placeholder="••••••••" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccess(null) }} className="text-teal-400 hover:text-teal-300 font-medium">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
