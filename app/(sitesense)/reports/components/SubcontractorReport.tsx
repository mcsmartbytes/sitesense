'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StatCard from './StatCard';
import BarChartWrapper from './BarChartWrapper';
import { SubcontractorReportData, ComplianceStatus, CHART_COLORS } from '../types';

const STATUS_COLORS: Record<ComplianceStatus, { bg: string; text: string }> = {
  valid: { bg: 'bg-green-100', text: 'text-green-800' },
  expiring: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  expired: { bg: 'bg-red-100', text: 'text-red-800' },
  missing: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export default function SubcontractorReport() {
  const { user } = useAuth();
  const [data, setData] = useState<SubcontractorReportData | null>(null);
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
      const res = await fetch(`/api/reports/subcontractors?user_id=${user!.id}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load subcontractor data');
      }
    } catch (err) {
      console.error('Error loading subcontractor report:', err);
      setError('Failed to load subcontractor data');
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!data) return;

    const headers = ['Company', 'Trade', 'Insurance', 'License', 'W9', 'COI', 'Score'];
    const rows = data.compliance_items.map((s) => [
      s.company_name,
      s.trade || '',
      s.insurance_status,
      s.license_status,
      s.w9_on_file ? 'Yes' : 'No',
      s.coi_on_file ? 'Yes' : 'No',
      s.overall_score.toString() + '%',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `subcontractor-compliance-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  function StatusBadge({ status }: { status: ComplianceStatus }) {
    const colors = STATUS_COLORS[status];
    return (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} capitalize`}>
        {status}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading subcontractor data...</p>
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
        No subcontractor data available.
      </div>
    );
  }

  const complianceRate = data.summary.total_subs > 0
    ? Math.round((data.summary.fully_compliant / data.summary.total_subs) * 100)
    : 0;

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
          label="Total Subcontractors"
          value={data.summary.total_subs}
          color="default"
        />
        <StatCard
          label="Fully Compliant"
          value={data.summary.fully_compliant}
          color="green"
          subtext={`${complianceRate}% compliance rate`}
        />
        <StatCard
          label="Expiring Soon"
          value={data.summary.expiring_soon}
          color="yellow"
          subtext="Within 30 days"
        />
        <StatCard
          label="Expired"
          value={data.summary.expired}
          color="red"
        />
      </div>

      {/* Expiring Documents Alert */}
      {data.expiring_documents.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">
            Documents Requiring Attention
          </h3>
          <div className="space-y-2">
            {data.expiring_documents.slice(0, 10).map((doc, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-yellow-200 last:border-0">
                <div>
                  <span className="font-medium text-yellow-900">{doc.company_name}</span>
                  <span className="text-yellow-700"> - {doc.doc_type}</span>
                </div>
                <span className={`text-sm font-medium ${doc.days_until < 0 ? 'text-red-600' : 'text-yellow-700'}`}>
                  {doc.days_until < 0
                    ? `Expired ${Math.abs(doc.days_until)} days ago`
                    : doc.days_until === 0
                    ? 'Expires today'
                    : `${doc.days_until} days`
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Trade Chart */}
      {data.by_trade.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subcontractors by Trade</h3>
          <BarChartWrapper
            data={data.by_trade}
            xKey="trade"
            bars={[
              { dataKey: 'count', name: 'Total', color: CHART_COLORS.primary },
              { dataKey: 'compliant_count', name: 'Compliant', color: CHART_COLORS.success },
            ]}
            height={250}
          />
        </div>
      )}

      {/* Compliance Table */}
      {data.compliance_items.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Company</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Trade</th>
                  <th className="px-4 py-2 text-center text-gray-600 font-medium">Insurance</th>
                  <th className="px-4 py-2 text-center text-gray-600 font-medium">License</th>
                  <th className="px-4 py-2 text-center text-gray-600 font-medium">W. Comp</th>
                  <th className="px-4 py-2 text-center text-gray-600 font-medium">W9</th>
                  <th className="px-4 py-2 text-center text-gray-600 font-medium">COI</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.compliance_items.map((sub, idx) => (
                  <tr key={sub.subcontractor_id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-2 font-medium text-gray-900">{sub.company_name}</td>
                    <td className="px-4 py-2 text-gray-600">{sub.trade || '—'}</td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge status={sub.insurance_status} />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge status={sub.license_status} />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge status={sub.workers_comp_status} />
                    </td>
                    <td className="px-4 py-2 text-center">
                      {sub.w9_on_file ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {sub.coi_on_file ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={`font-medium ${
                        sub.overall_score >= 80 ? 'text-green-600' :
                        sub.overall_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {sub.overall_score}%
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
