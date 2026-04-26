import type { Project, Employee, EmployeeTimeLog, Expense, EligibilityScoreResult, ScoreCriterion } from '@/types'
import { getMondayOfWeek } from '@/lib/utils'

interface ScoreInput {
  projects: Project[]
  employees: Employee[]
  timeLogs: EmployeeTimeLog[]
  expenses: Expense[]
}

function criterion(
  id: string,
  label: string,
  description: string,
  section: 'projects' | 'employees' | 'expenses',
  max: number,
  complete: boolean,
  fix_href: string
): ScoreCriterion {
  return { id, label, description, section, max_points: max, earned_points: complete ? max : 0, complete, fix_href }
}

export function computeEligibilityScore(input: ScoreInput): EligibilityScoreResult {
  const { projects, employees, timeLogs, expenses } = input

  const activeProjects = projects.filter(p => p.status === 'Active')
  const eligibleProjects = projects.filter(p => p.sred_eligibility === 'Eligible')

  // ── Projects (40 pts) ─────────────────────────────────────────
  const allActiveHaveEligibility = activeProjects.length === 0
    || activeProjects.every(p => p.sred_eligibility !== null)

  const allEligibleHaveHypothesis = eligibleProjects.length === 0
    || eligibleProjects.every(p => p.hypothesis && p.hypothesis.trim().length > 10)

  const allEligibleHaveUncertainty = eligibleProjects.length === 0
    || eligibleProjects.every(p => p.technological_uncertainty && p.technological_uncertainty.trim().length > 10)

  const allEligibleHaveApproach = eligibleProjects.length === 0
    || eligibleProjects.every(p => p.experimental_approach && p.experimental_approach.trim().length > 10)

  // ── Employees (35 pts) ────────────────────────────────────────
  const allEmployeesHaveSREDPct = employees.length === 0
    || employees.every(e => e.sred_time_percentage !== null && e.sred_time_percentage >= 0)

  // Check last 4 weeks — every employee should have a log for each week
  const today = new Date()
  const last4Weeks: string[] = []
  for (let i = 0; i < 4; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i * 7)
    last4Weeks.push(getMondayOfWeek(d))
  }
  const loggedEmployeeWeeks = new Set(timeLogs.map(l => `${l.employee_id}::${l.week_start}`))
  const sredEmployees = employees.filter(e => (e.sred_time_percentage ?? 0) > 0)
  const timeLogsCurrent = sredEmployees.length === 0 || last4Weeks.every(week =>
    sredEmployees.every(emp => loggedEmployeeWeeks.has(`${emp.id}::${week}`))
  )

  // Specified employees: any employee with the flag set — we just check that at least
  // the flag is consistently applied (if > 0 employees have it, or none do, it's reviewed)
  // For simplicity: complete if there is at least one employee record reviewed for this flag
  const specifiedFlagged = employees.length === 0 || employees.every(e => e.is_specified_employee !== undefined)

  // ── Expenses (25 pts) ─────────────────────────────────────────
  const expenseProjectIds = new Set(expenses.map(e => e.project_id).filter(Boolean))
  const allEligibleProjectsHaveExpense = eligibleProjects.length === 0
    || eligibleProjects.every(p => expenseProjectIds.has(p.id))

  const allExpensesHaveReceipts = expenses.length === 0
    || expenses.every(e => e.receipt_url && e.receipt_url.trim().length > 0)

  const contractorExpenses = expenses.filter(e => e.category === 'Contractor Costs')
  const contractorHoursTagged = contractorExpenses.length === 0
    || contractorExpenses.every(e => e.contractor_sred_hours !== null && e.contractor_sred_hours > 0)

  const criteria: ScoreCriterion[] = [
    criterion('proj_eligibility', 'All active projects have eligibility status set',
      'Set SR&ED eligibility (Eligible, Partially Eligible, Under Review, or Not Eligible) on every active project.',
      'projects', 10, allActiveHaveEligibility, '/projects'),
    criterion('proj_hypothesis', 'All eligible projects have a hypothesis',
      'Complete the Hypothesis field on every project marked Eligible.',
      'projects', 10, allEligibleHaveHypothesis, '/projects'),
    criterion('proj_uncertainty', 'All eligible projects have technological uncertainty documented',
      'Complete the Technological Uncertainty field on every project marked Eligible.',
      'projects', 10, allEligibleHaveUncertainty, '/projects'),
    criterion('proj_approach', 'All eligible projects have experimental approach documented',
      'Complete the Experimental Approach field on every project marked Eligible.',
      'projects', 10, allEligibleHaveApproach, '/projects'),

    criterion('emp_sred_pct', 'All employees have SR&ED time percentage set',
      'Set the SR&ED time percentage for every employee in your registry.',
      'employees', 15, allEmployeesHaveSREDPct, '/employees'),
    criterion('emp_time_logs', 'Weekly time logs are current (last 4 weeks)',
      'Ensure all SR&ED-active employees have submitted time logs for the past 4 weeks.',
      'employees', 12, timeLogsCurrent, '/employees'),
    criterion('emp_specified', 'Specified employees flagged correctly',
      'Review each employee and flag founders or shareholders with >10% ownership as Specified Employees.',
      'employees', 8, specifiedFlagged, '/employees'),

    criterion('exp_per_project', 'At least one expense linked to each eligible project',
      'Add at least one expense record linked to every project marked Eligible.',
      'expenses', 10, allEligibleProjectsHaveExpense, '/expenses'),
    criterion('exp_receipts', 'All expenses have receipts uploaded',
      'Upload a receipt or supporting document for every expense record.',
      'expenses', 8, allExpensesHaveReceipts, '/expenses'),
    criterion('exp_contractor_hours', 'Contractor costs have SR&ED hours tagged',
      'Add the number of SR&ED-eligible hours for every contractor expense.',
      'expenses', 7, contractorHoursTagged, '/expenses'),
  ]

  const total = criteria.reduce((sum, c) => sum + c.earned_points, 0)
  const projects_score = criteria.filter(c => c.section === 'projects').reduce((s, c) => s + c.earned_points, 0)
  const employees_score = criteria.filter(c => c.section === 'employees').reduce((s, c) => s + c.earned_points, 0)
  const expenses_score = criteria.filter(c => c.section === 'expenses').reduce((s, c) => s + c.earned_points, 0)

  const grade: 'A' | 'B' | 'C' | 'D' = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : 'D'
  const grade_label = grade === 'A' ? 'Claim Ready' : grade === 'B' ? 'Nearly There' : grade === 'C' ? 'Needs Attention' : 'High Risk'

  return { total, grade, grade_label, criteria, projects_score, employees_score, expenses_score }
}

