-- =====================================================
-- SITESENSE DATABASE SCHEMA (SQLite/Turso)
-- =====================================================
-- Job costing app for contractors
-- =====================================================

-- Users table (for auth - may sync with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Industries
CREATE TABLE IF NOT EXISTS industries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insert default industries
INSERT OR IGNORE INTO industries (id, name, description) VALUES
  ('ind_roofing', 'Roofing', 'Residential and commercial roofing'),
  ('ind_framing', 'Framing', 'Structural framing and carpentry'),
  ('ind_painting', 'Painting', 'Interior and exterior painting'),
  ('ind_concrete', 'Concrete', 'Flatwork, foundations, structural'),
  ('ind_electrical', 'Electrical', 'Residential and commercial electrical'),
  ('ind_plumbing', 'Plumbing', 'Residential and commercial plumbing'),
  ('ind_general', 'General Contracting', 'Full-service general contracting'),
  ('ind_landscaping', 'Landscaping', 'Landscape and hardscape');

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  client_id TEXT,
  client_name TEXT,
  industry_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),

  -- Address
  property_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Roofing specific fields
  structure_type TEXT,
  roof_type TEXT,
  roof_pitch TEXT,
  layers INTEGER,
  measured_squares REAL,
  dumpster_size TEXT,
  dumpster_hauler TEXT,

  -- Dates
  start_date TEXT,
  end_date TEXT,

  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE SET NULL
);

-- Job Phases
CREATE TABLE IF NOT EXISTS job_phases (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Job Tasks
CREATE TABLE IF NOT EXISTS job_tasks (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  phase_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  assignee TEXT,
  due_date TEXT,
  estimated_hours REAL,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (phase_id) REFERENCES job_phases(id) ON DELETE SET NULL
);

-- Permits
CREATE TABLE IF NOT EXISTS permits (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  permit_number TEXT,
  authority TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'approved', 'rejected', 'closed')),
  applied_date TEXT,
  approved_date TEXT,
  inspection_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Job Materials (BOM)
CREATE TABLE IF NOT EXISTS job_materials (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  unit_cost REAL,
  vendor TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Job Photos
CREATE TABLE IF NOT EXISTS job_photos (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT DEFAULT 'other' CHECK (category IN ('before', 'during', 'after', 'other')),
  caption TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Weather Delays
CREATE TABLE IF NOT EXISTS weather_delays (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  delay_date TEXT NOT NULL,
  hours_lost REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Time Entries
CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT,
  entry_date TEXT NOT NULL,
  hours REAL NOT NULL,
  hourly_rate REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT,
  category_id TEXT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  vendor TEXT,
  payment_method TEXT,
  is_business INTEGER DEFAULT 1,
  receipt_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Expense Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  deduction_percentage INTEGER DEFAULT 100,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Estimates
CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_id TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),

  subtotal REAL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total REAL DEFAULT 0,

  po_number TEXT,
  valid_until TEXT,
  notes TEXT,
  terms TEXT,

  public_token TEXT UNIQUE,
  sent_at TEXT,
  accepted_at TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

-- Estimate Items
CREATE TABLE IF NOT EXISTS estimate_items (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  unit_price REAL DEFAULT 0,
  total REAL DEFAULT 0,
  is_optional INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);

-- Estimate Attachments
CREATE TABLE IF NOT EXISTS estimate_attachments (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);

-- Change Orders
CREATE TABLE IF NOT EXISTS change_orders (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'approved', 'rejected', 'invoiced', 'paid')),
  approved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- =====================================================
-- TOOL TRACKING TABLES
-- =====================================================

-- Tool Categories
CREATE TABLE IF NOT EXISTS tool_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insert default tool categories
INSERT OR IGNORE INTO tool_categories (id, name, description, icon, color) VALUES
  ('tcat_power', 'Power Tools', 'Electric and battery-powered tools', 'zap', '#f59e0b'),
  ('tcat_hand', 'Hand Tools', 'Manual non-powered tools', 'wrench', '#3b82f6'),
  ('tcat_safety', 'Safety Equipment', 'PPE and safety gear', 'shield', '#10b981'),
  ('tcat_ladder', 'Ladders & Scaffolding', 'Height access equipment', 'arrow-up', '#8b5cf6'),
  ('tcat_measure', 'Measuring & Layout', 'Measuring tapes, levels, lasers', 'ruler', '#ec4899'),
  ('tcat_cutting', 'Cutting Tools', 'Saws, blades, cutting equipment', 'scissors', '#ef4444'),
  ('tcat_fasten', 'Fastening Tools', 'Nail guns, staplers, screw guns', 'link', '#6366f1'),
  ('tcat_heavy', 'Heavy Equipment', 'Large machinery and vehicles', 'truck', '#78716c'),
  ('tcat_special', 'Specialty Tools', 'Trade-specific specialized tools', 'star', '#14b8a6'),
  ('tcat_consumable', 'Consumables', 'Bits, blades, batteries, supplies', 'package', '#64748b');

-- Tools
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT,

  qr_code TEXT UNIQUE,
  asset_tag TEXT,

  purchase_date TEXT,
  purchase_price REAL,
  current_value REAL,
  warranty_expires TEXT,

  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'checked_out', 'maintenance', 'retired', 'lost')),
  condition TEXT DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),

  home_location TEXT,
  current_location TEXT,

  assigned_to_user TEXT,
  assigned_to_job TEXT,
  assigned_at TEXT,

  image_url TEXT,
  notes TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES tool_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to_job) REFERENCES jobs(id) ON DELETE SET NULL
);

