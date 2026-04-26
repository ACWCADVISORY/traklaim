# Traklaim — AI Session Instructions

## Stack
- Next.js 14 App Router (NOT Next.js 15 — searchParams is a plain sync object, NOT a Promise)
- Supabase (SSR auth, RLS, server components)
- Tailwind CSS with custom navy/teal palette
- TypeScript strict mode (`ignoreBuildErrors: false` — build will fail on TS errors)
- `@anthropic-ai/sdk` for AI chat
- `@react-pdf/renderer` for PDF generation

## Git Workflow
- **Never commit directly to `main`**
- Always create a feature branch: `git checkout -b feature/<description>`
- Push to remote, open PR, get Vercel preview URL, merge to main
- Branch naming: `feature/<description>` or `fix/<description>`

## Key Architecture Decisions
- **Multi-tenant**: every table has `company_id` — all queries must be company-scoped
- **RLS**: Supabase RLS uses `public.user_company_id()` SECURITY DEFINER helper
- **Auto-populate trigger**: `auto_set_company_id()` fills NULL company_id on INSERT
- **Two user roles**: `company` (admin — can edit everything) and `employee` (can only log time)
- **Server Actions** for all mutations (`'use server'`)
- **Server Components** for data fetching, Client Components for interactivity

## Auth Pattern
```typescript
// Always use getUser() not getSession() for server-side auth
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { error: 'Not authenticated' }
```

## Security Rules
1. Every server action must call `getUser()` and return error if not authenticated
2. Every API route must call `getUser()` and return 401 if not authenticated
3. Company ID validation on report generation (verify user's company_id matches request)
4. Call `logAudit()` on all create/update/delete mutations
5. Never expose service role key client-side

## Design System
- Background: `bg-navy-900` (#0a1628)
- Cards: `bg-navy-800 border border-navy-600`
- Accent: `bg-teal-600`, `text-teal-400`
- Text: `text-white` (primary), `text-slate-300` (secondary), `text-slate-400` (muted), `text-slate-500` (disabled)
- Input class: `px-3 py-2 rounded-lg bg-navy-700 border border-navy-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60`

## Key File Locations
- Types: `types/index.ts`
- Scoring engine: `lib/eligibilityScore.ts`
- Audit logging: `lib/audit.ts`
- Supabase server client: `lib/supabase/server.ts`
- Server actions: `app/actions/*.ts`
- Dashboard pages: `app/(dashboard)/*/page.tsx`
- Client components: `components/**/*.tsx`
- Schema: `supabase/schema.sql`
- API routes: `app/api/*/route.ts`

## SR&ED Domain Context
- SR&ED = Scientific Research and Experimental Development (Canadian R&D tax credit)
- 35% federal ITC for CCPCs (Canadian-Controlled Private Corporations)
- Key eligibility criteria: technological uncertainty, systematic investigation, hypothesis
- T661 = CRA form for SR&ED claims
- Specified employees = shareholders owning ≥10% or non-arm's-length employees (salary caps apply)
- Contractor costs eligible at 80% of invoiced amount (or full amount if tracked by hours)
- Claims must be filed within 18 months of tax year end

## Common Gotchas
- `searchParams` in Next.js 14 is synchronous — do NOT `await` it
- `@react-pdf/renderer` must be imported dynamically in API routes (`await import(...)`)
- Always use `getMondayOfWeek()` from `lib/utils` for time log week normalization
- PDF generation uses JSX inside the API route file — this is intentional
