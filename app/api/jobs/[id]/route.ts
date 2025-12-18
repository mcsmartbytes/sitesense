import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

// GET - Get a single job by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = getTurso();

    const result = await client.execute({
      sql: `
        SELECT j.*, i.name as industry_name
        FROM jobs j
        LEFT JOIN industries i ON j.industry_id = i.id
        WHERE j.id = ?
      `,
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