-- Tool Checkouts
CREATE TABLE IF NOT EXISTS tool_checkouts (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL,
  user_id TEXT,

  checked_out_at TEXT NOT NULL DEFAULT (datetime('now')),
  checked_out_to TEXT,
  checked_out_to_job_id TEXT,
  checkout_notes TEXT,
  checkout_condition TEXT,
  checkout_location TEXT,

  checked_in_at TEXT,
  checkin_notes TEXT,
  checkin_condition TEXT,
  checkin_location TEXT,

  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (checked_out_to_job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

-- Tool Maintenance
CREATE TABLE IF NOT EXISTS tool_maintenance (
  id TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL,
  user_id TEXT,

  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('inspection', 'repair', 'calibration', 'cleaning', 'replacement', 'other')),
  description TEXT NOT NULL,
  performed_by TEXT,
  performed_at TEXT NOT NULL DEFAULT (date('now')),

  cost REAL,
  vendor TEXT,

  status TEXT DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  next_maintenance_date TEXT,

  receipt_url TEXT,
  notes TEXT,

  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Crew Members
CREATE TABLE IF NOT EXISTS crew_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_job_id ON expenses(job_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_job_id ON time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_job_id ON estimates(job_id);
CREATE INDEX IF NOT EXISTS idx_tools_user_id ON tools(user_id);
CREATE INDEX IF NOT EXISTS idx_tools_qr_code ON tools(qr_code);
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tool_checkouts_tool_id ON tool_checkouts(tool_id);

-- =====================================================
-- PHASE 1: QUOTE ENGINE - GC EXPANSION
-- =====================================================

-- CSI Cost Codes (MasterFormat-based)
CREATE TABLE IF NOT EXISTS cost_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  division TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_code TEXT,
  level INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 1,
  user_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default CSI MasterFormat divisions
INSERT OR IGNORE INTO cost_codes (id, code, division, name, level, is_default) VALUES
  ('csi_00', '00', '00', 'Procurement and Contracting Requirements', 1, 1),
  ('csi_01', '01', '01', 'General Requirements', 1, 1),
  ('csi_02', '02', '02', 'Existing Conditions', 1, 1),
  ('csi_03', '03', '03', 'Concrete', 1, 1),
  ('csi_04', '04', '04', 'Masonry', 1, 1),
  ('csi_05', '05', '05', 'Metals', 1, 1),
  ('csi_06', '06', '06', 'Wood, Plastics, and Composites', 1, 1),
  ('csi_07', '07', '07', 'Thermal and Moisture Protection', 1, 1),
  ('csi_08', '08', '08', 'Openings', 1, 1),
  ('csi_09', '09', '09', 'Finishes', 1, 1),
  ('csi_10', '10', '10', 'Specialties', 1, 1),
  ('csi_11', '11', '11', 'Equipment', 1, 1),
  ('csi_12', '12', '12', 'Furnishings', 1, 1),
  ('csi_13', '13', '13', 'Special Construction', 1, 1),
  ('csi_14', '14', '14', 'Conveying Equipment', 1, 1),
  ('csi_21', '21', '21', 'Fire Suppression', 1, 1),
  ('csi_22', '22', '22', 'Plumbing', 1, 1),
  ('csi_23', '23', '23', 'HVAC', 1, 1),
  ('csi_25', '25', '25', 'Integrated Automation', 1, 1),
  ('csi_26', '26', '26', 'Electrical', 1, 1),
  ('csi_27', '27', '27', 'Communications', 1, 1),
  ('csi_28', '28', '28', 'Electronic Safety and Security', 1, 1),
  ('csi_31', '31', '31', 'Earthwork', 1, 1),
  ('csi_32', '32', '32', 'Exterior Improvements', 1, 1),
  ('csi_33', '33', '33', 'Utilities', 1, 1);

-- Subcontractors (Extended compliance tracking)
CREATE TABLE IF NOT EXISTS subcontractors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,

  -- Trade/specialty info
  primary_trade TEXT,
  csi_divisions TEXT,

  -- License compliance
  license_number TEXT,
  license_state TEXT,
  license_expiry TEXT,
  license_verified INTEGER DEFAULT 0,

  -- Insurance
  insurance_company TEXT,
  insurance_policy_number TEXT,
  insurance_expiry TEXT,
  insurance_amount REAL,
  coi_on_file INTEGER DEFAULT 0,
  additional_insured INTEGER DEFAULT 0,
  waiver_of_subrogation INTEGER DEFAULT 0,

  -- Tax/compliance
  w9_on_file INTEGER DEFAULT 0,
  tax_id TEXT,

  -- Workers comp
  workers_comp_policy TEXT,
  workers_comp_expiry TEXT,

  -- Safety
  safety_plan_on_file INTEGER DEFAULT 0,
  osha_certified INTEGER DEFAULT 0,
  emr_rating REAL,

  -- Performance
  rating INTEGER,
  projects_completed INTEGER DEFAULT 0,
  is_preferred INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,

  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Subcontractor Documents
CREATE TABLE IF NOT EXISTS subcontractor_documents (
  id TEXT PRIMARY KEY,
  subcontractor_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('license', 'insurance_coi', 'w9', 'workers_comp', 'safety_plan', 'contract', 'other')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  expiry_date TEXT,
  verified INTEGER DEFAULT 0,
  verified_at TEXT,
  verified_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (subcontractor_id) REFERENCES subcontractors(id) ON DELETE CASCADE
);

-- Bid Packages (Trade scopes for bidding)
CREATE TABLE IF NOT EXISTS bid_packages (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  package_number TEXT,
  name TEXT NOT NULL,
  csi_division TEXT,
  description TEXT,
  scope_of_work TEXT,
  inclusions TEXT,
  exclusions TEXT,

  -- Schedule
  bid_due_date TEXT,
  work_start_date TEXT,
  work_end_date TEXT,

  -- Budget
  budget_estimate REAL,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'reviewing', 'awarded', 'cancelled')),
  awarded_to TEXT,
  awarded_amount REAL,
  awarded_at TEXT,

  -- Attachments reference (JSON array)
  attachments TEXT,
  notes TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (awarded_to) REFERENCES subcontractors(id) ON DELETE SET NULL
);

-- Bid Package Invites
CREATE TABLE IF NOT EXISTS bid_package_invites (
  id TEXT PRIMARY KEY,
  bid_package_id TEXT NOT NULL,
  subcontractor_id TEXT NOT NULL,
  invited_at TEXT DEFAULT (datetime('now')),
  invited_via TEXT DEFAULT 'email' CHECK (invited_via IN ('email', 'phone', 'in_person', 'portal')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'declined', 'submitted')),
  viewed_at TEXT,
  declined_at TEXT,
  decline_reason TEXT,
  notes TEXT,
  FOREIGN KEY (bid_package_id) REFERENCES bid_packages(id) ON DELETE CASCADE,
  FOREIGN KEY (subcontractor_id) REFERENCES subcontractors(id) ON DELETE CASCADE
);

