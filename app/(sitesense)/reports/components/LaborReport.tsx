'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StatCard from './StatCard';
import BarChartWrapper from './BarChartWrapper';
import LineChartWrapper from './LineChartWrapper';
import { DateRange, LaborReportData, CHART_COLORS } from '../types';

type LaborReportProps = {
  dateRange: DateRange;
};

export default function LaborReport({ dateRange }: LaborReportProps) {
  const { user } = useAuth();
  const [data, setData] = useState<LaborReportData | null>(null);
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

      const res = await fetch(`/api/reports/labor?${params}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load labor data');
      }
    } catch (err) {
      console.error('Error loading labor report:', err);
      setError('Failed to load labor data');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatHours(value: number): string {
    return value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'h';
  }

  function exportCSV() {
    if (!data) return;

    const headers = ['Job', 'Hours', 'Cost'];
    const rows = data.hours_by_job.map((j) => [
      j.job_name,
      j.hours.toFixed(1),
      j.cost.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `labor-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading labor data...</p>
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
        No labor data available.
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
          label="Total Hours"
          value={formatHours(data.summary.total_hours)}
          color="default"
        />
        <StatCard
          label="Labor Cost"
          value={formatCurrency(data.summary.total_labor_cost)}
          color="blue"
        />
        <StatCard
          label="Avg Hourly Rate"
          value={formatCurrency(data.summary.avg_hourly_rate) + '/hr'}
          color="default"
        />
        <StatCard
          label="Jobs with Time"
          value={data.summary.jobs_with_time}
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Hours by Job */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours by Job</h3>
          {data.hours_by_job.length > 0 ? (
            <BarChartWrapper
              data={data.hours_by_job}
              xKey="job_name"
              bars={[{ dataKey: 'hours', name: 'Hours', color: CHART_COLORS.primary }]}
              height={280}
              formatValue={(v) => formatHours(v)}
            />
          ) : (
            <p className="text-center py-12 text-gray-500">No job data</p>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Hours Trend</h3>
          {data.hours_by_month.length > 0 ? (
            <LineChartWrapper
              data={data.hours_by_month}
              xKey="month"
              lines={[
                { dataKey: 'hours', name: 'Hours', color: CHART_COLORS.primary },
              ]}
              height={280}
              formatValue={(v) => formatHours(v)}
            />
          ) : (
            <p className="text-center py-12 text-gray-500">No monthly data</p>
          )}
        </div>
      </div>

      {/* Hours by Job Table */}
      {data.hours_by_job.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Labor Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Job</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Hours</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Cost</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Avg Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.hours_by_job.map((job, idx) => (
                  <tr key={job.job_id || idx} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-2 font-medium text-gray-900">{job.job_name}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{formatHours(job.hours)}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(job.cost)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {job.hours > 0 ? formatCurrency(job.cost / job.hours) + '/hr' : '—'}
                    </td>
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
