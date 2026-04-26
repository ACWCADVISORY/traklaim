import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import ChatWidget from '@/components/layout/ChatWidget'
import type { Profile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, company_id, employee_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen bg-navy-900">
      <Sidebar profile={profile as Profile} />
      <MobileBottomNav />
      <main className="lg:pl-60 pb-20 lg:pb-0 min-h-screen flex flex-col">
        {children}
      </main>
      <ChatWidget />
    </div>
  )
}
