'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, Users, Receipt, FileBarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: FolderOpen, label: 'Projects' },
  { href: '/employees', icon: Users, label: 'Employees' },
  { href: '/expenses', icon: Receipt, label: 'Expenses' },
  { href: '/reports', icon: FileBarChart2, label: 'Reports' },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-navy-800 border-t border-navy-600 z-30 flex">
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link key={href} href={href} className={cn(
            'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors',
            active ? 'text-accent-light' : 'text-slate-500 hover:text-slate-300'
          )}>
            <Icon className={cn('w-5 h-5', active && 'drop-shadow-sm')} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
