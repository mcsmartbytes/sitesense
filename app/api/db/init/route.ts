import { NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

// POST - Initialize database schema
export async function POST() {
  try {
    const client = getTurso();

    // Run schema creation statements
    const statements = [
      // Users (with password auth)
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        company_name TEXT,
        industry_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Industries
      `CREATE TABLE IF NOT EXISTS industries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Clients
      `CREATE TABLE IF NOT EXISTS clients (
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
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Jobs
      `CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        client_id TEXT,
        client_name TEXT,
        industry_id TEXT,
        status TEXT DEFAULT 'active',
        property_address TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,
        structure_type TEXT,
        roof_type TEXT,
        roof_pitch TEXT,
        layers INTEGER,
        measured_squares REAL,
        dumpster_size TEXT,
        dumpster_hauler TEXT,
        start_date TEXT,
        end_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Tool Categories
      `CREATE TABLE IF NOT EXISTS tool_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Tools
      `CREATE TABLE IF NOT EXISTS tools (
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
        status TEXT DEFAULT 'available',
        condition TEXT DEFAULT 'good',
        home_location TEXT,
        current_location TEXT,
        assigned_to_user TEXT,
        assigned_to_job TEXT,
        assigned_at TEXT,
        image_url TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Tool Checkouts
      `CREATE TABLE IF NOT EXISTS tool_checkouts (
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
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Tool Maintenance
      `CREATE TABLE IF NOT EXISTS tool_maintenance (
        id TEXT PRIMARY KEY,
        tool_id TEXT NOT NULL,
        user_id TEXT,
        maintenance_type TEXT NOT NULL,
        description TEXT NOT NULL,
        performed_by TEXT,
        performed_at TEXT NOT NULL DEFAULT (date('now')),
        cost REAL,
        vendor TEXT,
        status TEXT DEFAULT 'completed',
        next_maintenance_date TEXT,
        receipt_url TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Crew Members
      `CREATE TABLE IF NOT EXISTS crew_members (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        role TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Todos / Tasks with reminders
      `CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        due_date TEXT,
        due_time TEXT,
        reminder_date TEXT,
        reminder_time TEXT,
        job_id TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Contacts for CRM
      `CREATE TABLE IF NOT EXISTS contacts (
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
        type TEXT DEFAULT 'lead',
        source TEXT,
        tags TEXT,
        notes TEXT,
        last_contacted TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Expense Categories
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        deduction_percentage INTEGER DEFAULT 100,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Expenses
      `CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        category_id TEXT,
        date TEXT NOT NULL,
        vendor TEXT,
        is_business INTEGER DEFAULT 1,
        payment_method TEXT,
        receipt_url TEXT,
        job_id TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Budgets
      `CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category_id TEXT,
        budget_amount REAL NOT NULL,
        period TEXT DEFAULT 'monthly',
        start_date TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Mileage
      `CREATE TABLE IF NOT EXISTS mileage (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        trip_date TEXT NOT NULL,
        miles REAL NOT NULL,
        purpose TEXT NOT NULL,
        start_location TEXT,
        end_location TEXT,
        is_round_trip INTEGER DEFAULT 0,
        notes TEXT,
        job_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Time Entries
      `CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        date TEXT NOT NULL,
        hours REAL NOT NULL,
        hourly_rate REAL,
        description TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Estimates
      `CREATE TABLE IF NOT EXISTS estimates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        job_id TEXT,
        contact_id TEXT,
        title TEXT,
        po_number TEXT,
        client_name TEXT,
        client_email TEXT,
        client_phone TEXT,
        client_address TEXT,
        project_address TEXT,
        estimate_date TEXT,
        payment_terms TEXT,
        scope_of_work TEXT,
        status TEXT DEFAULT 'draft',
        subtotal REAL DEFAULT 0,
        discount_type TEXT DEFAULT 'percent',
        discount_value REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        tax_rate REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        notes TEXT,
        terms_and_conditions TEXT,
        valid_until TEXT,
        public_token TEXT UNIQUE,
        sent_at TEXT,
        viewed_at TEXT,
        accepted_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Estimate Line Items
      `CREATE TABLE IF NOT EXISTS estimate_items (
        id TEXT PRIMARY KEY,
        estimate_id TEXT NOT NULL,
        description TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        unit TEXT,
        unit_price REAL DEFAULT 0,
        total REAL DEFAULT 0,
        is_optional INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Recurring Expenses
      `CREATE TABLE IF NOT EXISTS recurring_expenses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        category_id TEXT,
        vendor TEXT,
        frequency TEXT DEFAULT 'monthly',
        next_due TEXT,
        is_active INTEGER DEFAULT 1,
        payment_method TEXT,
        is_business INTEGER DEFAULT 1,
        notes TEXT,
        last_generated TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Receipts
      `CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expense_id TEXT,
        file_url TEXT NOT NULL,
        file_name TEXT,
        file_type TEXT,
        ocr_data TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Job Permits
      `CREATE TABLE IF NOT EXISTS permits (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        permit_type TEXT,
        permit_number TEXT,
        authority TEXT,
        status TEXT DEFAULT 'pending',
        applied_date TEXT,
        approved_date TEXT,
        expires_date TEXT,
        inspection_date TEXT,
        fee REAL,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Job Phases (user's job-specific phases)
      `CREATE TABLE IF NOT EXISTS job_phases (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        sort_order INTEGER DEFAULT 0,
        start_date TEXT,
        end_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Job Tasks
      `CREATE TABLE IF NOT EXISTS job_tasks (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        phase_id TEXT,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        assigned_to TEXT,
        due_date TEXT,
        completed_at TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Job Materials
      `CREATE TABLE IF NOT EXISTS job_materials (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        quantity REAL DEFAULT 1,
        unit TEXT,
        unit_cost REAL,
        total_cost REAL,
        vendor TEXT,
        status TEXT DEFAULT 'needed',
        ordered_date TEXT,
        received_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      // Industry Phases (for seeding)
      `CREATE TABLE IF NOT EXISTS industry_phases (
        id TEXT PRIMARY KEY,
        industry_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Industry Tasks (for seeding)
      `CREATE TABLE IF NOT EXISTS industry_tasks (
        id TEXT PRIMARY KEY,
        industry_id TEXT NOT NULL,
        phase_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        is_default INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Industry Fields (custom fields per industry)
      `CREATE TABLE IF NOT EXISTS industry_fields (
        id TEXT PRIMARY KEY,
        industry_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        field_label TEXT NOT NULL,
        field_type TEXT DEFAULT 'text',
        is_required INTEGER DEFAULT 0,
        options TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // User Phases (user-specific phases seeded from industry)
      `CREATE TABLE IF NOT EXISTS user_phases (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phase_order INTEGER DEFAULT 0,
        tasks TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // User Fields (user-specific custom fields seeded from industry)
      `CREATE TABLE IF NOT EXISTS user_fields (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        field_label TEXT NOT NULL,
        field_type TEXT DEFAULT 'text',
        field_options TEXT,
        field_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_tools_user_id ON tools(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tools_qr_code ON tools(qr_code)`,
      `CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status)`,
      `CREATE INDEX IF NOT EXISTS idx_tool_checkouts_tool_id ON tool_checkouts(tool_id)`,
      `CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)`,
      `CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type)`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`,
      `CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_mileage_user_id ON mileage(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_mileage_trip_date ON mileage(trip_date)`,
      `CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_time_entries_job_id ON time_entries(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_estimates_job_id ON estimates(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id ON estimate_items(estimate_id)`,
      `CREATE INDEX IF NOT EXISTS idx_recurring_expenses_user_id ON recurring_expenses(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_industry_phases_industry_id ON industry_phases(industry_id)`,
      `CREATE INDEX IF NOT EXISTS idx_industry_tasks_industry_id ON industry_tasks(industry_id)`,
      `CREATE INDEX IF NOT EXISTS idx_industry_fields_industry_id ON industry_fields(industry_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_phases_user_id ON user_phases(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_fields_user_id ON user_fields(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_permits_job_id ON permits(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_permits_user_id ON permits(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_phases_job_id ON job_phases(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_phases_user_id ON job_phases(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_tasks_job_id ON job_tasks(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_tasks_user_id ON job_tasks(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_tasks_phase_id ON job_tasks(phase_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_materials_job_id ON job_materials(job_id)`,
      `CREATE INDEX IF NOT EXISTS idx_job_materials_user_id ON job_materials(user_id)`,
    ];

    // Execute each statement
    for (const sql of statements) {
      await client.execute(sql);
    }

    // Migration: Add columns if they don't exist (for existing installations)
    const migrations = [
      // Try to add password_hash column to existing users table
      `ALTER TABLE users ADD COLUMN password_hash TEXT`,
      `ALTER TABLE users ADD COLUMN company_name TEXT`,
      `ALTER TABLE users ADD COLUMN industry_id TEXT`,
      // Add payment_method to expenses
      `ALTER TABLE expenses ADD COLUMN payment_method TEXT`,
      // Add contact_id to estimates
      `ALTER TABLE estimates ADD COLUMN contact_id TEXT`,
      // Add authority and inspection_date to permits
      `ALTER TABLE permits ADD COLUMN authority TEXT`,
      `ALTER TABLE permits ADD COLUMN inspection_date TEXT`,
      // Add new estimate fields
      `ALTER TABLE estimates ADD COLUMN title TEXT`,
      `ALTER TABLE estimates ADD COLUMN project_address TEXT`,
      `ALTER TABLE estimates ADD COLUMN estimate_date TEXT`,
      `ALTER TABLE estimates ADD COLUMN payment_terms TEXT`,
      `ALTER TABLE estimates ADD COLUMN scope_of_work TEXT`,
      `ALTER TABLE estimates ADD COLUMN terms_and_conditions TEXT`,
      `ALTER TABLE estimates ADD COLUMN discount_type TEXT DEFAULT 'percent'`,
      `ALTER TABLE estimates ADD COLUMN discount_value REAL DEFAULT 0`,
      `ALTER TABLE estimates ADD COLUMN discount_amount REAL DEFAULT 0`,
      // Add unit to estimate_items
      `ALTER TABLE estimate_items ADD COLUMN unit TEXT`,
      // Add is_optional to estimate_items
      `ALTER TABLE estimate_items ADD COLUMN is_optional INTEGER DEFAULT 0`,
    ];

    for (const sql of migrations) {
      try {
        await client.execute(sql);
      } catch {
        // Column already exists, ignore error
      }
    }

    // Insert default industries
    const defaultIndustries = [
      ['ind_roofing', 'Roofing', 'Residential and commercial roofing'],
      ['ind_framing', 'Framing', 'Structural framing and carpentry'],
      ['ind_painting', 'Painting', 'Interior and exterior painting'],
      ['ind_concrete', 'Concrete', 'Flatwork, foundations, structural'],
      ['ind_electrical', 'Electrical', 'Residential and commercial electrical'],
      ['ind_plumbing', 'Plumbing', 'Residential and commercial plumbing'],
      ['ind_general', 'General Contracting', 'Full-service general contracting'],
      ['ind_landscaping', 'Landscaping', 'Landscape and hardscape'],
      ['ind_hvac', 'HVAC', 'Heating, ventilation, and air conditioning'],
      ['ind_flooring', 'Flooring', 'Flooring installation and refinishing'],
    ];

    for (const [id, name, description] of defaultIndustries) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO industries (id, name, description) VALUES (?, ?, ?)',
        args: [id, name, description],
      });
    }

    // Insert industry phases
    const industryPhases = [
      // Roofing phases
      ['ph_roof_1', 'ind_roofing', 'Lead Intake', 1],
      ['ph_roof_2', 'ind_roofing', 'Estimate & Proposal', 2],
      ['ph_roof_3', 'ind_roofing', 'Contract & Permitting', 3],
      ['ph_roof_4', 'ind_roofing', 'Planning & Scheduling', 4],
      ['ph_roof_5', 'ind_roofing', 'Execution', 5],
      ['ph_roof_6', 'ind_roofing', 'Inspection & Punch', 6],
      ['ph_roof_7', 'ind_roofing', 'Closeout & Warranty', 7],
      // Framing phases
      ['ph_frame_1', 'ind_framing', 'Intake', 1],
      ['ph_frame_2', 'ind_framing', 'Estimate', 2],
      ['ph_frame_3', 'ind_framing', 'Contract', 3],
      ['ph_frame_4', 'ind_framing', 'Planning', 4],
      ['ph_frame_5', 'ind_framing', 'Execution', 5],
      ['ph_frame_6', 'ind_framing', 'Inspection', 6],
      ['ph_frame_7', 'ind_framing', 'Closeout', 7],
      // Electrical phases
      ['ph_elec_1', 'ind_electrical', 'Intake', 1],
      ['ph_elec_2', 'ind_electrical', 'Estimate', 2],
      ['ph_elec_3', 'ind_electrical', 'Permits', 3],
      ['ph_elec_4', 'ind_electrical', 'Rough-in', 4],
      ['ph_elec_5', 'ind_electrical', 'Inspection', 5],
      ['ph_elec_6', 'ind_electrical', 'Trim-out', 6],
      ['ph_elec_7', 'ind_electrical', 'Final Closeout', 7],
      // Plumbing phases
      ['ph_plumb_1', 'ind_plumbing', 'Intake', 1],
      ['ph_plumb_2', 'ind_plumbing', 'Diagnosis & Estimate', 2],
      ['ph_plumb_3', 'ind_plumbing', 'Contract', 3],
      ['ph_plumb_4', 'ind_plumbing', 'Rough-in', 4],
      ['ph_plumb_5', 'ind_plumbing', 'Inspection', 5],
      ['ph_plumb_6', 'ind_plumbing', 'Trim', 6],
      ['ph_plumb_7', 'ind_plumbing', 'Closeout', 7],
      // HVAC phases
      ['ph_hvac_1', 'ind_hvac', 'Intake', 1],
      ['ph_hvac_2', 'ind_hvac', 'Load Calculations', 2],
      ['ph_hvac_3', 'ind_hvac', 'Permits', 3],
      ['ph_hvac_4', 'ind_hvac', 'Rough-in', 4],
      ['ph_hvac_5', 'ind_hvac', 'Set & Startup', 5],
      ['ph_hvac_6', 'ind_hvac', 'Inspection', 6],
      ['ph_hvac_7', 'ind_hvac', 'Closeout', 7],
      // General Contractor phases
      ['ph_gc_1', 'ind_general', 'Intake', 1],
      ['ph_gc_2', 'ind_general', 'Preconstruction', 2],
      ['ph_gc_3', 'ind_general', 'Contract', 3],
      ['ph_gc_4', 'ind_general', 'Procurement', 4],
      ['ph_gc_5', 'ind_general', 'Execution', 5],
      ['ph_gc_6', 'ind_general', 'Punch', 6],
      ['ph_gc_7', 'ind_general', 'Closeout', 7],
    ];

    for (const [id, industryId, name, sortOrder] of industryPhases) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO industry_phases (id, industry_id, name, sort_order) VALUES (?, ?, ?, ?)',
        args: [id, industryId, name, sortOrder],
      });
    }

    // Insert industry-specific fields
    const industryFields = [
      // Roofing fields
      ['fld_roof_1', 'ind_roofing', 'roof_type', 'Roof Type', 'select', 'Shingle,Metal,Tile,Flat,Slate', 1],
      ['fld_roof_2', 'ind_roofing', 'roof_pitch', 'Roof Pitch', 'text', null, 2],
      ['fld_roof_3', 'ind_roofing', 'layers', 'Existing Layers', 'number', null, 3],
      ['fld_roof_4', 'ind_roofing', 'measured_squares', 'Measured Squares', 'number', null, 4],
      ['fld_roof_5', 'ind_roofing', 'deck_condition', 'Deck Condition', 'select', 'Good,Fair,Poor,Needs Replacement', 5],
      ['fld_roof_6', 'ind_roofing', 'dumpster_size', 'Dumpster Size', 'text', null, 6],
      // Electrical fields
      ['fld_elec_1', 'ind_electrical', 'service_size', 'Service Size (Amps)', 'select', '100,150,200,400', 1],
      ['fld_elec_2', 'ind_electrical', 'panel_location', 'Panel Location', 'text', null, 2],
      ['fld_elec_3', 'ind_electrical', 'circuits_needed', 'Circuits Needed', 'number', null, 3],
      // Plumbing fields
      ['fld_plumb_1', 'ind_plumbing', 'pipe_material', 'Pipe Material', 'select', 'PVC,Copper,PEX,Cast Iron,Galvanized', 1],
      ['fld_plumb_2', 'ind_plumbing', 'fixtures_count', 'Fixture Count', 'number', null, 2],
      ['fld_plumb_3', 'ind_plumbing', 'water_heater_type', 'Water Heater Type', 'select', 'Tank,Tankless,Heat Pump', 3],
      // HVAC fields
      ['fld_hvac_1', 'ind_hvac', 'system_type', 'System Type', 'select', 'Split,Package,Mini-Split,Geothermal', 1],
      ['fld_hvac_2', 'ind_hvac', 'tonnage', 'Tonnage/BTU', 'text', null, 2],
      ['fld_hvac_3', 'ind_hvac', 'seer_rating', 'SEER Rating', 'number', null, 3],
      // Painting fields
      ['fld_paint_1', 'ind_painting', 'surface_type', 'Surface Type', 'select', 'Drywall,Wood,Stucco,Brick,Metal', 1],
      ['fld_paint_2', 'ind_painting', 'coat_count', 'Number of Coats', 'select', '1,2,3', 2],
      ['fld_paint_3', 'ind_painting', 'paint_type', 'Paint Type', 'select', 'Latex,Oil,Primer,Stain', 3],
      // Concrete fields
      ['fld_conc_1', 'ind_concrete', 'concrete_type', 'Concrete Type', 'select', 'Flatwork,Foundation,Structural,Decorative', 1],
      ['fld_conc_2', 'ind_concrete', 'psi_rating', 'PSI Rating', 'select', '2500,3000,3500,4000,4500', 2],
      ['fld_conc_3', 'ind_concrete', 'reinforcement', 'Reinforcement', 'select', 'None,Wire Mesh,Rebar,Fiber', 3],
      // Framing fields
      ['fld_frame_1', 'ind_framing', 'lumber_species', 'Lumber Species', 'select', 'SPF,Doug Fir,LVL,Engineered', 1],
      ['fld_frame_2', 'ind_framing', 'wall_type', 'Wall Type', 'select', 'Load Bearing,Non-Load Bearing,Shear', 2],
      // Landscaping fields
      ['fld_land_1', 'ind_landscaping', 'project_type', 'Project Type', 'select', 'Softscape,Hardscape,Irrigation,Lighting,Full Design', 1],
      ['fld_land_2', 'ind_landscaping', 'irrigation_zones', 'Irrigation Zones', 'number', null, 2],
      // Flooring fields
      ['fld_floor_1', 'ind_flooring', 'flooring_type', 'Flooring Type', 'select', 'Hardwood,Laminate,LVP,Tile,Carpet', 1],
      ['fld_floor_2', 'ind_flooring', 'square_footage', 'Square Footage', 'number', null, 2],
      ['fld_floor_3', 'ind_flooring', 'subfloor_condition', 'Subfloor Condition', 'select', 'Good,Needs Leveling,Needs Replacement', 3],
    ];

    for (const [id, industryId, fieldName, fieldLabel, fieldType, options, sortOrder] of industryFields) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO industry_fields (id, industry_id, field_name, field_label, field_type, options, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [id, industryId, fieldName, fieldLabel, fieldType, options, sortOrder],
      });
    }

    // Insert default tool categories
    const defaultCategories = [
      ['tcat_power', 'Power Tools', 'Electric and battery-powered tools', 'zap', '#f59e0b'],
      ['tcat_hand', 'Hand Tools', 'Manual non-powered tools', 'wrench', '#3b82f6'],
      ['tcat_safety', 'Safety Equipment', 'PPE and safety gear', 'shield', '#10b981'],
      ['tcat_ladder', 'Ladders & Scaffolding', 'Height access equipment', 'arrow-up', '#8b5cf6'],
      ['tcat_measure', 'Measuring & Layout', 'Measuring tapes, levels, lasers', 'ruler', '#ec4899'],
      ['tcat_cutting', 'Cutting Tools', 'Saws, blades, cutting equipment', 'scissors', '#ef4444'],
      ['tcat_fasten', 'Fastening Tools', 'Nail guns, staplers, screw guns', 'link', '#6366f1'],
      ['tcat_heavy', 'Heavy Equipment', 'Large machinery and vehicles', 'truck', '#78716c'],
      ['tcat_special', 'Specialty Tools', 'Trade-specific specialized tools', 'star', '#14b8a6'],
      ['tcat_consumable', 'Consumables', 'Bits, blades, batteries, supplies', 'package', '#64748b'],
    ];

    for (const [id, name, description, icon, color] of defaultCategories) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO tool_categories (id, name, description, icon, color) VALUES (?, ?, ?, ?, ?)',
        args: [id, name, description, icon, color],
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (error: any) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET - Check database status
export async function GET() {
  try {
    const client = getTurso();

    // Try a simple query
    const result = await client.execute('SELECT COUNT(*) as count FROM tool_categories');
    const count = result.rows[0]?.count || 0;

    return NextResponse.json({
      success: true,
      connected: true,
      tool_categories_count: count,
    });
  } catch (error: any) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { success: false, connected: false, error: error.message },
      { status: 500 }
    );
  }
}
