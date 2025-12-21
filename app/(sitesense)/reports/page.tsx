'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustry } from '@/contexts/IndustryContext';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DateRangePicker from './components/DateRangePicker';
import FinancialReport from './components/FinancialReport';
import EstimateReport from './components/EstimateReport';
import SubcontractorReport from './components/SubcontractorReport';
import LaborReport from './components/LaborReport';
import PropertyReport from './components/PropertyReport';
import { DateRange } from './types';

type Job = {
  id: string;
  name: string;
  client_name: string | null;
  status: string;
  industry_name: string | null;
  created_at: string;
};

type Tool = {
  id: string;
  name: string;
  status: string;
  current_value: number | null;
  purchase_price: number | null;
};

type TabId = 'jobs' | 'tools' | 'financial' | 'estimates' | 'subcontractors' | 'labor' | 'properties';

function ReportsPageContent() {
  const { user } = useAuth();
  const { isModuleEnabled } = useIndustry();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('jobs');

  // Default date range: last 30 days
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });

  // Define available tabs based on industry
  const tabs = useMemo(() => {
    const baseTabs: { id: TabId; label: string }[] = [
      { id: 'jobs', label: 'Jobs' },
      { id: 'tools', label: 'Tools' },
      { id: 'financial', label: 'Financial' },
      { id: 'estimates', label: 'Estimates' },
      { id: 'subcontractors', label: 'Subcontractors' },
      { id: 'labor', label: 'Time & Labor' },
    ];

    // Add properties tab if PM modules are enabled
    if (isModuleEnabled('units') || isModuleEnabled('work_orders')) {
      baseTabs.push({ id: 'properties', label: 'Properties' });
    }

    return baseTabs;
  }, [isModuleEnabled]);

  useEffect(() => {
    if (user) {
      void loadData();
    }
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Load jobs
      const jobRes = await fetch(`/api/jobs?user_id=${user?.id}`);
      const jobData = await jobRes.json();
      if (jobData.success) {
        setJobs(jobData.data || []);
      }

      // Load tools
      const toolRes = await fetch(`/api/tools?user_id=${user?.id}`);
      const toolData = await toolRes.json();
      if (toolData.success) {
        setTools(toolData.data || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }

  // Job stats
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const plannedJobs = jobs.filter(j => j.status === 'planned').length;

  // Tool stats
  const totalTools = tools.length;
  const availableTools = tools.filter(t => t.status === 'available').length;
  const checkedOutTools = tools.filter(t => t.status === 'checked_out').length;
  const totalToolValue = tools.reduce((sum, t) => sum + (t.current_value || t.purchase_price || 0), 0);

  // Export jobs to CSV
  function exportJobsCSV() {
    const headers = ['Job Name', 'Client', 'Industry', 'Status', 'Created'];
    const rows = jobs.map(j => [
      j.name,
      j.client_name || '',
      j.industry_name || '',
      j.status,
      new Date(j.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `jobs-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  // Export tools to CSV
  function exportToolsCSV() {
    const headers = ['Tool Name', 'Status', 'Value'];
    const rows = tools.map(t => [
      t.name,
      t.status,
      (t.current_value || t.purchase_price || 0).toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tools-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  // Check if current tab needs date range
  const showDateRange = ['financial', 'estimates', 'labor'].includes(activeTab);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="sitesense" />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation variant="sitesense" />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-600 mt-1">
              Analytics and insights across your business
            </p>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
            ← Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Date Range Picker (for applicable tabs) */}
        {showDateRange && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        )}

        {/* Summary Cards (for Jobs/Tools tabs) */}
        {(activeTab === 'jobs' || activeTab === 'tools') && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-600">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-600">Active Jobs</p>
              <p className="text-2xl font-bold text-blue-600">{activeJobs}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-600">Total Tools</p>
              <p className="text-2xl font-bold text-gray-900">{totalTools}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-600">Equipment Value</p>
              <p className="text-2xl font-bold text-green-600">${totalToolValue.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b flex justify-between items-center overflow-x-auto">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 sm:px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            {(activeTab === 'jobs' || activeTab === 'tools') && (
              <div className="pr-4">
                <button
                  onClick={activeTab === 'jobs' ? exportJobsCSV : exportToolsCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  Export CSV
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {activeTab === 'jobs' && (
              <div>
                {/* Job status breakdown */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-yellow-600">{plannedJobs}</p>
                    <p className="text-sm text-yellow-700">Planned</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{activeJobs}</p>
                    <p className="text-sm text-blue-700">Active</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{completedJobs}</p>
                    <p className="text-sm text-green-700">Completed</p>
                  </div>
                </div>

                {/* Jobs table */}
                {jobs.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No jobs yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600 font-medium">Job</th>
                          <th className="px-4 py-2 text-left text-gray-600 font-medium">Client</th>
                          <th className="px-4 py-2 text-left text-gray-600 font-medium">Industry</th>
                          <th className="px-4 py-2 text-left text-gray-600 font-medium">Status</th>
                          <th className="px-4 py-2 text-left text-gray-600 font-medium">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((job, idx) => (
                          <tr key={job.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                            <td className="px-4 py-2 font-medium text-gray-900">{job.name}</td>
                            <td className="px-4 py-2 text-gray-600">{job.client_name || '—'}</td>
                            <td className="px-4 py-2 text-gray-600">{job.industry_name || '—'}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                job.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : job.status === 'planned'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {job.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {new Date(job.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tools' && (
              <div>
                {/* Tool status breakdown */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{availableTools}</p>
                    <p className="text-sm text-green-700">Available</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{checkedOutTools}</p>
                    <p className="text-sm text-blue-700">Checked Out</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-gray-600">
                      {tools.filter(t => !['available', 'checked_out'].includes(t.status)).length}
                    </p>
                    <p className="text-sm text-gray-700">Other</p>
                  </div>
                </div>

                {/* Tools table */}
                {tools.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No tools yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600 font-medium">Tool</th>
                          <th className="px-4 py-2 text-left text-gray-600 font-medium">Status</th>
                          <th className="px-4 py-2 text-right text-gray-600 font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tools.map((tool, idx) => (
                          <tr key={tool.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                            <td className="px-4 py-2 font-medium text-gray-900">{tool.name}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                tool.status === 'available'
                                  ? 'bg-green-100 text-green-800'
                                  : tool.status === 'checked_out'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {tool.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right">
                              ${(tool.current_value || tool.purchase_price || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'financial' && <FinancialReport dateRange={dateRange} />}
            {activeTab === 'estimates' && <EstimateReport dateRange={dateRange} />}
            {activeTab === 'subcontractors' && <SubcontractorReport />}
            {activeTab === 'labor' && <LaborReport dateRange={dateRange} />}
            {activeTab === 'properties' && <PropertyReport />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsPageContent />
    </ProtectedRoute>
  );
}
