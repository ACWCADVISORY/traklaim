'use server'

import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import type { Expense } from '@/types'

type ExpenseData = {
  company_id: string
  project_id?: string | null
  vendor: string
  description?: string | null
  category: string
  amount: number
  date: string
  sred_eligible_percentage: number
  receipt_url?: string | null
  contractor_sred_hours?: number | null
  notes?: string | null
}

export async function addExpense(data: ExpenseData): Promise<{ expense: Expense } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({ ...data, created_by: user.id })
      .select()
      .single()

    if (error) return { error: error.message }

    await logAudit({ action: 'expense.created', resource_type: 'expense', resource_id: expense.id, details: { vendor: data.vendor, amount: data.amount, category: data.category } })
    return { expense: expense as Expense }
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' }
  }
}

export async function updateExpense(id: string, data: Partial<ExpenseData>): Promise<{ expense: Expense } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: expense, error } = await supabase
      .from('expenses')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return { error: error.message }

    await logAudit({ action: 'expense.updated', resource_type: 'expense', resource_id: id, details: { vendor: data.vendor, amount: data.amount } })
    return { expense: expense as Expense }
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' }
  }
}

export async function deleteExpense(id: string): Promise<{ success: true } | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: existing } = await supabase.from('expenses').select('vendor, amount').eq('id', id).single()

    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) return { error: error.message }

    await logAudit({ action: 'expense.deleted', resource_type: 'expense', resource_id: id, details: { vendor: (existing as any)?.vendor, amount: (existing as any)?.amount } })
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? 'Unknown error' }
  }
}