-- Subcontractor Bids
CREATE TABLE IF NOT EXISTS subcontractor_bids (
  id TEXT PRIMARY KEY,
  bid_package_id TEXT NOT NULL,
  subcontractor_id TEXT NOT NULL,

  -- Pricing
  base_bid REAL NOT NULL,
  labor_cost REAL,
  material_cost REAL,
  equipment_cost REAL,
  overhead_profit REAL,

  -- Alternates (JSON array)
  alternates TEXT,

  -- Clarifications
  assumptions TEXT,
  clarifications TEXT,
  exclusions TEXT,

  -- Schedule
  proposed_start TEXT,
  proposed_duration TEXT,
  lead_time TEXT,

  -- Compliance status
  compliance_verified INTEGER DEFAULT 0,

  -- Evaluation
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'selected', 'rejected', 'withdrawn')),
  score INTEGER,
  evaluator_notes TEXT,

  -- Attachments (JSON array)
  attachments TEXT,

  submitted_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT,

  FOREIGN KEY (bid_package_id) REFERENCES bid_packages(id) ON DELETE CASCADE,
  FOREIGN KEY (subcontractor_id) REFERENCES subcontractors(id) ON DELETE CASCADE
);

-- Bid RFIs (Questions during bidding)
CREATE TABLE IF NOT EXISTS bid_rfis (
  id TEXT PRIMARY KEY,
  bid_package_id TEXT NOT NULL,
  subcontractor_id TEXT,
  rfi_number TEXT,
  question TEXT NOT NULL,
  response TEXT,
  responded_at TEXT,
  is_public INTEGER DEFAULT 1,
  attachments TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (bid_package_id) REFERENCES bid_packages(id) ON DELETE CASCADE,
  FOREIGN KEY (subcontractor_id) REFERENCES subcontractors(id) ON DELETE SET NULL
);

