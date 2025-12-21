import { NextRequest, NextResponse } from 'next/server';
import { getTurso } from '@/lib/turso';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = getTurso();

    // Get total expenses summary
    const summaryResult = await client.execute({
      sql: `
        SELECT
          COALESCE(SUM(amount), 0) as total_expenses,
          COUNT(*) as expense_count
        FROM expenses
        WHERE user_id = ?
        ${startDate ? 'AND date >= ?' : ''}
        ${endDate ? 'AND date <= ?' : ''}
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get total budgeted
    const budgetResult = await client.execute({
      sql: 'SELECT COALESCE(SUM(amount), 0) as total_budgeted FROM budgets WHERE user_id = ?',
      args: [userId],
    });

    // Get mileage value (if exists)
    const mileageResult = await client.execute({
      sql: `
        SELECT COALESCE(SUM(distance * 0.67), 0) as total_mileage_value
        FROM mileage
        WHERE user_id = ?
        ${startDate ? 'AND date >= ?' : ''}
        ${endDate ? 'AND date <= ?' : ''}
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get labor cost from time entries
    const laborResult = await client.execute({
      sql: `
        SELECT COALESCE(SUM(hours * hourly_rate), 0) as total_labor_cost
        FROM time_entries
        WHERE user_id = ?
        ${startDate ? 'AND date >= ?' : ''}
        ${endDate ? 'AND date <= ?' : ''}
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get expenses by category
    const categoryResult = await client.execute({
      sql: `
        SELECT
          COALESCE(c.id, 'uncategorized') as category_id,
          COALESCE(c.name, 'Uncategorized') as category_name,
          c.color,
          COALESCE(SUM(e.amount), 0) as amount,
          COUNT(e.id) as count
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE e.user_id = ?
        ${startDate ? 'AND e.date >= ?' : ''}
        ${endDate ? 'AND e.date <= ?' : ''}
        GROUP BY COALESCE(c.id, 'uncategorized'), COALESCE(c.name, 'Uncategorized'), c.color
        ORDER BY amount DESC
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get expenses by month
    const monthlyResult = await client.execute({
      sql: `
        SELECT
          strftime('%Y-%m', date) as month,
          COALESCE(SUM(amount), 0) as amount
        FROM expenses
        WHERE user_id = ?
        ${startDate ? 'AND date >= ?' : ''}
        ${endDate ? 'AND date <= ?' : ''}
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    // Get budget vs actual
    const budgetVsActualResult = await client.execute({
      sql: `
        SELECT
          b.category_id,
          c.name as category_name,
          b.amount as budget,
          COALESCE(
            (SELECT SUM(e.amount)
             FROM expenses e
             WHERE e.category_id = b.category_id
               AND e.user_id = b.user_id
               ${startDate ? 'AND e.date >= ?' : ''}
               ${endDate ? 'AND e.date <= ?' : ''}
            ), 0
          ) as actual
        FROM budgets b
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.user_id = ?
        ORDER BY b.amount DESC
      `,
      args: [...(startDate ? [startDate] : []), ...(endDate ? [endDate] : []), userId],
    });

    // Get top vendors
    const vendorResult = await client.execute({
      sql: `
        SELECT
          COALESCE(vendor, 'Unknown') as vendor,
          SUM(amount) as amount,
          COUNT(*) as count
        FROM expenses
        WHERE user_id = ?
        ${startDate ? 'AND date >= ?' : ''}
        ${endDate ? 'AND date <= ?' : ''}
        GROUP BY COALESCE(vendor, 'Unknown')
        ORDER BY amount DESC
        LIMIT 10
      `,
      args: [userId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])],
    });

    const summary = {
      total_expenses: Number(summaryResult.rows[0]?.total_expenses) || 0,
      total_budgeted: Number(budgetResult.rows[0]?.total_budgeted) || 0,
      total_mileage_value: Number(mileageResult.rows[0]?.total_mileage_value) || 0,
      total_time_labor_cost: Number(laborResult.rows[0]?.total_labor_cost) || 0,
    };

    const expenses_by_category = categoryResult.rows.map((row) => ({
      category_id: String(row.category_id),
      category_name: String(row.category_name),
      color: row.color ? String(row.color) : null,
      amount: Number(row.amount),
      count: Number(row.count),
    }));

    const expenses_by_month = monthlyResult.rows.map((row) => ({
      month: String(row.month),
      amount: Number(row.amount),
    }));

    const budget_vs_actual = budgetVsActualResult.rows.map((row) => {
      const budget = Number(row.budget);
      const actual = Number(row.actual);
      return {
        category_id: String(row.category_id),
        category_name: String(row.category_name),
        budget,
        actual,
        percent_used: budget > 0 ? Math.round((actual / budget) * 100) : 0,
      };
    });

    const top_vendors = vendorResult.rows.map((row) => ({
      vendor: String(row.vendor),
      amount: Number(row.amount),
      count: Number(row.count),
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary,
        expenses_by_category,
        expenses_by_month,
        budget_vs_actual,
        top_vendors,
      },
    });
  } catch (error: any) {
    console.error('Error fetching financial report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
