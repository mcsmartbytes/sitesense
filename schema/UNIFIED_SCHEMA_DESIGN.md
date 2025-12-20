# SiteSense Unified Multi-Industry Schema Design

## Design Philosophy

**"One schema, configurable by industry"**

Rather than separate databases per industry, we use:
1. Industry profiles that define enabled modules/fields
2. Discriminator fields (`industry_type`) on polymorphic tables
3. Extension tables for industry-specific data
4. Shared core tables for common functionality

## Entity Mapping

| Unified Concept | GC Implementation | Property Mgmt Implementation |
|-----------------|-------------------|------------------------------|
| **Location** | Job site | Property |
| **Sub-Location** | Job Phase | Unit |
| **Service Provider** | Subcontractor | Vendor |
| **Service Request** | Bid Package | Work Order |
| **Stakeholder** | Client/Contact | Tenant/Owner |
| **Quote** | Estimate | Maintenance Quote |
| **Billable** | SOV Line Item | Invoice Item |
| **Asset** | Tool | Appliance/Equipment |

## Core Tables (Shared Across Industries)

### industry_profiles
Master configuration for each supported industry.

```sql
CREATE TABLE industry_profiles (
  id TEXT PRIMARY KEY,           -- 'gc', 'property_mgmt', 'trade_contractor'
  name TEXT NOT NULL,            -- 'General Contractor'
  description TEXT,
  icon TEXT,
  color TEXT,

  -- Module configuration (JSON)
  enabled_modules TEXT,          -- ["jobs", "estimates", "sov", "bid_packages"]
  disabled_modules TEXT,         -- ["work_orders", "tenants"]

  -- Field configuration (JSON)
  required_fields TEXT,          -- {"jobs": ["client_id"], "estimates": ["po_number"]}
  hidden_fields TEXT,            -- {"jobs": ["tenant_id", "lease_id"]}

  -- Terminology overrides (JSON)
  terminology TEXT,              -- {"job": "Project", "client": "Customer"}

  -- Default settings (JSON)
  default_settings TEXT,         -- {"default_retainage": 10, "default_markup": 15}

  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### user_industry_settings
Per-user industry configuration.

```sql
CREATE TABLE user_industry_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  industry_id TEXT NOT NULL,     -- FK to industry_profiles

  -- User overrides (JSON)
  custom_terminology TEXT,
  custom_settings TEXT,

  -- Onboarding
  onboarding_completed INTEGER DEFAULT 0,
  onboarding_step TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (industry_id) REFERENCES industry_profiles(id)
);
```

## Extended Jobs Table (Unified Location)

The `jobs` table becomes the unified "location" entity:

```sql
-- Add to existing jobs table:
ALTER TABLE jobs ADD COLUMN industry_type TEXT DEFAULT 'gc';
ALTER TABLE jobs ADD COLUMN location_type TEXT;  -- 'job_site', 'property', 'facility'

