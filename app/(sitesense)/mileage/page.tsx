'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';

type MileageEntry = {
  id: string;
  trip_date: string;
  miles: number;
  purpose: string;
  start_location: string | null;
  end_location: string | null;
  is_round_trip: boolean;
  notes: string | null;
  job_id: string | null;
  jobs: { name: string } | null;
};

type Job = {
  id: string;
  name: string;
};

// IRS Standard Mileage Rate for 2024
const IRS_MILEAGE_RATE = 0.67;

export default function MileagePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MileageEntry[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [miles, setMiles] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [notes, setNotes] = useState('');
  const [jobId, setJobId] = useState('');

  // Filter state
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | null>(null);

  useEffect(() => {
    if (user?.id) {
      void loadData();
    }
  }, [user?.id]);

  async function loadData() {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Load jobs for dropdown
      const jobsRes = await fetch(`/api/jobs?user_id=${user.id}`);
      const jobsData = await jobsRes.json();
      if (jobsData.success) {
        setJobs(jobsData.data || []);
      }

      // Load mileage entries
      const res = await fetch(`/api/mileage?user_id=${user.id}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load mileage data');
      }

      setEntries(data.data || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load mileage data');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setTripDate(new Date().toISOString().split('T')[0]);
    setMiles('');
    setPurpose('');
    setStartLocation('');
    setEndLocation('');
    setIsRoundTrip(false);
    setNotes('');
    setJobId('');
    setShowForm(false);
  }

  function handleEdit(entry: MileageEntry) {
    setEditingId(entry.id);
    setTripDate(entry.trip_date);
    setMiles(entry.miles.toString());
    setPurpose(entry.purpose);
    setStartLocation(entry.start_location || '');
    setEndLocation(entry.end_location || '');
    setIsRoundTrip(entry.is_round_trip);
    setNotes(entry.notes || '');
    setJobId(entry.job_id || '');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !miles || !purpose.trim()) return;

    try {
      const payload = {
        user_id: user.id,
        trip_date: tripDate,
        miles: parseFloat(miles),
        purpose: purpose.trim(),
        start_location: startLocation.trim() || null,
        end_location: endLocation.trim() || null,
        is_round_trip: isRoundTrip,
        notes: notes.trim() || null,
        job_id: jobId || null,
      };

      if (editingId) {
        const res = await fetch('/api/mileage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      } else {
        const res = await fetch('/api/mileage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      console.error('Error saving:', err);
      setError(err.message || 'Failed to save mileage entry');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this mileage entry?')) return;

    try {
      const res = await fetch(`/api/mileage?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting:', err);
      setError(err.message || 'Failed to delete');
    }
  }

  // Filter entries
  const filteredEntries = entries.filter(e => {
    const date = new Date(e.trip_date);
    if (date.getFullYear() !== filterYear) return false;
    if (filterMonth !== null && date.getMonth() !== filterMonth) return false;
    return true;
  });

  // Calculate totals
  const totalMiles = filteredEntries.reduce((sum, e) => sum + e.miles, 0);
  const totalDeduction = totalMiles * IRS_MILEAGE_RATE;

  // Year options
  const years = [...new Set(entries.map(e => new Date(e.trip_date).getFullYear()))];
  if (!years.includes(new Date().getFullYear())) {
    years.push(new Date().getFullYear());
  }
  years.sort((a, b) => b - a);

  const months = [
    { value: null, label: 'All Months' },
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading mileage data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mileage Tracking</h1>
            <p className="text-sm text-gray-600 mt-1">
              IRS Rate: ${IRS_MILEAGE_RATE}/mile
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              + Log Trip
            </button>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-semibold self-center">
              Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-600">Total Miles</p>
            <p className="text-2xl font-bold text-gray-900">{totalMiles.toFixed(1)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-600">Estimated Deduction</p>
            <p className="text-2xl font-bold text-green-600">${totalDeduction.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-600">Trips Logged</p>
            <p className="text-2xl font-bold text-gray-900">{filteredEntries.length}</p>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <section className="bg-white rounded-lg shadow p-5 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Trip' : 'Log New Trip'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Miles *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={miles}
                  onChange={(e) => setMiles(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purpose *</label>
                <input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Client meeting, Site visit"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Location</label>
                <input
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Office"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Location</label>
                <input
                  value={endLocation}
                  onChange={(e) => setEndLocation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Client site"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Job (optional)</label>
                <select
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No job</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isRoundTrip}
                    onChange={(e) => setIsRoundTrip(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Round trip</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="md:col-span-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Save Trip'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Month</label>
              <select
                value={filterMonth === null ? '' : filterMonth}
                onChange={(e) => setFilterMonth(e.target.value === '' ? null : parseInt(e.target.value))}
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {months.map(m => (
                  <option key={m.label} value={m.value === null ? '' : m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Mileage Table */}
        <section className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-900">Trip Log ({filteredEntries.length})</h2>
          </div>
          {filteredEntries.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              No trips logged for this period. Log your first trip to start tracking mileage deductions.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Date</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Purpose</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Route</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Job</th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">Miles</th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">Deduction</th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, idx) => (
                    <tr key={entry.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="px-4 py-2">
                        {new Date(entry.trip_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {entry.purpose}
                        {entry.is_round_trip && (
                          <span className="ml-2 text-xs text-blue-600">(Round trip)</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {entry.start_location && entry.end_location
                          ? `${entry.start_location} → ${entry.end_location}`
                          : entry.start_location || entry.end_location || '—'}
                      </td>
                      <td className="px-4 py-2">
                        {entry.job_id ? (
                          <Link
                            href={`/jobs/${entry.job_id}`}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {entry.jobs?.name || 'View Job'}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right">{entry.miles.toFixed(1)}</td>
                      <td className="px-4 py-2 text-right text-green-600 font-medium">
                        ${(entry.miles * IRS_MILEAGE_RATE).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
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
        </section>
      </main>
    </div>
  );
}
