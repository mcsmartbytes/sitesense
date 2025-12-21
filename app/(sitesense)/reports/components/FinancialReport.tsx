'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StatCard from './StatCard';
import BarChartWrapper from './BarChartWrapper';
import PieChartWrapper from './PieChartWrapper';
import LineChartWrapper from './LineChartWrapper';
import { DateRange, FinancialReportData, CATEGORY_COLORS } from '../types';

type FinancialReportProps = {
  dateRange: DateRange;
};

export default function FinancialReport({ dateRange }: FinancialReportProps) {
  const { user } = useAuth();
  const [data, setData] = useState<FinancialReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, dateRange]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        user_id: user!.id,
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      const res = await fetch(`/api/reports/financial?${params}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load financial data');
      }
    } catch (err) {
      console.error('Error loading financial report:', err);
      setError('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function exportCSV() {
    if (!data) return;

    const headers = ['Category', 'Amount', 'Count'];
    const rows = data.expenses_by_category.map((c) => [
      c.category_name,
      c.amount.toString(),
      c.count.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading financial data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        No financial data available.
      </div>
    );
  }

  const pieData = data.expenses_by_category.map((cat, index) => ({
    name: cat.category_name,
    value: cat.amount,
    color: cat.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));

  const variance = data.summary.total_budgeted - data.summary.total_expenses;

  return (
    <div>
      {/* Export button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
        >
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Expenses"
          value={formatCurrency(data.summary.total_expenses)}
          color="default"
        />
        <StatCard
          label="Total Budgeted"
          value={formatCurrency(data.summary.total_budgeted)}
          color="blue"
        />
        <StatCard
          label="Budget Variance"
          value={formatCurrency(Math.abs(variance))}
          color={variance >= 0 ? 'green' : 'red'}
          subtext={variance >= 0 ? 'Under budget' : 'Over budget'}
        />
        <StatCard
          label="Mileage Value"
          value={formatCurrency(data.summary.total_mileage_value)}
          color="default"
          subtext="@ $0.67/mile"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Expenses by Category Pie Chart */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
          {pieData.length > 0 ? (
            <PieChartWrapper
              data={pieData}
              height={280}
              formatValue={formatCurrency}
              innerRadius={50}
              outerRadius={90}
            />
          ) : (
            <p className="text-center py-12 text-gray-500">No expense data</p>
          )}
        </div>

        {/* Monthly Trend Line Chart */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Spending Trend</h3>
          {data.expenses_by_month.length > 0 ? (
            <LineChartWrapper
              data={data.expenses_by_month}
              xKey="month"
              lines={[{ dataKey: 'amount', name: 'Expenses' }]}
              height={280}
              formatValue={formatCurrency}
            />
          ) : (
            <p className="text-center py-12 text-gray-500">No monthly data</p>
          )}
        </div>
      </div>

      {/* Budget vs Actual */}
      {data.budget_vs_actual.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Actual</h3>
          <BarChartWrapper
            data={data.budget_vs_actual}
            xKey="category_name"
            bars={[
              { dataKey: 'budget', name: 'Budget', color: '#3b82f6' },
              { dataKey: 'actual', name: 'Actual', color: '#10b981' },
            ]}
            height={300}
            formatValue={formatCurrency}
          />
        </div>
      )}

      {/* Top Vendors Table */}
      {data.top_vendors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendors</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Vendor</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Amount</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {data.top_vendors.map((vendor, idx) => (
                  <tr key={vendor.vendor} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-2 font-medium text-gray-900">{vendor.vendor}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(vendor.amount)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{vendor.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
