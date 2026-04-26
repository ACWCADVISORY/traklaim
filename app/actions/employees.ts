'use server'

import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import type { Employee, EmployeeTimeLog } from '@/types'

type EmployeeData = {
  company_id: string
  full_name: string
  title?: string | null
  employment_type: string
  annual_salary?: number | null
  sred_time_percentage?: number | null
  is_specified_employee?: boolean
}

export async function addEmployee(data: EmployeeData): Promise<{ employee: Employee } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: employee, error } = await supabase
      .from('employees')
      .insert({ ...data, created_by: user.id })
      .select()
      .single()

    if (error) return { error: error.message }

    await logAudit({ action: 'employee.created', resource_type: 'employee', resource_id: employee.id, detail: { name: data.full_name } })
    return { employee: employee as Employee }
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' }
  }
}

export async function updateEmployee(id: string, data: Partial<EmployeeData>): Promise<{ employee: Employee } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: employee, error } = await supabase
      .from('employees')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return { error: error.message }

    await logAudit({ action: 'employee.updated', resource_type: 'employee', resource_id: id, detail: { name: data.full_name } })
    return { employee: employee as Employee }
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' }
  }
}

export async function deleteEmployee(id: string): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: existing } = await supabase.from('employees').select('full_name').eq('id', id).single()

    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (error) return { error: error.message }

    await logAudit({ action: 'employee.deleted', resource_type: 'employee', resource_id: id, detail: { name: (existing as any)?.full_name } })
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' }
  }
}

type TimeLogData = {
  company_id: string
  employee_id: string
  project_id: string
  week_start: string
  sred_hours: number
  total_hours?: number | null
  technical_obstacle?: string | null
  hypothesis_tested?: string | null
  notes?: string | null
}

export async function addTimeLog(data: TimeLogData): Promise<{ log: EmployeeTimeLog } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: log, error } = await supabase
      .from('employee_time_logs')
      .insert({ ...data, logged_by: user.id })
      .select()
      .single()

    if (error) return { error: error.message }

    await logAudit({ action: 'timelog.created', resource_type: 'employee_time_log', resource_id: log.id, detail: { employee_id: data.employee_id, week_start: data.week_start, sred_hours: data.sred_hours } })
    return { log: log as EmployeeTimeLog }
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' }
  }
}

export async function updateTimeLog(id: string, data: Partial<TimeLogData>): Promise<{ log: EmployeeTimeLog } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: log, error } = await supabase
      .from('employee_time_logs')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return { error: error.message }

    return { log: log as EmployeeTimeLog }
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' }
  }
}

export async function deleteTimeLog(id: string): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase.from('employee_time_logs').delete().eq('id', id)
    if (error) return { error: error.message }

    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' }
  }
}
