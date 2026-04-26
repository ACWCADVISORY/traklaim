export type UserRole = 'company' | 'employee'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  company_id: string | null
  employee_id: string | null
  created_at: string
}

export interface Company {
  id: string
  name: string
  created_at: string
  updated_at: string
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

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract'

export interface Employee {
  id: string
  company_id: string
  full_name: string
  title: string | null
  employment_type: EmploymentType
  annual_salary: number | null
  sred_time_percentage: number | null
  is_specified_employee: boolean
  created_at: string
  updated_at: string
}

export interface EmployeeTimeLog {
  id: string
  company_id: string
  employee_id: string
  project_id: string
  week_start: string
  sred_hours: number
  total_hours: number | null
  technical_obstacle: string | null
  hypothesis_tested: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ExpenseCategory =
  | 'Contractor Costs'
  | 'Materials & Supplies'
  | 'Equipment'
  | 'Software & Cloud'
  | 'Travel & Field Work'
  | 'Other'

export interface Expense {
  id: string
  company_id: string
  project_id: string | null
  vendor: string
  description: string | null
  category: ExpenseCategory
  amount: number
  date: string
  sred_eligible_percentage: number
  receipt_url: string | null
  contractor_sred_hours: number | null
  notes: string | null
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
  detail: Record<string, unknown> | null
  created_at: string
}

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
