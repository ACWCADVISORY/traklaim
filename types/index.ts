export type UserRole = 'company' | 'employee'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  company_id: string | null
  employee_id: string | null // linked employee record if role = 'employee'
  created_at: string
}

export interface Company {
  id: string
  name: string
  fiscal_year_end: string | null
  cra_business_number: string | null
  created_at: string
}

export type ProjectStatus = 'Active' | 'Completed' | 'On Hold'
export type SREDEligibility = 'Eligible' | 'Partially Eligible' | 'Under Review' | 'Not Eligible'

export interface Project {
  id: string
  company_id: string
  name: string
  description: string | null
  start_date: string | null
  status: ProjectStatus
  sred_eligibility: SREDEligibility
  hypothesis: string | null
  technological_uncertainty: string | null
  experimental_approach: string | null
  outcome: string | null
  created_at: string
  updated_at: string
}

export type EmploymentType = 'T4 Employee' | 'T4A Contractor'

export interface Employee {
  id: string
  company_id: string
  name: string
  title: string | null
  employment_type: EmploymentType
  annual_salary: number | null
  hourly_rate: number | null
  sred_time_percentage: number | null // 0–100
  is_specified_employee: boolean // >10% ownership
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeTimeLog {
  id: string
  company_id: string
  employee_id: string
  week_start: string // ISO date of Monday
  sred_hours: number
  standard_hours: number
  technical_obstacle: string | null
  hypothesis_tested: string | null
  uncertainty_description: string | null
  notes: string | null
  created_at: string
}

export type ExpenseCategory = 'Materials' | 'Cloud & Computing' | 'Contractor Costs'

export interface Expense {
  id: string
  company_id: string
  date: string
  amount: number
  vendor: string
  category: ExpenseCategory
  project_id: string | null
  sred_eligible_percentage: number // 0–100
  notes: string | null
  receipt_url: string | null
  contractor_sred_hours: number | null // for Contractor Costs
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  company_id: string
  user_id: string
  user_email: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  resource_name: string | null
  details: Record<string, unknown> | null
  timestamp: string
}

// Eligibility score types
export interface ScoreCriterion {
  id: string
  label: string
  description: string
  section: 'projects' | 'employees' | 'expenses'
  max_points: number
  earned_points: number
  complete: boolean
  fix_href: string
}

export interface EligibilityScoreResult {
  total: number
  grade: 'A' | 'B' | 'C' | 'D'
  grade_label: string
  criteria: ScoreCriterion[]
  projects_score: number
  employees_score: number
  expenses_score: number
}
