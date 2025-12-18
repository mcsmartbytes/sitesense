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