-- Estimate Sections (Group line items)
CREATE TABLE IF NOT EXISTS estimate_sections (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cost_code TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);

-- Estimate Line Items (Enhanced with cost breakdown)
CREATE TABLE IF NOT EXISTS estimate_line_items (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  section_id TEXT,
  cost_code_id TEXT,
  bid_package_id TEXT,
  description TEXT NOT NULL,

  -- Quantities
  quantity REAL DEFAULT 1,
  unit TEXT,

  -- Cost breakdown
  unit_price REAL DEFAULT 0,
  labor_cost REAL DEFAULT 0,
  labor_hours REAL,
  labor_rate REAL,
  material_cost REAL DEFAULT 0,
  equipment_cost REAL DEFAULT 0,
  subcontractor_cost REAL DEFAULT 0,

  -- Calculated
  subtotal REAL DEFAULT 0,
  markup_percent REAL DEFAULT 0,
  markup_amount REAL DEFAULT 0,
  total REAL DEFAULT 0,

  -- Flags
  is_optional INTEGER DEFAULT 0,
  is_allowance INTEGER DEFAULT 0,
  is_alternate INTEGER DEFAULT 0,
  alternate_type TEXT CHECK (alternate_type IN ('add', 'deduct')),

  -- SOV
  include_in_sov INTEGER DEFAULT 1,
  sov_description TEXT,

  -- Tracking
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES estimate_sections(id) ON DELETE SET NULL,
  FOREIGN KEY (cost_code_id) REFERENCES cost_codes(id) ON DELETE SET NULL,
  FOREIGN KEY (bid_package_id) REFERENCES bid_packages(id) ON DELETE SET NULL
);

-- Estimate Allowances
CREATE TABLE IF NOT EXISTS estimate_allowances (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  cost_code_id TEXT,
  is_owner_selection INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'finalized')),
  actual_amount REAL,
  variance REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
  FOREIGN KEY (cost_code_id) REFERENCES cost_codes(id) ON DELETE SET NULL
);

-- Estimate Alternates (Add/Deduct options)
CREATE TABLE IF NOT EXISTS estimate_alternates (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  alternate_number TEXT,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('add', 'deduct')),
  amount REAL NOT NULL,
  cost_code_id TEXT,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected')),
  accepted_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
  FOREIGN KEY (cost_code_id) REFERENCES cost_codes(id) ON DELETE SET NULL
);

