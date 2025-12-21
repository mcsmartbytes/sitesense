'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StatCard from './StatCard';
import PieChartWrapper from './PieChartWrapper';
import { PropertyReportData, CHART_COLORS } from '../types';

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  emergency: { bg: 'bg-red-100', text: 'text-red-800' },
  urgent: { bg: 'bg-orange-100', text: 'text-orange-800' },
  normal: { bg: 'bg-blue-100', text: 'text-blue-800' },
  low: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-800' },
  triaged: { bg: 'bg-purple-100', text: 'text-purple-800' },
  assigned: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  pending_parts: { bg: 'bg-orange-100', text: 'text-orange-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export default function PropertyReport() {
  const { user } = useAuth();
  const [data, setData] = useState<PropertyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/reports/properties?user_id=${user!.id}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load property data');
      }
    } catch (err) {
      console.error('Error loading property report:', err);
      setError('Failed to load property data');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function exportCSV() {
    if (!data) return;

    const headers = ['Tenant', 'Unit', 'Lease End', 'Days Until'];
    const rows = data.lease_expirations.map((l) => [
      l.tenant_name,
      l.unit_number,
      l.end_date,
      l.days_until.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `property-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading property data...</p>
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
        No property data available.
      </div>
    );
  }

  // Prepare occupancy data for pie chart
  const occupancyPieData = [
    { name: 'Occupied', value: data.summary.occupied_units, color: CHART_COLORS.success },
    { name: 'Vacant', value: data.summary.total_units - data.summary.occupied_units, color: CHART_COLORS.neutral },
  ];

  // Group work orders by priority for display
  const workOrdersByPriority = data.work_order_breakdown.reduce((acc, wo) => {
    if (!acc[wo.priority]) {
      acc[wo.priority] = { total: 0, statuses: {} };
    }
    acc[wo.priority].total += wo.count;
    acc[wo.priority].statuses[wo.status] = (acc[wo.priority].statuses[wo.status] || 0) + wo.count;
    return acc;
  }, {} as Record<string, { total: number; statuses: Record<string, number> }>);

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
          label="Total Units"
          value={data.summary.total_units}
          color="default"
        />
        <StatCard
          label="Occupancy Rate"
          value={`${data.summary.occupancy_rate}%`}
          color={data.summary.occupancy_rate >= 90 ? 'green' : data.summary.occupancy_rate >= 70 ? 'yellow' : 'red'}
        />
        <StatCard
          label="Monthly Rent"
          value={formatCurrency(data.summary.total_monthly_rent)}
          color="blue"
        />
        <StatCard
          label="Open Work Orders"
          value={data.summary.open_work_orders}
          color={data.summary.open_work_orders > 10 ? 'red' : data.summary.open_work_orders > 5 ? 'yellow' : 'green'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Occupancy Pie Chart */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Unit Occupancy</h3>
          {data.summary.total_units > 0 ? (
            <PieChartWrapper
              data={occupancyPieData}
              height={250}
              innerRadius={60}
              outerRadius={90}
            />
          ) : (
            <p className="text-center py-12 text-gray-500">No units</p>
          )}
        </div>

        {/* Work Orders by Priority */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Orders by Priority</h3>
          {Object.keys(workOrdersByPriority).length > 0 ? (
            <div className="space-y-3">
              {['emergency', 'urgent', 'normal', 'low'].map((priority) => {
                const data = workOrdersByPriority[priority];
                if (!data) return null;
                const colors = PRIORITY_COLORS[priority] || PRIORITY_COLORS.low;
                return (
                  <div key={priority} className={`${colors.bg} rounded-lg p-4`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${colors.text} capitalize`}>{priority}</span>
                      <span className={`text-2xl font-bold ${colors.text}`}>{data.total}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(data.statuses).map(([status, count]) => (
                        <span key={status} className="text-xs bg-white/50 rounded px-2 py-1">
                          {status.replace('_', ' ')}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-12 text-gray-500">No work orders</p>
          )}
        </div>
      </div>

      {/* Lease Expirations */}
      {data.lease_expirations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Lease Expirations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Tenant</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Unit</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Lease End</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Days Until</th>
                </tr>
              </thead>
              <tbody>
                {data.lease_expirations.map((lease, idx) => (
                  <tr key={lease.lease_id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-2 font-medium text-gray-900">{lease.tenant_name}</td>
                    <td className="px-4 py-2 text-gray-600">{lease.unit_number}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(lease.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={`font-medium ${
                        lease.days_until <= 14 ? 'text-red-600' :
                        lease.days_until <= 30 ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        {lease.days_until} days
                      </span>
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
