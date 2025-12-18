import { NextRequest, NextResponse } from 'next/server';
import { getTurso, generateId } from '@/lib/turso';

// GET - Get materials for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT * FROM job_materials
        WHERE job_id = ?
        ORDER BY created_at DESC
      `,
      args: [jobId],
    });

    const materials = result.rows.map((row: any) => ({
      ...row,
      quantity: Number(row.quantity),
      unit_cost: row.unit_cost !== null ? Number(row.unit_cost) : null,
    }));

    return NextResponse.json({
      success: true,
      data: materials,
    });
  } catch (error: any) {
    console.error('Error fetching materials:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a material for a job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const { name, quantity, unit, unit_cost, vendor, notes } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      );
    }

    const client = getTurso();
    const id = generateId();

    await client.execute({
      sql: `
        INSERT INTO job_materials (id, job_id, name, quantity, unit, unit_cost, vendor, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        jobId,
        name,
        quantity || 1,
        unit || null,
        unit_cost || null,
        vendor || null,
        notes || null,
      ],
    });

    return NextResponse.json({
      success: true,
      data: { id, job_id: jobId, name, quantity: quantity || 1 },
    });
  } catch (error: any) {
    console.error('Error creating material:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a material
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
      sql: 'DELETE FROM job_materials WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: 'Material deleted',
    });
  } catch (error: any) {
    console.error('Error deleting material:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
