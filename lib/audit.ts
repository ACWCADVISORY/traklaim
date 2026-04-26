import { createClient } from '@/lib/supabase/server'

export interface AuditParams {
  action: string
  resource_type?: string
  resource_id?: string
  resource_name?: string
  details?: Record<string, unknown>
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    await supabase.from('audit_logs').insert({
      company_id: (profile as any)?.company_id ?? null,
      user_id: user.id,
      user_email: user.email ?? null,
      action: params.action,
      resource_type: params.resource_type ?? null,
      resource_id: params.resource_id ?? null,
      resource_name: params.resource_name ?? null,
      detail: params.details ?? null,
    })
  } catch {
    // Silent — audit logging must never break the main flow
  }
}
