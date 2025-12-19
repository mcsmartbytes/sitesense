import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// =====================================================
// USERS
// =====================================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  password_hash: text('password_hash'),
  full_name: text('full_name'),
  company_name: text('company_name'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// INDUSTRIES
// =====================================================

export const industries = sqliteTable('industries', {
  id: text('id').primaryKey(),
  name: text('name').unique().notNull(),
  description: text('description'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// CLIENTS
// =====================================================

export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// JOBS
// =====================================================

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  client_id: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
  client_name: text('client_name'),
  industry_id: text('industry_id').references(() => industries.id, { onDelete: 'set null' }),
  status: text('status', { enum: ['planned', 'active', 'completed', 'cancelled'] }).default('active'),
  property_address: text('property_address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  structure_type: text('structure_type'),
  roof_type: text('roof_type'),
  roof_pitch: text('roof_pitch'),
  layers: integer('layers'),
  measured_squares: real('measured_squares'),
  dumpster_size: text('dumpster_size'),
  dumpster_hauler: text('dumpster_hauler'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_jobs_user_id').on(table.user_id),
  index('idx_jobs_status').on(table.status),
]);

// =====================================================
// JOB PHASES
// =====================================================

export const jobPhases = sqliteTable('job_phases', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  sort_order: integer('sort_order').default(0),
  status: text('status', { enum: ['pending', 'in_progress', 'completed'] }).default('pending'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// JOB TASKS
// =====================================================

export const jobTasks = sqliteTable('job_tasks', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  phase_id: text('phase_id').references(() => jobPhases.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'in_progress', 'blocked', 'done'] }).default('todo'),
  assignee: text('assignee'),
  due_date: text('due_date'),
  estimated_hours: real('estimated_hours'),
  sort_order: integer('sort_order').default(0),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// PERMITS
// =====================================================

export const permits = sqliteTable('permits', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  permit_number: text('permit_number'),
  authority: text('authority'),
  status: text('status', { enum: ['draft', 'applied', 'approved', 'rejected', 'closed'] }).default('draft'),
  applied_date: text('applied_date'),
  approved_date: text('approved_date'),
  inspection_date: text('inspection_date'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// JOB MATERIALS
// =====================================================

export const jobMaterials = sqliteTable('job_materials', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: real('quantity'),
  unit: text('unit'),
  unit_cost: real('unit_cost'),
  vendor: text('vendor'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// JOB PHOTOS
// =====================================================

export const jobPhotos = sqliteTable('job_photos', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  category: text('category', { enum: ['before', 'during', 'after', 'other'] }).default('other'),
  caption: text('caption'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// WEATHER DELAYS
// =====================================================

export const weatherDelays = sqliteTable('weather_delays', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  delay_date: text('delay_date').notNull(),
  hours_lost: real('hours_lost'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// TIME ENTRIES
// =====================================================

export const timeEntries = sqliteTable('time_entries', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  job_id: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  entry_date: text('entry_date').notNull(),
  hours: real('hours').notNull(),
  hourly_rate: real('hourly_rate'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_time_entries_user_id').on(table.user_id),
  index('idx_time_entries_job_id').on(table.job_id),
]);

// =====================================================
// CATEGORIES
// =====================================================

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  user_id: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  deduction_percentage: integer('deduction_percentage').default(100),
  is_default: integer('is_default').default(0),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// EXPENSES
// =====================================================

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  job_id: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  category_id: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  vendor: text('vendor'),
  payment_method: text('payment_method'),
  is_business: integer('is_business').default(1),
  receipt_url: text('receipt_url'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_expenses_user_id').on(table.user_id),
  index('idx_expenses_job_id').on(table.job_id),
]);

// =====================================================
// ESTIMATES
// =====================================================

export const estimates = sqliteTable('estimates', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  job_id: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  client_name: text('client_name'),
  client_email: text('client_email'),
  client_phone: text('client_phone'),
  client_address: text('client_address'),
  status: text('status', { enum: ['draft', 'sent', 'accepted', 'declined', 'expired'] }).default('draft'),
  subtotal: real('subtotal').default(0),
  tax_rate: real('tax_rate').default(0),
  tax_amount: real('tax_amount').default(0),
  total: real('total').default(0),
  po_number: text('po_number'),
  valid_until: text('valid_until'),
  notes: text('notes'),
  terms: text('terms'),
  public_token: text('public_token').unique(),
  sent_at: text('sent_at'),
  accepted_at: text('accepted_at'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_estimates_user_id').on(table.user_id),
  index('idx_estimates_job_id').on(table.job_id),
]);

// =====================================================
// ESTIMATE ITEMS
// =====================================================

export const estimateItems = sqliteTable('estimate_items', {
  id: text('id').primaryKey(),
  estimate_id: text('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: real('quantity').default(1),
  unit_price: real('unit_price').default(0),
  total: real('total').default(0),
  is_optional: integer('is_optional').default(0),
  sort_order: integer('sort_order').default(0),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// ESTIMATE ATTACHMENTS
// =====================================================

export const estimateAttachments = sqliteTable('estimate_attachments', {
  id: text('id').primaryKey(),
  estimate_id: text('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  filename: text('filename'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// CHANGE ORDERS
// =====================================================

export const changeOrders = sqliteTable('change_orders', {
  id: text('id').primaryKey(),
  job_id: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  amount: real('amount').default(0),
  status: text('status', { enum: ['draft', 'proposed', 'approved', 'rejected', 'invoiced', 'paid'] }).default('draft'),
  approved_at: text('approved_at'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// TOOL CATEGORIES
// =====================================================

export const toolCategories = sqliteTable('tool_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  color: text('color'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// TOOLS
// =====================================================

export const tools = sqliteTable('tools', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  category_id: text('category_id').references(() => toolCategories.id, { onDelete: 'set null' }),
  brand: text('brand'),
  model: text('model'),
  serial_number: text('serial_number'),
  qr_code: text('qr_code').unique(),
  asset_tag: text('asset_tag'),
  purchase_date: text('purchase_date'),
  purchase_price: real('purchase_price'),
  current_value: real('current_value'),
  warranty_expires: text('warranty_expires'),
  status: text('status', { enum: ['available', 'checked_out', 'maintenance', 'retired', 'lost'] }).default('available'),
  condition: text('condition', { enum: ['excellent', 'good', 'fair', 'poor', 'needs_repair'] }).default('good'),
  home_location: text('home_location'),
  current_location: text('current_location'),
  assigned_to_user: text('assigned_to_user'),
  assigned_to_job: text('assigned_to_job').references(() => jobs.id, { onDelete: 'set null' }),
  assigned_at: text('assigned_at'),
  image_url: text('image_url'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_tools_user_id').on(table.user_id),
  index('idx_tools_qr_code').on(table.qr_code),
  index('idx_tools_status').on(table.status),
]);

// =====================================================
// TOOL CHECKOUTS
// =====================================================

export const toolCheckouts = sqliteTable('tool_checkouts', {
  id: text('id').primaryKey(),
  tool_id: text('tool_id').notNull().references(() => tools.id, { onDelete: 'cascade' }),
  user_id: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  checked_out_at: text('checked_out_at').notNull().default(sql`(datetime('now'))`),
  checked_out_to: text('checked_out_to'),
  checked_out_to_job_id: text('checked_out_to_job_id').references(() => jobs.id, { onDelete: 'set null' }),
  checkout_notes: text('checkout_notes'),
  checkout_condition: text('checkout_condition'),
  checkout_location: text('checkout_location'),
  expected_return_date: text('expected_return_date'),
  reminder_date: text('reminder_date'),
  checked_in_at: text('checked_in_at'),
  checkin_notes: text('checkin_notes'),
  checkin_condition: text('checkin_condition'),
  checkin_location: text('checkin_location'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_tool_checkouts_tool_id').on(table.tool_id),
]);

// =====================================================
// TOOL MAINTENANCE
// =====================================================

export const toolMaintenance = sqliteTable('tool_maintenance', {
  id: text('id').primaryKey(),
  tool_id: text('tool_id').notNull().references(() => tools.id, { onDelete: 'cascade' }),
  user_id: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  maintenance_type: text('maintenance_type', { enum: ['inspection', 'repair', 'calibration', 'cleaning', 'replacement', 'other'] }).notNull(),
  description: text('description').notNull(),
  performed_by: text('performed_by'),
  performed_at: text('performed_at').notNull().default(sql`(date('now'))`),
  cost: real('cost'),
  vendor: text('vendor'),
  status: text('status', { enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] }).default('completed'),
  next_maintenance_date: text('next_maintenance_date'),
  receipt_url: text('receipt_url'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// CREW MEMBERS
// =====================================================

export const crewMembers = sqliteTable('crew_members', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  role: text('role'),
  type: text('type', { enum: ['employee', 'subcontractor', 'crew'] }).default('employee'),
  hourly_rate: real('hourly_rate'),
  specialty: text('specialty'),
  license_number: text('license_number'),
  insurance_expiry: text('insurance_expiry'),
  is_active: integer('is_active').default(1),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// =====================================================
// CONTACTS
// =====================================================

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  first_name: text('first_name').notNull(),
  last_name: text('last_name'),
  company: text('company'),
  email: text('email'),
  phone: text('phone'),
  mobile: text('mobile'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  type: text('type', { enum: ['lead', 'prospect', 'customer', 'vendor', 'partner', 'other'] }).default('lead'),
  source: text('source'),
  tags: text('tags'),
  notes: text('notes'),
  last_contacted: text('last_contacted'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});
