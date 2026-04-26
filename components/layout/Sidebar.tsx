'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, Users, Receipt, FileBarChart2, LogOut, FlaskConical, Shield, Building2 } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: FolderOpen, label: 'Projects' },
  { href: '/employees', icon: Users, label: 'Employees' },
  { href: '/expenses', icon: Receipt, label: 'Expenses' },
  { href: '/reports', icon: FileBarChart2, label: 'Reports' },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-navy-800 border-r border-navy-600 z-30">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-navy-600">
        <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-4 h-4 text-teal-400" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">Traklaim</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname === href || pathname.startsWith(href + '/')
              ? 'bg-accent/15 text-accent-light'
              : 'text-slate-400 hover:text-slate-200 hover:bg-navy-700'
          )}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-navy-600">
        <div className="px-3 py-2.5 rounded-lg bg-navy-700 mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-accent-light">
                {(profile.full_name ?? profile.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{profile.full_name ?? profile.email.split('@')[0]}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {profile.role === 'company' ? (
                  <Building2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Shield className="w-3 h-3 text-blue-400" />
                )}
                <span className={cn('text-xs capitalize', profile.role === 'company' ? 'text-emerald-400' : 'text-blue-400')}>
                  {profile.role === 'company' ? 'Company Admin' : 'Employee'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-navy-700 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