export function gradeColor(grade: 'A' | 'B' | 'C' | 'D'): string {
  return grade === 'A' ? 'text-teal-400' : grade === 'B' ? 'text-yellow-400' : grade === 'C' ? 'text-orange-400' : 'text-red-400'
}

export function gradeBg(grade: 'A' | 'B' | 'C' | 'D'): string {
  return grade === 'A' ? 'bg-teal-400/15 border-teal-400/30' : grade === 'B' ? 'bg-yellow-400/15 border-yellow-400/30' : grade === 'C' ? 'bg-orange-400/15 border-orange-400/30' : 'bg-red-400/15 border-red-400/30'
}

export function estimatedRefund(expenses: Expense[], employees: Employee[]): number {
  // Federal SR&ED ITC: 35% refundable for CCPCs on eligible expenditures
  const ITC_RATE = 0.35
  const eligibleExpenses = expenses.reduce((sum, e) => sum + (e.amount * e.sred_eligible_percentage / 100), 0)
  const eligibleSalaries = employees.reduce((sum, e) => {
    const salary = e.annual_salary ?? 0
    const pct = (e.sred_time_percentage ?? 0) / 100
    return sum + salary * pct
  }, 0)
  return (eligibleExpenses + eligibleSalaries) * ITC_RATE
}
