import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectsClient from '@/components/projects/ProjectsClient'
import type { Project } from '@/types'

export const metadata = { title: 'Projects — Traklaim' }

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single()
  const companyId = (profile as any)?.company_id

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  return <ProjectsClient projects={(projects ?? []) as Project[]} companyId={companyId} role={(profile as any)?.role} />
}
