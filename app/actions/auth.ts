'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function signIn(formData: FormData) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    })
    if (error) return { error: error.message }
    await logAudit({ action: 'user.login' })
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  } catch (e: any) {
    if (e?.message === 'NEXT_REDIRECT') throw e
    return { error: e?.message ?? String(e) }
  }
}

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      options: {
        data: {
          full_name: formData.get('full_name') as string,
          company_name: formData.get('company_name') as string,
          role: 'company',
        },
      },
    })
    if (error) return { error: error.message }
    return { success: 'Check your email to confirm your account.' }
  } catch (e: any) {
    return { error: e?.message ?? String(e) }
  }
}

export async function signOut() {
  const supabase = await createClient()
  await logAudit({ action: 'user.logout' })
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
