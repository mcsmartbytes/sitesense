import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.user_id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id required in request body' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Seed Clients
    const clients = [
      { user_id: userId, name: 'ABC Corporation', email: 'projects@abccorp.com', phone: '(555) 123-4567', company: 'ABC Corporation', address: '123 Corporate Way', city: 'Denver', state: 'CO', zip: '80202' },
      { user_id: userId, name: 'Smith Properties', email: 'maintenance@smithprops.com', phone: '(555) 234-5678', company: 'Smith Properties LLC', address: '456 Property Lane', city: 'Boulder', state: 'CO', zip: '80301' },
      { user_id: userId, name: 'Metro Development', email: 'construction@metrodev.com', phone: '(555) 345-6789', company: 'Metro Development Group', address: '789 Builder Blvd', city: 'Aurora', state: 'CO', zip: '80012' },
      { user_id: userId, name: 'Summit Retail', email: 'facilities@summitretail.com', phone: '(555) 456-7890', company: 'Summit Retail Inc', address: '321 Commerce St', city: 'Lakewood', state: 'CO', zip: '80226' },
    ];

    const { data: clientData } = await supabase.from('clients').insert(clients).select();

    // Seed Jobs
    const jobs = clientData ? [
      { user_id: userId, client_id: clientData[0].id, name: 'Office Building Renovation', description: 'Complete renovation of 3-story office building including HVAC, electrical, and interior finishes', status: 'in_progress', job_type: 'commercial', address: '500 Business Park Dr', city: 'Denver', state: 'CO', estimated_value: 450000, actual_cost: 180000 },
      { user_id: userId, client_id: clientData[1].id, name: 'Apartment Complex Roof Replacement', description: 'Full roof replacement on 24-unit apartment complex', status: 'in_progress', job_type: 'residential', address: '1200 Residential Way', city: 'Boulder', state: 'CO', estimated_value: 125000, actual_cost: 45000 },
      { user_id: userId, client_id: clientData[2].id, name: 'New Construction - Retail Center', description: 'Ground-up construction of 15,000 sq ft retail center', status: 'pending', job_type: 'commercial', address: '800 Commerce Blvd', city: 'Aurora', state: 'CO', estimated_value: 2500000, actual_cost: 0 },
      { user_id: userId, client_id: clientData[3].id, name: 'Store Renovation', description: 'Interior renovation and fixture installation', status: 'completed', job_type: 'commercial', address: '321 Commerce St', city: 'Lakewood', state: 'CO', estimated_value: 85000, actual_cost: 82500 },
      { user_id: userId, client_id: clientData[0].id, name: 'Parking Lot Resurfacing', description: 'Complete parking lot resurfacing and striping', status: 'pending', job_type: 'commercial', address: '500 Business Park Dr', city: 'Denver', state: 'CO', estimated_value: 45000, actual_cost: 0 },
    ] : [];

    const { data: jobData } = await supabase.from('jobs').insert(jobs).select();

    // Seed Subcontractors
    const subcontractors = [
      { user_id: userId, name: 'Premier Electric', trade: 'Electrical', email: 'bids@premierelectric.com', phone: '(555) 111-1111', license_number: 'EL-12345', license_expiry: '2025-06-30', insurance_expiry: '2025-03-15', w9_on_file: true, is_preferred: true },
      { user_id: userId, name: 'ABC Plumbing', trade: 'Plumbing', email: 'estimates@abcplumbing.com', phone: '(555) 222-2222', license_number: 'PL-67890', license_expiry: '2025-08-15', insurance_expiry: '2025-04-01', w9_on_file: true, is_preferred: true },
      { user_id: userId, name: 'Mountain HVAC', trade: 'HVAC', email: 'service@mountainhvac.com', phone: '(555) 333-3333', license_number: 'HV-11111', license_expiry: '2025-12-31', insurance_expiry: '2025-06-30', w9_on_file: true, is_preferred: false },
      { user_id: userId, name: 'Rocky Mountain Drywall', trade: 'Drywall', email: 'jobs@rockydrywall.com', phone: '(555) 444-4444', license_number: null, license_expiry: null, insurance_expiry: '2025-05-15', w9_on_file: true, is_preferred: true },
      { user_id: userId, name: 'Peak Roofing', trade: 'Roofing', email: 'quotes@peakroofing.com', phone: '(555) 555-5555', license_number: 'RF-22222', license_expiry: '2025-09-30', insurance_expiry: '2025-07-01', w9_on_file: false, is_preferred: false },
      { user_id: userId, name: 'Denver Flooring Co', trade: 'Flooring', email: 'sales@denverflooring.com', phone: '(555) 666-6666', license_number: null, license_expiry: null, insurance_expiry: '2025-04-30', w9_on_file: true, is_preferred: true },
    ];

    await supabase.from('subcontractors').insert(subcontractors);

    // Seed Contacts (CRM)
    const contacts = [
      { user_id: userId, first_name: 'John', last_name: 'Anderson', email: 'janderson@abccorp.com', phone: '(555) 101-1010', company: 'ABC Corporation', job_title: 'Facilities Manager', contact_type: 'customer' },
      { user_id: userId, first_name: 'Sarah', last_name: 'Mitchell', email: 'smitchell@smithprops.com', phone: '(555) 202-2020', company: 'Smith Properties', job_title: 'Property Manager', contact_type: 'customer' },
      { user_id: userId, first_name: 'Mike', last_name: 'Roberts', email: 'mroberts@metrodev.com', phone: '(555) 303-3030', company: 'Metro Development', job_title: 'Project Director', contact_type: 'lead' },
      { user_id: userId, first_name: 'Lisa', last_name: 'Chen', email: 'lchen@premierelectric.com', phone: '(555) 404-4040', company: 'Premier Electric', job_title: 'Sales Rep', contact_type: 'vendor' },
      { user_id: userId, first_name: 'David', last_name: 'Thompson', email: 'dthompson@supplier.com', phone: '(555) 505-5050', company: 'Building Supplies Inc', job_title: 'Account Manager', contact_type: 'vendor' },
    ];

    await supabase.from('contacts').insert(contacts);

    // Seed Tools
    const tools = [
      { user_id: userId, name: 'DeWalt 20V Drill', category: 'Power Tools', serial_number: 'DW-2024-001', purchase_date: '2024-01-15', purchase_price: 199.99, condition: 'good', status: 'available', location: 'Main Warehouse' },
      { user_id: userId, name: 'Milwaukee Circular Saw', category: 'Power Tools', serial_number: 'MW-2024-002', purchase_date: '2024-02-20', purchase_price: 249.99, condition: 'excellent', status: 'checked_out', location: 'Job Site - ABC Corp' },
      { user_id: userId, name: 'Werner 24ft Extension Ladder', category: 'Ladders', serial_number: 'WN-2023-015', purchase_date: '2023-06-10', purchase_price: 289.00, condition: 'good', status: 'available', location: 'Main Warehouse' },
      { user_id: userId, name: 'Bosch Laser Level', category: 'Measuring', serial_number: 'BS-2024-003', purchase_date: '2024-03-01', purchase_price: 179.99, condition: 'excellent', status: 'available', location: 'Main Warehouse' },
      { user_id: userId, name: 'Honda Generator 3000W', category: 'Equipment', serial_number: 'HD-2023-008', purchase_date: '2023-08-15', purchase_price: 1299.00, condition: 'good', status: 'checked_out', location: 'Job Site - Smith Props' },
      { user_id: userId, name: 'Makita Angle Grinder', category: 'Power Tools', serial_number: 'MK-2024-004', purchase_date: '2024-01-30', purchase_price: 149.99, condition: 'fair', status: 'maintenance', location: 'Repair Shop' },
    ];

    await supabase.from('tools').insert(tools);

    // Seed Crew Members
    const crewMembers = [
      { user_id: userId, name: 'Carlos Rodriguez', email: 'carlos@company.com', phone: '(555) 601-1111', role: 'Foreman', hourly_rate: 45.00, status: 'active' },
      { user_id: userId, name: 'James Wilson', email: 'james@company.com', phone: '(555) 602-2222', role: 'Electrician', hourly_rate: 38.00, status: 'active' },
      { user_id: userId, name: 'Maria Santos', email: 'maria@company.com', phone: '(555) 603-3333', role: 'Project Coordinator', hourly_rate: 32.00, status: 'active' },
      { user_id: userId, name: 'Robert Johnson', email: 'robert@company.com', phone: '(555) 604-4444', role: 'Carpenter', hourly_rate: 35.00, status: 'active' },
      { user_id: userId, name: 'Emily Davis', email: 'emily@company.com', phone: '(555) 605-5555', role: 'Laborer', hourly_rate: 22.00, status: 'active' },
    ];

    await supabase.from('crew_members').insert(crewMembers);

    // Seed Time Entries
    const today = new Date();
    const timeEntries = jobData ? [
      { user_id: userId, job_id: jobData[0].id, crew_member_name: 'Carlos Rodriguez', date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 8, hourly_rate: 45.00, description: 'Supervised electrical rough-in' },
      { user_id: userId, job_id: jobData[0].id, crew_member_name: 'James Wilson', date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 8, hourly_rate: 38.00, description: 'Electrical rough-in - 2nd floor' },
      { user_id: userId, job_id: jobData[1].id, crew_member_name: 'Robert Johnson', date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 10, hourly_rate: 35.00, description: 'Roof tear-off - Building A' },
      { user_id: userId, job_id: jobData[0].id, crew_member_name: 'Emily Davis', date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 8, hourly_rate: 22.00, description: 'Site cleanup and material staging' },
      { user_id: userId, job_id: jobData[1].id, crew_member_name: 'Carlos Rodriguez', date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], hours: 6, hourly_rate: 45.00, description: 'Roof inspection and planning' },
    ] : [];

    if (timeEntries.length > 0) {
      await supabase.from('time_entries').insert(timeEntries);
    }

    // Seed Expenses
    const jobExpenses = jobData ? [
      { user_id: userId, job_id: jobData[0].id, category: 'Materials', description: 'Electrical wire and conduit', amount: 2450.00, date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], vendor: 'Electrical Supply Co' },
      { user_id: userId, job_id: jobData[0].id, category: 'Equipment Rental', description: 'Scissor lift rental - 1 week', amount: 850.00, date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], vendor: 'United Rentals' },
      { user_id: userId, job_id: jobData[1].id, category: 'Materials', description: 'Roofing shingles - 50 squares', amount: 8500.00, date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], vendor: 'ABC Supply' },
      { user_id: userId, job_id: jobData[1].id, category: 'Materials', description: 'Underlayment and flashing', amount: 1200.00, date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], vendor: 'ABC Supply' },
      { user_id: userId, job_id: jobData[0].id, category: 'Permits', description: 'Electrical permit', amount: 450.00, date: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], vendor: 'City of Denver' },
    ] : [];

    if (jobExpenses.length > 0) {
      await supabase.from('expenses').insert(jobExpenses);
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
        time_entries: timeEntries.length,
        expenses: jobExpenses.length,
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
    message: 'POST to this endpoint with { "user_id": "your-user-id" } to seed demo data',
    warning: 'This will add sample clients, jobs, subcontractors, tools, crew members, and more',
  });
}
