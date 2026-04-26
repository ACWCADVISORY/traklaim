import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeEligibilityScore, estimatedRefund } from '@/lib/eligibilityScore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { logAudit } from '@/lib/audit'
import type { Project, Employee, EmployeeTimeLog, Expense } from '@/types'

// We use a simple text-based PDF generation approach using react-pdf/renderer server-side
// Returns a PDF blob

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, companyId } = await req.json()
  if (!type || !companyId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // Verify user belongs to this company
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
  if ((profile as any)?.company_id !== companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [
    { data: projectsRaw },
    { data: employeesRaw },
    { data: timeLogsRaw },
    { data: expensesRaw },
    { data: company },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('company_id', companyId),
    supabase.from('employees').select('*').eq('company_id', companyId),
    supabase.from('employee_time_logs').select('*').eq('company_id', companyId),
    supabase.from('expenses').select('*').eq('company_id', companyId),
    supabase.from('companies').select('name').eq('id', companyId).single(),
  ])

  const projects = (projectsRaw ?? []) as Project[]
  const employees = (employeesRaw ?? []) as Employee[]
  const timeLogs = (timeLogsRaw ?? []) as EmployeeTimeLog[]
  const expenses = (expensesRaw ?? []) as Expense[]
  const companyName = (company as any)?.name ?? 'Company'

  const score = computeEligibilityScore({ projects, employees, timeLogs, expenses })
  const refund = estimatedRefund(expenses, employees)
  const generatedAt = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })

  // Build PDF content as plain text formatted PDF
  // Use @react-pdf/renderer dynamically
  const { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } = await import('@react-pdf/renderer')

  const styles = StyleSheet.create({
    page: { padding: 48, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
    header: { marginBottom: 32 },
    logo: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0d9488', marginBottom: 4 },
    companyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 2 },
    meta: { fontSize: 9, color: '#64748b' },
    sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginTop: 20, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    row: { flexDirection: 'row', marginBottom: 4 },
    label: { width: 180, fontSize: 9, color: '#64748b', fontFamily: 'Helvetica-Bold' },
    value: { flex: 1, fontSize: 9, color: '#0f172a' },
    projectCard: { marginBottom: 14, padding: 10, backgroundColor: '#f8fafc', borderRadius: 4 },
    projectName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 6 },
    fieldLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
    fieldValue: { fontSize: 9, color: '#334155', marginBottom: 8, lineHeight: 1.5 },
    badge: { fontSize: 8, color: '#0d9488', marginBottom: 4 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 6, borderRadius: 2, marginBottom: 2 },
    tableRow: { flexDirection: 'row', padding: '4 6', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    tableCell: { flex: 1, fontSize: 9, color: '#334155' },
    tableCellBold: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
    scoreBox: { padding: 12, backgroundColor: '#f0fdf4', borderRadius: 4, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 16 },
    scoreNum: { fontSize: 32, fontFamily: 'Helvetica-Bold', color: '#0d9488' },
    footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' },
  })

  let doc

  if (type === 'summary') {
    doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.logo}>Traklaim</Text>
            <Text style={styles.companyName}>{companyName} — SR&ED Claim Summary</Text>
            <Text style={styles.meta}>Generated {generatedAt} · For internal use and CPA review only</Text>
          </View>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreNum}>{score.total}</Text>
            <View>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>Eligibility Score — Grade {score.grade}</Text>
              <Text style={{ fontSize: 9, color: '#64748b' }}>{score.grade_label}</Text>
              <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Projects: {score.projects_score}/40 · Employees: {score.employees_score}/35 · Expenses: {score.expenses_score}/25</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Key Financials</Text>
          {[
            ['Estimated Refund (35% federal ITC)', formatCurrency(refund)],
            ['Eligible Salary Costs', formatCurrency(employees.reduce((s, e) => s + ((e.annual_salary ?? 0) * (e.sred_time_percentage ?? 0) / 100), 0))],
            ['Eligible Contractor Costs', formatCurrency(expenses.filter(e => e.category === 'Contractor Costs').reduce((s, e) => s + (e.amount * e.sred_eligible_percentage / 100), 0))],
            ['Eligible Material/Other Costs', formatCurrency(expenses.filter(e => e.category !== 'Contractor Costs').reduce((s, e) => s + (e.amount * e.sred_eligible_percentage / 100), 0))],
            ['Total Eligible Expenditures', formatCurrency(expenses.reduce((s, e) => s + (e.amount * e.sred_eligible_percentage / 100), 0) + employees.reduce((s, e) => s + ((e.annual_salary ?? 0) * (e.sred_time_percentage ?? 0) / 100), 0))],
          ].map(([l, v]) => (
            <View key={l} style={styles.row}>
              <Text style={styles.label}>{l}</Text>
              <Text style={styles.value}>{v}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Projects ({projects.length})</Text>
          {projects.map(p => (
            <View key={p.id} style={styles.row}>
              <Text style={styles.label}>{p.name}</Text>
              <Text style={styles.value}>{p.sred_eligibility} · {p.status}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Employees ({employees.length})</Text>
          {employees.map(e => (
            <View key={e.id} style={styles.row}>
              <Text style={styles.label}>{e.full_name}{e.is_specified_employee ? ' (Specified)' : ''}</Text>
              <Text style={styles.value}>{e.sred_time_percentage ?? 0}% SR&ED · {formatCurrency(((e.annual_salary ?? 0) * (e.sred_time_percentage ?? 0) / 100))} eligible</Text>
            </View>
          ))}

          <View style={styles.footer}>
            <Text>Traklaim · {companyName}</Text>
            <Text>Confidential — Not an official CRA submission</Text>
          </View>
        </Page>
      </Document>
    )
  } else if (type === 'technical') {
    const eligibleProjects = projects.filter(p => p.sred_eligibility === 'Eligible' || p.sred_eligibility === 'Partially Eligible')
    doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.logo}>Traklaim</Text>
            <Text style={styles.companyName}>{companyName} — Technical Narrative Report</Text>
            <Text style={styles.meta}>Generated {generatedAt} · SR&ED Technical Documentation (T661 Support)</Text>
          </View>

          <Text style={{ fontSize: 9, color: '#64748b', marginBottom: 16 }}>
            This report contains the technical narrative documentation for all SR&ED-eligible projects. Each section corresponds to the T661 Part 2 technical descriptions required by the CRA.
          </Text>

          {eligibleProjects.length === 0 ? (
            <Text style={{ fontSize: 10, color: '#64748b' }}>No eligible projects to report. Mark projects as Eligible or Partially Eligible in Traklaim.</Text>
          ) : (
            eligibleProjects.map((p, i) => (
              <View key={p.id} style={styles.projectCard}>
                <Text style={styles.projectName}>{i + 1}. {p.name}</Text>
                <Text style={styles.badge}>{p.sred_eligibility} · {p.status}{p.start_date ? ` · Started ${formatDate(p.start_date)}` : ''}</Text>

                {p.description && (
                  <>
                    <Text style={styles.fieldLabel}>Project Description</Text>
                    <Text style={styles.fieldValue}>{p.description}</Text>
                  </>
                )}

                <Text style={styles.fieldLabel}>Scientific / Technological Hypothesis</Text>
                <Text style={styles.fieldValue}>{p.hypothesis || 'Not yet documented.'}</Text>

                <Text style={styles.fieldLabel}>Technological Uncertainty</Text>
                <Text style={styles.fieldValue}>{p.technological_uncertainty || 'Not yet documented.'}</Text>

                <Text style={styles.fieldLabel}>Experimental Approach / Systematic Investigation</Text>
                <Text style={styles.fieldValue}>{p.experimental_approach || 'Not yet documented.'}</Text>

                <Text style={styles.fieldLabel}>Outcome and Results</Text>
                <Text style={styles.fieldValue}>{p.outcome || 'Not yet documented.'}</Text>
              </View>
            ))
          )}

          <View style={styles.footer}>
            <Text>Traklaim · {companyName}</Text>
            <Text>Confidential — Not an official CRA submission</Text>
          </View>
        </Page>
      </Document>
    )
  } else if (type === 'financial') {
    const totalEligibleExpenses = expenses.reduce((s, e) => s + (e.amount * e.sred_eligible_percentage / 100), 0)
    const totalEligibleSalary = employees.reduce((s, e) => s + ((e.annual_salary ?? 0) * (e.sred_time_percentage ?? 0) / 100), 0)

    doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.logo}>Traklaim</Text>
            <Text style={styles.companyName}>{companyName} — Financial Backup Report</Text>
            <Text style={styles.meta}>Generated {generatedAt} · SR&ED Eligible Expenditure Detail</Text>
          </View>

          <Text style={styles.sectionTitle}>Salary Costs</Text>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableCellBold, flex: 2 }}>Employee</Text>
            <Text style={styles.tableCellBold}>Type</Text>
            <Text style={styles.tableCellBold}>Annual Salary</Text>
            <Text style={styles.tableCellBold}>SR&ED %</Text>
            <Text style={styles.tableCellBold}>Eligible</Text>
          </View>
          {employees.map(e => (
            <View key={e.id} style={styles.tableRow}>
              <Text style={{ ...styles.tableCell, flex: 2 }}>{e.full_name}{e.is_specified_employee ? '*' : ''}</Text>
              <Text style={styles.tableCell}>{e.employment_type}</Text>
              <Text style={styles.tableCell}>{formatCurrency(e.annual_salary ?? 0)}</Text>
              <Text style={styles.tableCell}>{e.sred_time_percentage ?? 0}%</Text>
              <Text style={styles.tableCell}>{formatCurrency(((e.annual_salary ?? 0) * (e.sred_time_percentage ?? 0) / 100))}</Text>
            </View>
          ))}
          <View style={{ ...styles.tableRow, backgroundColor: '#f0fdf4' }}>
            <Text style={{ ...styles.tableCellBold, flex: 2 }}>Total</Text>
            <Text style={styles.tableCell}></Text>
            <Text style={styles.tableCell}></Text>
            <Text style={styles.tableCell}></Text>
            <Text style={styles.tableCellBold}>{formatCurrency(totalEligibleSalary)}</Text>
          </View>

          <Text style={styles.sectionTitle}>Expenses ({expenses.length})</Text>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableCellBold, flex: 2 }}>Vendor</Text>
            <Text style={styles.tableCellBold}>Category</Text>
            <Text style={styles.tableCellBold}>Date</Text>
            <Text style={styles.tableCellBold}>Amount</Text>
            <Text style={styles.tableCellBold}>SR&ED %</Text>
            <Text style={styles.tableCellBold}>Eligible</Text>
          </View>
          {expenses.map(e => (
            <View key={e.id} style={styles.tableRow}>
              <Text style={{ ...styles.tableCell, flex: 2 }}>{e.vendor}</Text>
              <Text style={styles.tableCell}>{e.category}</Text>
              <Text style={styles.tableCell}>{formatDate(e.date)}</Text>
              <Text style={styles.tableCell}>{formatCurrency(e.amount)}</Text>
              <Text style={styles.tableCell}>{e.sred_eligible_percentage}%</Text>
              <Text style={styles.tableCell}>{formatCurrency(e.amount * e.sred_eligible_percentage / 100)}</Text>
            </View>
          ))}
          <View style={{ ...styles.tableRow, backgroundColor: '#f0fdf4' }}>
            <Text style={{ ...styles.tableCellBold, flex: 2 }}>Total</Text>
            <Text style={styles.tableCell}></Text>
            <Text style={styles.tableCell}></Text>
            <Text style={styles.tableCell}></Text>
            <Text style={styles.tableCell}></Text>
            <Text style={styles.tableCellBold}>{formatCurrency(totalEligibleExpenses)}</Text>
          </View>

          <View style={{ marginTop: 16, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 4 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 4 }}>Total Eligible Expenditures</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0d9488' }}>{formatCurrency(totalEligibleSalary + totalEligibleExpenses)}</Text>
            <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Estimated Federal ITC (35%): {formatCurrency((totalEligibleSalary + totalEligibleExpenses) * 0.35)}</Text>
          </View>

          <View style={styles.footer}>
            <Text>Traklaim · {companyName} · * = Specified Employee</Text>
            <Text>Confidential — Not an official CRA submission</Text>
          </View>
        </Page>
      </Document>
    )
  } else {
    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  }

  const buffer = await renderToBuffer(doc)

  await logAudit({ action: 'report.generated', resource_type: 'report', details: { type } })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="traklaim-${type}-report.pdf"`,
    },
  })
}