-- Property Management specific (nullable for GC)
ALTER TABLE jobs ADD COLUMN property_type TEXT;  -- 'residential', 'commercial', 'industrial'
ALTER TABLE jobs ADD COLUMN owner_id TEXT;       -- FK to stakeholders
ALTER TABLE jobs ADD COLUMN manager_id TEXT;     -- FK to stakeholders
ALTER TABLE jobs ADD COLUMN year_built INTEGER;
ALTER TABLE jobs ADD COLUMN square_footage REAL;
ALTER TABLE jobs ADD COLUMN num_units INTEGER;
ALTER TABLE jobs ADD COLUMN portfolio_id TEXT;   -- For grouping properties
```

## Property Management Specific Tables

### units (Sub-locations within properties)
```sql
CREATE TABLE units (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,     -- FK to jobs where industry_type = 'property_mgmt'
  user_id TEXT NOT NULL,

  unit_number TEXT NOT NULL,     -- "101", "A", "Suite 500"
  unit_type TEXT,                -- 'apartment', 'office', 'retail', 'storage'
  floor INTEGER,

  -- Size
  square_footage REAL,
  bedrooms INTEGER,
  bathrooms REAL,

  -- Status
  status TEXT DEFAULT 'vacant',  -- 'vacant', 'occupied', 'maintenance', 'offline'

  -- Current occupant
  current_tenant_id TEXT,
  current_lease_id TEXT,

  -- Rent
  market_rent REAL,
  current_rent REAL,

  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (property_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### tenants
```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- Contact info (extends stakeholder pattern)
  first_name TEXT NOT NULL,
  last_name TEXT,
  company_name TEXT,             -- For commercial tenants
  email TEXT,
  phone TEXT,
  mobile TEXT,

  -- Emergency contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,

  -- Status
  status TEXT DEFAULT 'prospect', -- 'prospect', 'applicant', 'active', 'past', 'evicted'

  -- Screening
  credit_score INTEGER,
  background_check_date TEXT,
  background_check_status TEXT,

  -- Preferences
  preferred_contact_method TEXT,
  communication_opt_in INTEGER DEFAULT 1,

  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### leases
```sql
CREATE TABLE leases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  unit_id TEXT,
  tenant_id TEXT NOT NULL,

  -- Lease terms
  lease_type TEXT DEFAULT 'fixed', -- 'fixed', 'month_to_month', 'week_to_week'
  start_date TEXT NOT NULL,
  end_date TEXT,

  -- Rent
  monthly_rent REAL NOT NULL,
  security_deposit REAL,
  pet_deposit REAL,

  -- Payment
  rent_due_day INTEGER DEFAULT 1, -- Day of month rent is due
  late_fee_amount REAL,
  late_fee_grace_days INTEGER DEFAULT 5,

  -- Status
  status TEXT DEFAULT 'draft',   -- 'draft', 'pending', 'active', 'expired', 'terminated'

  -- Move in/out
  move_in_date TEXT,
  move_out_date TEXT,
  move_in_inspection_id TEXT,
  move_out_inspection_id TEXT,

  -- Documents
  lease_document_url TEXT,

  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

### work_orders (Service Requests for PM)
```sql
CREATE TABLE work_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  unit_id TEXT,
  tenant_id TEXT,                -- Who reported it

  -- Request details
  work_order_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,                 -- 'plumbing', 'electrical', 'hvac', 'appliance', 'general'

  -- Priority & SLA
  priority TEXT DEFAULT 'normal', -- 'emergency', 'urgent', 'normal', 'low'
  sla_response_hours INTEGER,
  sla_completion_hours INTEGER,

  -- Status workflow
  status TEXT DEFAULT 'new',     -- 'new', 'triaged', 'assigned', 'in_progress', 'pending_parts', 'completed', 'cancelled'

  -- Assignment
  assigned_vendor_id TEXT,       -- FK to subcontractors (unified service providers)
  assigned_at TEXT,

  -- Scheduling
  scheduled_date TEXT,
  scheduled_time_start TEXT,
  scheduled_time_end TEXT,

  -- Access
  access_instructions TEXT,
  permission_to_enter INTEGER DEFAULT 0,

  -- Completion
  completed_at TEXT,
  completed_by TEXT,
  resolution_notes TEXT,

  -- Cost
  not_to_exceed REAL,            -- NTE amount
  actual_cost REAL,
  labor_cost REAL,
  parts_cost REAL,

  -- Billing
  billable_to TEXT,              -- 'owner', 'tenant', 'property'
  invoice_id TEXT,

  -- Asset tracking
  asset_id TEXT,                 -- If related to specific asset

  -- Photos (JSON array)
  photos TEXT,

  -- Tenant satisfaction
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
```

### vendor_rate_cards (Extends subcontractors for PM)
```sql
CREATE TABLE vendor_rate_cards (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,       -- FK to subcontractors
  user_id TEXT NOT NULL,

  -- Service
  service_name TEXT NOT NULL,    -- "HVAC Service Call", "Plumbing Repair"
  service_category TEXT,

  -- Pricing
  rate_type TEXT DEFAULT 'flat', -- 'flat', 'hourly', 'per_unit'
  flat_rate REAL,
  hourly_rate REAL,
  minimum_charge REAL,

  -- After hours
  after_hours_rate REAL,
  emergency_rate REAL,

  -- Valid dates
  effective_date TEXT,
  expiration_date TEXT,

  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (vendor_id) REFERENCES subcontractors(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### assets (Trackable equipment at properties)
```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT,
  unit_id TEXT,

  -- Identification
  name TEXT NOT NULL,            -- "HVAC Unit", "Water Heater", "Refrigerator"
  asset_tag TEXT,
  serial_number TEXT,

  -- Classification
  category TEXT,                 -- 'hvac', 'plumbing', 'electrical', 'appliance', 'structural'
  subcategory TEXT,

  -- Details
  brand TEXT,
  model TEXT,
  year_installed INTEGER,

  -- Location
  location_description TEXT,     -- "Unit 101 Kitchen", "Rooftop"

  -- Status
  status TEXT DEFAULT 'active',  -- 'active', 'needs_repair', 'out_of_service', 'replaced'
  condition TEXT DEFAULT 'good', -- 'excellent', 'good', 'fair', 'poor'

  -- Lifecycle
  purchase_date TEXT,
  purchase_cost REAL,
  warranty_expiry TEXT,
  expected_lifespan_years INTEGER,
  replacement_cost REAL,

  -- Maintenance
  last_service_date TEXT,
  next_service_date TEXT,
  maintenance_schedule_id TEXT,

  -- Documents (JSON)
  documents TEXT,                -- Manuals, warranties

  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);
```

### asset_history
```sql
CREATE TABLE asset_history (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  -- Event
  event_type TEXT NOT NULL,      -- 'installed', 'serviced', 'repaired', 'replaced', 'inspection', 'note'
  event_date TEXT NOT NULL,

  -- Details
  description TEXT,
  performed_by TEXT,             -- Vendor name or internal
  vendor_id TEXT,
  work_order_id TEXT,

  -- Cost
  cost REAL,

  -- Condition change
  condition_before TEXT,
  condition_after TEXT,

  -- Documents (JSON)
  documents TEXT,

  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES subcontractors(id) ON DELETE SET NULL,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL
);
```

### maintenance_schedules (Preventative maintenance)
```sql
CREATE TABLE maintenance_schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- Scope
  property_id TEXT,              -- NULL = all properties
  unit_id TEXT,
  asset_id TEXT,

  -- Schedule
  name TEXT NOT NULL,            -- "Quarterly HVAC Filter Change"
  description TEXT,
  category TEXT,

  -- Frequency
  frequency_type TEXT NOT NULL,  -- 'daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'custom'
  frequency_interval INTEGER,    -- For custom: every N days

  -- Timing
  start_date TEXT NOT NULL,
  end_date TEXT,                 -- NULL = no end
  last_completed TEXT,
  next_due TEXT,

  -- Assignment
  default_vendor_id TEXT,
  estimated_cost REAL,

  -- Status
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
```

### rent_charges (Rent and recurring charges)
```sql
CREATE TABLE rent_charges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lease_id TEXT NOT NULL,

  -- Charge details
  charge_type TEXT NOT NULL,     -- 'rent', 'late_fee', 'utility', 'pet', 'parking', 'other'
  description TEXT,
  amount REAL NOT NULL,

  -- Period
  charge_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'partial', 'late', 'waived', 'void'

  -- Payment
  amount_paid REAL DEFAULT 0,
  paid_date TEXT,
  payment_method TEXT,

  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);
