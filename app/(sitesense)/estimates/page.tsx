'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';

type Row = {
  id: string;
  status: string;
  total: number;
  created_at: string;
  public_token: string;
  po_number: string | null;
  jobs: { name: string } | null;
};

export default function EstimatesListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      void load();
    }
  }, [user?.id]);

  async function load() {
    if (!user?.id) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/estimates?user_id=${user.id}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load estimates');
      }

      setRows(data.data || []);
    } catch (err: any) {
      console.error('Failed to load estimates', err);
      setError(err.message || 'Failed to load estimates');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this estimate?')) return;

    try {
      const res = await fetch(`/api/estimates?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await load();
    } catch (err: any) {
      console.error('Error deleting estimate:', err);
      setError(err.message || 'Failed to delete estimate');
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.jobs?.name || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q) ||
      (r.po_number || '').toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'accepted': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Estimates</h1>
            <p className="text-sm text-gray-600 mt-1">
              {rows.length} total estimates
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/jobs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold self-center">
              Jobs
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        <div className="mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by PO, job, status, or ID"
            className="w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            No estimates yet. Create one from any Job.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Job</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">PO #</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Status</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Total</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Created</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {r.jobs?.name || '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{r.po_number || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium">${r.total.toFixed(2)}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right space-x-3">
                      <Link
                        href={`/estimates/${r.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Open
                      </Link>
                      <a
                        href={`/estimates/public/${r.public_token}`}
                        className="text-gray-600 hover:text-gray-800"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Public
                      </a>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
