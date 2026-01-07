import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function POST() {
  try {
    const url = process.env.TURSO_DATABASE_URL?.trim();
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim().replace(/\s+/g, '');

    if (!url || !authToken) {
      return NextResponse.json(
        { success: false, error: 'Database credentials not configured' },
        { status: 500 }
      );
    }

    const client = createClient({ url, authToken });

    // Seed Clients
    const clients = [
      { name: 'ABC Corporation', email: 'projects@abccorp.com', phone: '(555) 123-4567', company: 'ABC Corporation', address: '123 Corporate Way', city: 'Denver', state: 'CO' },
      { name: 'Smith Properties', email: 'maintenance@smithprops.com', phone: '(555) 234-5678', company: 'Smith Properties LLC', address: '456 Property Lane', city: 'Boulder', state: 'CO' },
      { name: 'Metro Development', email: 'construction@metrodev.com', phone: '(555) 345-6789', company: 'Metro Development Group', address: '789 Builder Blvd', city: 'Aurora', state: 'CO' },
      { name: 'Summit Retail', email: 'facilities@summitretail.com', phone: '(555) 456-7890', company: 'Summit Retail Inc', address: '321 Commerce St', city: 'Lakewood', state: 'CO' },
    ];

    for (const c of clients) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO clients (name, email, phone, company, address, city, state) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [c.name, c.email, c.phone, c.company, c.address, c.city, c.state]
      });
    }

    // Get client IDs
    const clientResults = await client.execute(`SELECT id, name FROM clients ORDER BY id`);
    const clientIds = clientResults.rows.map(r => r.id);

    // Seed Jobs
    const jobs = [
      { client_id: clientIds[0], name: 'Office Building Renovation', description: 'Complete renovation of 3-story office building', status: 'in_progress', job_type: 'commercial', address: '500 Business Park Dr', city: 'Denver', state: 'CO', estimated_value: 450000 },
      { client_id: clientIds[1], name: 'Apartment Complex Roof Replacement', description: 'Full roof replacement on 24-unit apartment complex', status: 'in_progress', job_type: 'residential', address: '1200 Residential Way', city: 'Boulder', state: 'CO', estimated_value: 125000 },
      { client_id: clientIds[2], name: 'New Construction - Retail Center', description: 'Ground-up construction of 15,000 sq ft retail center', status: 'pending', job_type: 'commercial', address: '800 Commerce Blvd', city: 'Aurora', state: 'CO', estimated_value: 2500000 },
      { client_id: clientIds[3], name: 'Store Renovation', description: 'Interior renovation and fixture installation', status: 'completed', job_type: 'commercial', address: '321 Commerce St', city: 'Lakewood', state: 'CO', estimated_value: 85000 },
      { client_id: clientIds[0], name: 'Parking Lot Resurfacing', description: 'Complete parking lot resurfacing and striping', status: 'pending', job_type: 'commercial', address: '500 Business Park Dr', city: 'Denver', state: 'CO', estimated_value: 45000 },
    ];

    for (const j of jobs) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO jobs (client_id, name, description, status, job_type, address, city, state, estimated_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [j.client_id, j.name, j.description, j.status, j.job_type, j.address, j.city, j.state, j.estimated_value]
      });
    }

    // Seed Subcontractors
    const subcontractors = [
      { name: 'Premier Electric', trade: 'Electrical', email: 'bids@premierelectric.com', phone: '(555) 111-1111', license_number: 'EL-12345', is_preferred: 1 },
      { name: 'ABC Plumbing', trade: 'Plumbing', email: 'estimates@abcplumbing.com', phone: '(555) 222-2222', license_number: 'PL-67890', is_preferred: 1 },
      { name: 'Mountain HVAC', trade: 'HVAC', email: 'service@mountainhvac.com', phone: '(555) 333-3333', license_number: 'HV-11111', is_preferred: 0 },
      { name: 'Rocky Mountain Drywall', trade: 'Drywall', email: 'jobs@rockydrywall.com', phone: '(555) 444-4444', license_number: null, is_preferred: 1 },
      { name: 'Peak Roofing', trade: 'Roofing', email: 'quotes@peakroofing.com', phone: '(555) 555-5555', license_number: 'RF-22222', is_preferred: 0 },
      { name: 'Denver Flooring Co', trade: 'Flooring', email: 'sales@denverflooring.com', phone: '(555) 666-6666', license_number: null, is_preferred: 1 },
    ];

    for (const s of subcontractors) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO subcontractors (name, trade, email, phone, license_number, is_preferred) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [s.name, s.trade, s.email, s.phone, s.license_number, s.is_preferred]
      });
    }

    // Seed Contacts
    const contacts = [
      { first_name: 'John', last_name: 'Anderson', email: 'janderson@abccorp.com', phone: '(555) 101-1010', company: 'ABC Corporation', job_title: 'Facilities Manager', contact_type: 'customer' },
      { first_name: 'Sarah', last_name: 'Mitchell', email: 'smitchell@smithprops.com', phone: '(555) 202-2020', company: 'Smith Properties', job_title: 'Property Manager', contact_type: 'customer' },
      { first_name: 'Mike', last_name: 'Roberts', email: 'mroberts@metrodev.com', phone: '(555) 303-3030', company: 'Metro Development', job_title: 'Project Director', contact_type: 'lead' },
      { first_name: 'Lisa', last_name: 'Chen', email: 'lchen@premierelectric.com', phone: '(555) 404-4040', company: 'Premier Electric', job_title: 'Sales Rep', contact_type: 'vendor' },
      { first_name: 'David', last_name: 'Thompson', email: 'dthompson@supplier.com', phone: '(555) 505-5050', company: 'Building Supplies Inc', job_title: 'Account Manager', contact_type: 'vendor' },
    ];

    for (const c of contacts) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO contacts (first_name, last_name, email, phone, company, job_title, contact_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [c.first_name, c.last_name, c.email, c.phone, c.company, c.job_title, c.contact_type]
      });
    }

    // Seed Tools
    const tools = [
      { name: 'DeWalt 20V Drill', category: 'Power Tools', serial_number: 'DW-2024-001', condition: 'good', status: 'available', location: 'Main Warehouse' },
      { name: 'Milwaukee Circular Saw', category: 'Power Tools', serial_number: 'MW-2024-002', condition: 'excellent', status: 'checked_out', location: 'Job Site - ABC Corp' },
      { name: 'Werner 24ft Extension Ladder', category: 'Ladders', serial_number: 'WN-2023-015', condition: 'good', status: 'available', location: 'Main Warehouse' },
      { name: 'Bosch Laser Level', category: 'Measuring', serial_number: 'BS-2024-003', condition: 'excellent', status: 'available', location: 'Main Warehouse' },
      { name: 'Honda Generator 3000W', category: 'Equipment', serial_number: 'HD-2023-008', condition: 'good', status: 'checked_out', location: 'Job Site - Smith Props' },
      { name: 'Makita Angle Grinder', category: 'Power Tools', serial_number: 'MK-2024-004', condition: 'fair', status: 'maintenance', location: 'Repair Shop' },
    ];

    for (const t of tools) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO tools (name, category, serial_number, condition, status, location) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [t.name, t.category, t.serial_number, t.condition, t.status, t.location]
      });
    }

    // Seed Crew Members
    const crewMembers = [
      { name: 'Carlos Rodriguez', email: 'carlos@company.com', phone: '(555) 601-1111', role: 'Foreman', hourly_rate: 45.00, status: 'active' },
      { name: 'James Wilson', email: 'james@company.com', phone: '(555) 602-2222', role: 'Electrician', hourly_rate: 38.00, status: 'active' },
      { name: 'Maria Santos', email: 'maria@company.com', phone: '(555) 603-3333', role: 'Project Coordinator', hourly_rate: 32.00, status: 'active' },
      { name: 'Robert Johnson', email: 'robert@company.com', phone: '(555) 604-4444', role: 'Carpenter', hourly_rate: 35.00, status: 'active' },
      { name: 'Emily Davis', email: 'emily@company.com', phone: '(555) 605-5555', role: 'Laborer', hourly_rate: 22.00, status: 'active' },
    ];

    for (const cm of crewMembers) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO crew_members (name, email, phone, role, hourly_rate, status) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [cm.name, cm.email, cm.phone, cm.role, cm.hourly_rate, cm.status]
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Demo data seeded successfully',
      data: {
        clients: clients.length,
        jobs: jobs.length,
        subcontractors: subcontractors.length,
        contacts: contacts.length,
        tools: tools.length,
        crew_members: crewMembers.length,
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to seed demo data',
    warning: 'This will add sample clients, jobs, subcontractors, tools, crew members, and more',
  });
}