```

## Industry Profile Seed Data

```sql
INSERT INTO industry_profiles (id, name, description, icon, enabled_modules, terminology, default_settings) VALUES
('gc', 'General Contractor', 'Commercial and residential general contracting', 'building',
 '["jobs", "estimates", "sov", "bid_packages", "subcontractors", "change_orders", "permits", "time_tracking", "expenses"]',
 '{"location": "Job", "sub_location": "Phase", "service_provider": "Subcontractor", "stakeholder": "Client"}',
 '{"default_retainage": 10, "default_markup": 15}'),

('property_mgmt', 'Property Management', 'Residential and commercial property management', 'home',
 '["properties", "units", "tenants", "leases", "work_orders", "vendors", "assets", "maintenance_schedules", "rent_tracking"]',
 '{"location": "Property", "sub_location": "Unit", "service_provider": "Vendor", "stakeholder": "Tenant"}',
 '{"default_late_fee_percent": 5, "default_late_grace_days": 5}'),

('trade_contractor', 'Trade Contractor', 'Electrical, plumbing, HVAC, and specialty trades', 'wrench',
 '["jobs", "estimates", "time_tracking", "expenses", "service_calls", "inventory"]',
 '{"location": "Job", "sub_location": "Task", "service_provider": "Supplier", "stakeholder": "Customer"}',
 '{"default_hourly_rate": 85, "default_service_call_fee": 75}'),

('developer', 'Developer / Owner-Builder', 'Real estate development and owner-builder projects', 'layers',
 '["projects", "estimates", "sov", "bid_packages", "subcontractors", "financing", "permits", "milestones"]',
 '{"location": "Project", "sub_location": "Phase", "service_provider": "Contractor", "stakeholder": "Investor"}',
 '{"default_contingency": 10, "default_profit_margin": 20}');
```

## Migration Strategy

1. **Phase 1**: Add `industry_profiles` and `user_industry_settings` tables
2. **Phase 2**: Add `industry_type` to `jobs` table, default to 'gc'
3. **Phase 3**: Create PM-specific tables (units, tenants, leases, work_orders, assets)
4. **Phase 4**: Create unified API endpoints with industry context
5. **Phase 5**: Update UI components to respect industry settings

## API Pattern

```typescript
// Middleware extracts user's industry from session
const userIndustry = await getUserIndustry(userId);

// Routes adapt based on industry
GET /api/locations        // Returns jobs (GC) or properties (PM)
GET /api/service-requests // Returns bid_packages (GC) or work_orders (PM)
GET /api/stakeholders     // Returns clients (GC) or tenants (PM)

// Or keep industry-specific routes
GET /api/gc/jobs
GET /api/pm/properties
GET /api/pm/work-orders
```
