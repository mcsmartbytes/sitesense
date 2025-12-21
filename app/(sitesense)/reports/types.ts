// Financial Report Types
export type FinancialSummary = {
  total_expenses: number;
  total_budgeted: number;
  total_mileage_value: number;
  total_time_labor_cost: number;
};

export type CategoryExpense = {
  category_id: string;
  category_name: string;
  color: string | null;
  amount: number;
  count: number;
};

export type MonthlyExpense = {
  month: string;
  amount: number;
};

export type BudgetVsActual = {
  category_id: string;
  category_name: string;
  budget: number;
  actual: number;
  percent_used: number;
};

export type TopVendor = {
  vendor: string;
  amount: number;
  count: number;
};

export type FinancialReportData = {
  summary: FinancialSummary;
  expenses_by_category: CategoryExpense[];
  expenses_by_month: MonthlyExpense[];
  budget_vs_actual: BudgetVsActual[];
  top_vendors: TopVendor[];
};

// Estimate Report Types
export type EstimateStatusBreakdown = {
  status: string;
  count: number;
  value: number;
};

export type MonthlyEstimate = {
  month: string;
  created_count: number;
  accepted_count: number;
  total_value: number;
};

export type EstimateSummary = {
  total_estimates: number;
  total_value: number;
  avg_value: number;
  win_rate: number;
};

export type EstimateReportData = {
  summary: EstimateSummary;
  status_breakdown: EstimateStatusBreakdown[];
  by_month: MonthlyEstimate[];
  recent_estimates: {
    id: string;
    job_name: string;
    total: number;
    status: string;
    created_at: string;
  }[];
};

// Subcontractor Compliance Types
export type ComplianceStatus = 'valid' | 'expiring' | 'expired' | 'missing';

export type SubcontractorCompliance = {
  subcontractor_id: string;
  company_name: string;
  trade: string | null;
  insurance_status: ComplianceStatus;
  insurance_expiry: string | null;
  license_status: ComplianceStatus;
  license_expiry: string | null;
  w9_on_file: boolean;
  coi_on_file: boolean;
  workers_comp_status: ComplianceStatus;
  workers_comp_expiry: string | null;
  rating: number | null;
  overall_score: number;
};

export type ExpiringDocument = {
  subcontractor_id: string;
  company_name: string;
  doc_type: string;
  expiry_date: string;
  days_until: number;
};

export type TradeBreakdown = {
  trade: string;
  count: number;
  avg_rating: number;
  compliant_count: number;
};

export type SubcontractorSummary = {
  total_subs: number;
  fully_compliant: number;
  expiring_soon: number;
  expired: number;
};

export type SubcontractorReportData = {
  summary: SubcontractorSummary;
  compliance_items: SubcontractorCompliance[];
  expiring_documents: ExpiringDocument[];
  by_trade: TradeBreakdown[];
};

// Labor Report Types
export type LaborSummary = {
  total_hours: number;
  total_labor_cost: number;
  avg_hourly_rate: number;
  jobs_with_time: number;
};

export type HoursByJob = {
  job_id: string;
  job_name: string;
  hours: number;
  cost: number;
};

export type MonthlyLabor = {
  month: string;
  hours: number;
  cost: number;
};

export type LaborReportData = {
  summary: LaborSummary;
  hours_by_job: HoursByJob[];
  hours_by_month: MonthlyLabor[];
};

// Property Management Report Types
export type PropertySummary = {
  total_units: number;
  occupied_units: number;
  occupancy_rate: number;
  total_monthly_rent: number;
  collected_this_month: number;
  collection_rate: number;
  open_work_orders: number;
};

export type OccupancyByProperty = {
  property_id: string;
  property_name: string;
  total_units: number;
  occupied: number;
  vacant: number;
  rate: number;
};

export type RentCollection = {
  month: string;
  expected: number;
  collected: number;
  rate: number;
};

export type WorkOrderBreakdown = {
  status: string;
  priority: string;
  count: number;
};

export type LeaseExpiration = {
  lease_id: string;
  tenant_name: string;
  unit_number: string;
  end_date: string;
  days_until: number;
};

export type PropertyReportData = {
  summary: PropertySummary;
  occupancy_by_property: OccupancyByProperty[];
  rent_collection: RentCollection[];
  work_order_breakdown: WorkOrderBreakdown[];
  lease_expirations: LeaseExpiration[];
};

// Date Range
export type DateRange = {
  start: string;
  end: string;
};

// Chart Colors
export const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#6366f1',
  neutral: '#6b7280',
};

export const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#06b6d4', '#84cc16', '#a855f7', '#f43f5e',
];
