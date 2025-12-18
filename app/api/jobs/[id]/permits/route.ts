import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get permits for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT * FROM permits
        WHERE job_id = ?
        ORDER BY created_at DESC
      `,
      args: [jobId],
    });

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching permits:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a permit for a job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const { permit_number, authority, status, inspection_date, notes } = body;

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO permits (id, job_id, permit_number, authority, status, inspection_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        jobId,
        permit_number || null,
        authority || null,
        status || 'draft',
        inspection_date || null,
        notes || null,
      ],
    });

    return NextResponse.json({
      success: true,
      data: { id, job_id: jobId, permit_number, authority, status: status || 'draft' },
    });
  } catch (error: any) {
    console.error('Error creating permit:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a permit
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    await client.execute({
      sql: 'DELETE FROM permits WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Permit deleted',
    });
  } catch (error: any) {
    console.error('Error deleting permit:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