-- Estimate Contingency
CREATE TABLE IF NOT EXISTS estimate_contingency (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  name TEXT DEFAULT 'Contingency',
  description TEXT,
  type TEXT DEFAULT 'percent' CHECK (type IN ('percent', 'fixed')),
  percent_value REAL,
  fixed_value REAL,
  calculated_amount REAL,
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'labor', 'materials', 'custom')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);

-- Estimate Overhead & Profit
CREATE TABLE IF NOT EXISTS estimate_overhead_profit (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  overhead_percent REAL DEFAULT 0,
  overhead_amount REAL DEFAULT 0,
  profit_percent REAL DEFAULT 0,
  profit_amount REAL DEFAULT 0,
  total REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);

-- Schedule of Values (SOV)
CREATE TABLE IF NOT EXISTS schedule_of_values (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  estimate_id TEXT,
  user_id TEXT NOT NULL,
  name TEXT DEFAULT 'Schedule of Values',
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'active')),
  total_contract_amount REAL DEFAULT 0,
  approved_at TEXT,
  approved_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SOV Line Items
CREATE TABLE IF NOT EXISTS sov_line_items (
  id TEXT PRIMARY KEY,
  sov_id TEXT NOT NULL,
  line_number TEXT,
  cost_code_id TEXT,
  description TEXT NOT NULL,

  -- Original values
  scheduled_value REAL NOT NULL DEFAULT 0,

  -- Change order adjustments
  approved_changes REAL DEFAULT 0,
  revised_value REAL DEFAULT 0,

  -- Billing (Phase 3)
  previous_billed REAL DEFAULT 0,
  current_billed REAL DEFAULT 0,
  total_billed REAL DEFAULT 0,
  percent_complete REAL DEFAULT 0,
  balance_to_finish REAL DEFAULT 0,

  -- Retainage (Phase 3)
  retainage_percent REAL DEFAULT 10,
  retainage_held REAL DEFAULT 0,

  -- Source tracking
  estimate_line_item_id TEXT,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (sov_id) REFERENCES schedule_of_values(id) ON DELETE CASCADE,
  FOREIGN KEY (cost_code_id) REFERENCES cost_codes(id) ON DELETE SET NULL,
  FOREIGN KEY (estimate_line_item_id) REFERENCES estimate_line_items(id) ON DELETE SET NULL
);

-- Contacts (CRM)
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  type TEXT DEFAULT 'lead' CHECK (type IN ('lead', 'prospect', 'customer', 'vendor', 'partner', 'other')),
  source TEXT,
  tags TEXT,
  notes TEXT,
  last_contacted TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Phase 1 Indexes
