import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

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

    // Create demo user if needed
    const demoUserId = 'demo-user-' + randomUUID().slice(0, 8);
    await client.execute({
      sql: `INSERT OR IGNORE INTO users (id, email, full_name) VALUES (?, ?, ?)`,
      args: [demoUserId, 'demo@sitesense.app', 'Demo User']
    });

    // Get actual user ID (might be existing)
    const userResult = await client.execute(`SELECT id FROM users LIMIT 1`);
    const userId = userResult.rows[0]?.id as string || demoUserId;

    // Seed Clients
    const clientIds: string[] = [];
    const clients = [
      { name: 'ABC Corporation', email: 'projects@abccorp.com', phone: '(555) 123-4567', address: '123 Corporate Way', city: 'Denver', state: 'CO', zip: '80202' },
      { name: 'Smith Properties', email: 'maintenance@smithprops.com', phone: '(555) 234-5678', address: '456 Property Lane', city: 'Boulder', state: 'CO', zip: '80301' },
      { name: 'Metro Development', email: 'construction@metrodev.com', phone: '(555) 345-6789', address: '789 Builder Blvd', city: 'Aurora', state: 'CO', zip: '80012' },
      { name: 'Summit Retail', email: 'facilities@summitretail.com', phone: '(555) 456-7890', address: '321 Commerce St', city: 'Lakewood', state: 'CO', zip: '80226' },
    ];

    for (const c of clients) {
      const id = randomUUID();
      clientIds.push(id);
      await client.execute({
        sql: `INSERT OR IGNORE INTO clients (id, user_id, name, email, phone, address, city, state, zip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, userId, c.name, c.email, c.phone, c.address, c.city, c.state, c.zip]
      });
    }

    // Seed Jobs
    const jobIds: string[] = [];
    const jobs = [
      { client_id: clientIds[0], name: 'Office Building Renovation', status: 'active', property_address: '500 Business Park Dr', city: 'Denver', state: 'CO' },
      { client_id: clientIds[1], name: 'Apartment Complex Roof Replacement', status: 'active', property_address: '1200 Residential Way', city: 'Boulder', state: 'CO' },
      { client_id: clientIds[2], name: 'New Construction - Retail Center', status: 'planned', property_address: '800 Commerce Blvd', city: 'Aurora', state: 'CO' },
      { client_id: clientIds[3], name: 'Store Renovation', status: 'completed', property_address: '321 Commerce St', city: 'Lakewood', state: 'CO' },
      { client_id: clientIds[0], name: 'Parking Lot Resurfacing', status: 'planned', property_address: '500 Business Park Dr', city: 'Denver', state: 'CO' },
    ];

    for (const j of jobs) {
      const id = randomUUID();
      jobIds.push(id);
      await client.execute({
        sql: `INSERT OR IGNORE INTO jobs (id, user_id, name, client_id, status, property_address, city, state, industry_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, userId, j.name, j.client_id, j.status, j.property_address, j.city, j.state, 'ind_general']
      });
    }

    // Seed Job Phases
    const phases = [
      { job_id: jobIds[0], name: 'Demo & Prep', status: 'completed', sort_order: 1 },
      { job_id: jobIds[0], name: 'Rough-In', status: 'in_progress', sort_order: 2 },
      { job_id: jobIds[0], name: 'Finishes', status: 'pending', sort_order: 3 },
      { job_id: jobIds[1], name: 'Tear-Off', status: 'completed', sort_order: 1 },
      { job_id: jobIds[1], name: 'Install', status: 'in_progress', sort_order: 2 },
    ];

    for (const p of phases) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO job_phases (id, job_id, name, status, sort_order) VALUES (?, ?, ?, ?, ?)`,
        args: [randomUUID(), p.job_id, p.name, p.status, p.sort_order]
      });
    }

    // Seed Time Entries
    const today = new Date();
    const timeEntries = [
      { job_id: jobIds[0], hours: 8, hourly_rate: 45, entry_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], notes: 'Supervised electrical rough-in' },
      { job_id: jobIds[0], hours: 8, hourly_rate: 38, entry_date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], notes: 'Electrical rough-in - 2nd floor' },
      { job_id: jobIds[1], hours: 10, hourly_rate: 35, entry_date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], notes: 'Roof tear-off - Building A' },
      { job_id: jobIds[0], hours: 8, hourly_rate: 22, entry_date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], notes: 'Site cleanup and material staging' },
      { job_id: jobIds[1], hours: 6, hourly_rate: 45, entry_date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], notes: 'Roof inspection and planning' },
    ];

    for (const t of timeEntries) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO time_entries (id, user_id, job_id, hours, hourly_rate, entry_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), userId, t.job_id, t.hours, t.hourly_rate, t.entry_date, t.notes]
      });
    }

    // Seed Expenses
    const expenses = [
      { job_id: jobIds[0], description: 'Electrical wire and conduit', amount: 2450.00, date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], vendor: 'Electrical Supply Co' },
      { job_id: jobIds[0], description: 'Scissor lift rental - 1 week', amount: 850.00, date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], vendor: 'United Rentals' },
      { job_id: jobIds[1], description: 'Roofing shingles - 50 squares', amount: 8500.00, date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], vendor: 'ABC Supply' },
      { job_id: jobIds[1], description: 'Underlayment and flashing', amount: 1200.00, date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], vendor: 'ABC Supply' },
      { job_id: jobIds[0], description: 'Electrical permit', amount: 450.00, date: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], vendor: 'City of Denver' },
    ];

    for (const e of expenses) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO expenses (id, user_id, job_id, description, amount, date, vendor, is_business) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), userId, e.job_id, e.description, e.amount, e.date, e.vendor, 1]
      });
    }

    // Seed Estimates
    const estimates = [
      { job_id: jobIds[2], client_name: 'Metro Development', client_email: 'construction@metrodev.com', status: 'sent', subtotal: 2500000, tax_rate: 0, total: 2500000 },
      { job_id: jobIds[4], client_name: 'ABC Corporation', client_email: 'projects@abccorp.com', status: 'draft', subtotal: 45000, tax_rate: 0, total: 45000 },
    ];

    for (const est of estimates) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO estimates (id, user_id, job_id, client_name, client_email, status, subtotal, tax_rate, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), userId, est.job_id, est.client_name, est.client_email, est.status, est.subtotal, est.tax_rate, est.total]
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Demo data seeded successfully',
      data: {
        clients: clients.length,
        jobs: jobs.length,
        phases: phases.length,
        time_entries: timeEntries.length,
        expenses: expenses.length,
        estimates: estimates.length,
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
    warning: 'This will add sample clients, jobs, phases, time entries, expenses, and estimates',
  });
}
