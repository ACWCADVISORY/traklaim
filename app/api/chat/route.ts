import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are the Traklaim Assistant — a helpful expert on SR&ED (Scientific Research and Experimental Development) tax credits in Canada. You help life sciences and biotech companies understand and track their SR&ED claims.

You can answer questions about:
- SR&ED eligibility criteria (what qualifies as technological uncertainty, experimental approach, hypothesis, etc.)
- How to document R&D activities for SR&ED
- CRA requirements and the T661 form
- Time tracking best practices for employees
- What expenses are SR&ED-eligible (salaries, contractors at 80%, materials, equipment)
- Specified employee rules and salary caps
- The 35% federal ITC for CCPCs and provincial top-ups
- How to use the Traklaim platform (adding projects, logging time, tracking expenses)
- SR&ED claim preparation and working with CPAs/SR&ED consultants

Keep answers clear, practical, and concise. If asked about specific tax advice or amounts, remind users to consult a qualified SR&ED tax preparer or CPA. Do not make up CRA policy — if unsure, say so.`

export async function POST(req: NextRequest) {
  // Auth check — reject unauthenticated requests
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
  }

  const formatted = messages
    .filter((m: any) => m.role && m.content)
    .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content) }))

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: formatted,
  })

  const content = response.content[0]?.type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ content })
}