CREATE INDEX IF NOT EXISTS idx_cost_codes_code ON cost_codes(code);
CREATE INDEX IF NOT EXISTS idx_cost_codes_division ON cost_codes(division);
CREATE INDEX IF NOT EXISTS idx_subcontractors_user_id ON subcontractors(user_id);
CREATE INDEX IF NOT EXISTS idx_subcontractors_trade ON subcontractors(primary_trade);
CREATE INDEX IF NOT EXISTS idx_bid_packages_job_id ON bid_packages(job_id);
CREATE INDEX IF NOT EXISTS idx_bid_packages_status ON bid_packages(status);
CREATE INDEX IF NOT EXISTS idx_sub_bids_package ON subcontractor_bids(bid_package_id);
CREATE INDEX IF NOT EXISTS idx_sub_bids_subcontractor ON subcontractor_bids(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_line_items_estimate ON estimate_line_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_line_items_section ON estimate_line_items(section_id);
CREATE INDEX IF NOT EXISTS idx_sov_job_id ON schedule_of_values(job_id);

-- =====================================================
-- MULTI-INDUSTRY SUPPORT
-- =====================================================

-- Industry Profiles (Master configuration)
CREATE TABLE IF NOT EXISTS industry_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  enabled_modules TEXT,          -- JSON array
  disabled_modules TEXT,         -- JSON array
  required_fields TEXT,          -- JSON object
  hidden_fields TEXT,            -- JSON object
  terminology TEXT,              -- JSON object
  default_settings TEXT,         -- JSON object
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insert default industry profiles
INSERT OR IGNORE INTO industry_profiles (id, name, description, icon, color, enabled_modules, terminology, default_settings, sort_order) VALUES
('gc', 'General Contractor', 'Commercial and residential general contracting', 'building', '#2563eb',
 '["jobs", "estimates", "sov", "bid_packages", "subcontractors", "change_orders", "permits", "time_tracking", "expenses", "tools"]',
 '{"location": "Job", "sub_location": "Phase", "service_provider": "Subcontractor", "stakeholder": "Client", "service_request": "Bid Package"}',
 '{"default_retainage": 10, "default_markup": 15}', 1),

('property_mgmt', 'Property Management', 'Residential and commercial property management', 'home', '#10b981',
 '["properties", "units", "tenants", "leases", "work_orders", "vendors", "assets", "maintenance_schedules", "rent_tracking"]',
 '{"location": "Property", "sub_location": "Unit", "service_provider": "Vendor", "stakeholder": "Tenant", "service_request": "Work Order"}',
 '{"default_late_fee_percent": 5, "default_late_grace_days": 5}', 2),

('trade_contractor', 'Trade Contractor', 'Electrical, plumbing, HVAC, and specialty trades', 'wrench', '#f59e0b',
 '["jobs", "estimates", "time_tracking", "expenses", "service_calls", "inventory"]',
 '{"location": "Job", "sub_location": "Task", "service_provider": "Supplier", "stakeholder": "Customer", "service_request": "Service Call"}',
 '{"default_hourly_rate": 85, "default_service_call_fee": 75}', 3),

('developer', 'Developer / Owner-Builder', 'Real estate development and owner-builder projects', 'layers', '#8b5cf6',
 '["projects", "estimates", "sov", "bid_packages", "subcontractors", "financing", "permits", "milestones"]',
 '{"location": "Project", "sub_location": "Phase", "service_provider": "Contractor", "stakeholder": "Investor", "service_request": "Bid Package"}',
 '{"default_contingency": 10, "default_profit_margin": 20}', 4);

-- User Industry Settings
CREATE TABLE IF NOT EXISTS user_industry_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  industry_id TEXT NOT NULL DEFAULT 'gc',
  custom_terminology TEXT,       -- JSON object
  custom_settings TEXT,          -- JSON object
  onboarding_completed INTEGER DEFAULT 0,
  onboarding_step TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (industry_id) REFERENCES industry_profiles(id)
);

-- =====================================================
-- PROPERTY MANAGEMENT TABLES
-- =====================================================

-- Units (Sub-locations within properties)
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  unit_number TEXT NOT NULL,
  unit_type TEXT,                -- 'apartment', 'office', 'retail', 'storage', 'house'
  floor INTEGER,
  square_footage REAL,
  bedrooms INTEGER,
  bathrooms REAL,
  status TEXT DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance', 'offline')),
  current_tenant_id TEXT,
  current_lease_id TEXT,
  market_rent REAL,
  current_rent REAL,
  amenities TEXT,                -- JSON array
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  status TEXT DEFAULT 'prospect' CHECK (status IN ('prospect', 'applicant', 'active', 'past', 'evicted')),
  credit_score INTEGER,
  background_check_date TEXT,
  background_check_status TEXT,
  preferred_contact_method TEXT,
  communication_opt_in INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Leases
CREATE TABLE IF NOT EXISTS leases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  unit_id TEXT,
  tenant_id TEXT NOT NULL,
  lease_type TEXT DEFAULT 'fixed' CHECK (lease_type IN ('fixed', 'month_to_month', 'week_to_week')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  monthly_rent REAL NOT NULL,
  security_deposit REAL,
  pet_deposit REAL,
  rent_due_day INTEGER DEFAULT 1,
  late_fee_amount REAL,
  late_fee_grace_days INTEGER DEFAULT 5,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'expired', 'terminated', 'renewed')),
  move_in_date TEXT,
  move_out_date TEXT,
  move_in_inspection_id TEXT,
  move_out_inspection_id TEXT,
  lease_document_url TEXT,
  auto_renew INTEGER DEFAULT 0,
  renewal_terms TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Work Orders (Service Requests)
CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  unit_id TEXT,
  tenant_id TEXT,
  work_order_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,                 -- 'plumbing', 'electrical', 'hvac', 'appliance', 'general', 'pest', 'landscaping'
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('emergency', 'urgent', 'normal', 'low')),
  sla_response_hours INTEGER,
  sla_completion_hours INTEGER,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'assigned', 'scheduled', 'in_progress', 'pending_parts', 'completed', 'cancelled', 'on_hold')),
  assigned_vendor_id TEXT,
  assigned_at TEXT,
  scheduled_date TEXT,
  scheduled_time_start TEXT,
  scheduled_time_end TEXT,
  access_instructions TEXT,
  permission_to_enter INTEGER DEFAULT 0,
  completed_at TEXT,
  completed_by TEXT,
  resolution_notes TEXT,
  not_to_exceed REAL,
  actual_cost REAL,
  labor_cost REAL,
  parts_cost REAL,
  billable_to TEXT DEFAULT 'owner' CHECK (billable_to IN ('owner', 'tenant', 'property', 'warranty')),
  invoice_id TEXT,
  asset_id TEXT,
  photos TEXT,                   -- JSON array
  tenant_rating INTEGER,
  tenant_feedback TEXT,
  reported_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_vendor_id) REFERENCES subcontractors(id) ON DELETE SET NULL
);

-- Vendor Rate Cards
CREATE TABLE IF NOT EXISTS vendor_rate_cards (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_category TEXT,
  rate_type TEXT DEFAULT 'flat' CHECK (rate_type IN ('flat', 'hourly', 'per_unit')),
  flat_rate REAL,
  hourly_rate REAL,
  minimum_charge REAL,
  after_hours_rate REAL,
  emergency_rate REAL,
  effective_date TEXT,
  expiration_date TEXT,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (vendor_id) REFERENCES subcontractors(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Assets (Property equipment tracking)
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT,
  unit_id TEXT,
  name TEXT NOT NULL,
  asset_tag TEXT,
  serial_number TEXT,
  category TEXT,                 -- 'hvac', 'plumbing', 'electrical', 'appliance', 'structural', 'safety'
  subcategory TEXT,
  brand TEXT,
  model TEXT,
  year_installed INTEGER,
  location_description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'needs_repair', 'out_of_service', 'replaced', 'disposed')),
  condition TEXT DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  purchase_date TEXT,
  purchase_cost REAL,
  warranty_expiry TEXT,
  expected_lifespan_years INTEGER,
  replacement_cost REAL,
  last_service_date TEXT,
  next_service_date TEXT,
  maintenance_schedule_id TEXT,
  documents TEXT,                -- JSON array
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

-- Asset History
CREATE TABLE IF NOT EXISTS asset_history (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('installed', 'serviced', 'repaired', 'replaced', 'inspection', 'note')),
  event_date TEXT NOT NULL,
  description TEXT,
  performed_by TEXT,
  vendor_id TEXT,
  work_order_id TEXT,
  cost REAL,
  condition_before TEXT,
  condition_after TEXT,
  documents TEXT,                -- JSON array
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES subcontractors(id) ON DELETE SET NULL,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
);

-- Maintenance Schedules (Preventative maintenance)
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT,
  unit_id TEXT,
  asset_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  frequency_type TEXT NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'custom')),
  frequency_interval INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT,
  last_completed TEXT,
  next_due TEXT,
  default_vendor_id TEXT,
  estimated_cost REAL,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
  FOREIGN KEY (default_vendor_id) REFERENCES subcontractors(id) ON DELETE SET NULL
);

-- Rent Charges
CREATE TABLE IF NOT EXISTS rent_charges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lease_id TEXT NOT NULL,
  charge_type TEXT NOT NULL CHECK (charge_type IN ('rent', 'late_fee', 'utility', 'pet', 'parking', 'storage', 'other')),
  description TEXT,
  amount REAL NOT NULL,
  charge_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'late', 'waived', 'void')),
  amount_paid REAL DEFAULT 0,
  paid_date TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);

-- Multi-industry indexes
CREATE INDEX IF NOT EXISTS idx_user_industry ON user_industry_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_units_property ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_tenants_user ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_property ON work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_assets_property ON assets(property_id);
CREATE INDEX IF NOT EXISTS idx_assets_unit ON assets(unit_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_asset ON asset_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_rent_charges_lease ON rent_charges(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_charges_status ON rent_charges(status);
