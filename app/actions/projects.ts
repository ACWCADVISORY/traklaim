'use server'

import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import type { Project } from '@/types'

type ProjectData = {
  company_id: string
  name: string
  description?: string | null
  start_date?: string | null
  status: string
  sred_eligibility: string
  hypothesis?: string | null
  technological_uncertainty?: string | null
  experimental_approach?: string | null
  outcome?: string | null
}

export async function addProject(data: ProjectData): Promise<{ project: Project } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({ ...data, created_by: user.id })
      .select()
      .single()

    if (error) return { error: error.message }

    await logAudit({ action: 'project.created', resource_type: 'project', resource_id: project.id, detail: { name: data.name } })
    return { project: project as Project }
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' }
  }
}

export async function updateProject(id: string, data: Partial<ProjectData>): Promise<{ project: Project } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: project, error } = await supabase
      .from('projects')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return { error: error.message }

    await logAudit({ action: 'project.updated', resource_type: 'project', resource_id: id, detail: { name: data.name } })
    return { project: project as Project }
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' }
  }
}

export async function deleteProject(id: string): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: existing } = await supabase.from('projects').select('name').eq('id', id).single()

    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) return { error: error.message }

    await logAudit({ action: 'project.deleted', resource_type: 'project', resource_id: id, detail: { name: (existing as any)?.name } })
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' }
  }
}
