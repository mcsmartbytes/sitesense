import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'user_id required' }, { status: 400 });
    }

    const db = getTurso();

    const result = await db.execute({
      sql: `
        SELECT
          s.*,
          j.name as job_name
        FROM schedule_items s
        LEFT JOIN jobs j ON s.job_id = j.id
        WHERE s.user_id = ?
        ORDER BY s.scheduled_date ASC, s.priority DESC
      `,
      args: [userId],
    });

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('GET /api/scheduler error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      title,
      description,
      item_type,
      job_id,
      scheduled_date,
      due_date,
      priority,
      assigned_to,
      notes,
    } = body;

    if (!user_id || !title || !scheduled_date) {
      return NextResponse.json(
        { success: false, error: 'user_id, title, and scheduled_date required' },
        { status: 400 }
      );
    }

    const db = getTurso();
    const id = crypto.randomUUID();

    await db.execute({
      sql: `
        INSERT INTO schedule_items (
          id, user_id, title, description, item_type, job_id,
          scheduled_date, due_date, status, priority, assigned_to, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, datetime('now'))
      `,
      args: [
        id,
        user_id,
        title,
        description || null,
        item_type || 'reminder',
        job_id || null,
        scheduled_date,
        due_date || null,
        priority || 'medium',
        assigned_to || null,
        notes || null,
      ],
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error('POST /api/scheduler error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    }

    const db = getTurso();

    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.item_type !== undefined) {
      fields.push('item_type = ?');
      values.push(updates.item_type);
    }
    if (updates.job_id !== undefined) {
      fields.push('job_id = ?');
      values.push(updates.job_id);
    }
    if (updates.scheduled_date !== undefined) {
      fields.push('scheduled_date = ?');
      values.push(updates.scheduled_date);
    }
    if (updates.due_date !== undefined) {
      fields.push('due_date = ?');
      values.push(updates.due_date);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.assigned_to !== undefined) {
      fields.push('assigned_to = ?');
      values.push(updates.assigned_to);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    await db.execute({
      sql: `UPDATE schedule_items SET ${fields.join(', ')} WHERE id = ?`,
      args: values,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /api/scheduler error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    }

    const db = getTurso();
    await db.execute({
      sql: 'DELETE FROM schedule_items WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/scheduler error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
