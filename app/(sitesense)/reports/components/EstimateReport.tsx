'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StatCard from './StatCard';
import BarChartWrapper from './BarChartWrapper';
import { DateRange, EstimateReportData, CHART_COLORS } from '../types';

type EstimateReportProps = {
  dateRange: DateRange;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-800' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-800' },
  viewed: { bg: 'bg-purple-100', text: 'text-purple-800' },
  accepted: { bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800' },
  declined: { bg: 'bg-red-100', text: 'text-red-800' },
  expired: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
};

export default function EstimateReport({ dateRange }: EstimateReportProps) {
  const { user } = useAuth();
  const [data, setData] = useState<EstimateReportData | null>(null);
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

      const res = await fetch(`/api/reports/estimates?${params}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load estimate data');
      }
    } catch (err) {
      console.error('Error loading estimate report:', err);
      setError('Failed to load estimate data');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function exportCSV() {
    if (!data) return;

    const headers = ['Job', 'Total', 'Status', 'Created'];
    const rows = data.recent_estimates.map((e) => [
      e.job_name,
      e.total.toString(),
      e.status,
      new Date(e.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `estimate-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading estimate data...</p>
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
        No estimate data available.
      </div>
    );
  }

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
          label="Total Estimates"
          value={data.summary.total_estimates}
          color="default"
        />
        <StatCard
          label="Total Value"
          value={formatCurrency(data.summary.total_value)}
          color="blue"
        />
        <StatCard
          label="Average Value"
          value={formatCurrency(data.summary.avg_value)}
          color="default"
        />
        <StatCard
          label="Win Rate"
          value={`${data.summary.win_rate}%`}
          color={data.summary.win_rate >= 50 ? 'green' : 'yellow'}
        />
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
        {data.status_breakdown.map((status) => {
          const colors = STATUS_COLORS[status.status] || STATUS_COLORS.draft;
          return (
            <div key={status.status} className={`${colors.bg} rounded-lg p-4 text-center`}>
              <p className={`text-2xl font-bold ${colors.text}`}>{status.count}</p>
              <p className={`text-sm ${colors.text} capitalize`}>{status.status}</p>
              <p className={`text-xs ${colors.text} mt-1`}>{formatCurrency(status.value)}</p>
            </div>
          );
        })}
      </div>

      {/* Monthly Chart */}
      {data.by_month.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Estimate Volume</h3>
          <BarChartWrapper
            data={data.by_month}
            xKey="month"
            bars={[
              { dataKey: 'created_count', name: 'Created', color: CHART_COLORS.primary },
              { dataKey: 'accepted_count', name: 'Accepted', color: CHART_COLORS.success },
            ]}
            height={300}
          />
        </div>
      )}

      {/* Recent Estimates Table */}
      {data.recent_estimates.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Estimates</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Job</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Total</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Status</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_estimates.map((estimate, idx) => {
                  const colors = STATUS_COLORS[estimate.status] || STATUS_COLORS.draft;
                  return (
                    <tr key={estimate.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="px-4 py-2 font-medium text-gray-900">{estimate.job_name}</td>
                      <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(estimate.total)}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} capitalize`}>
                          {estimate.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {new Date(estimate.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
