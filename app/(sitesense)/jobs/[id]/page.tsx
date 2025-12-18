'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';

type Job = {
  id: string;
  name: string;
  client_name: string | null;
  status: string | null;
  created_at: string;
  industry_name?: string | null;
  property_address?: string | null;
  structure_type?: string | null;
  roof_type?: string | null;
  roof_pitch?: string | null;
  layers?: number | null;
  measured_squares?: number | null;
  dumpster_size?: string | null;
  dumpster_hauler?: string | null;
  notes?: string | null;
};

type Expense = {
  id: string;
  amount: number;
  description: string;
  date: string;
  is_business: boolean;
  vendor: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
};

type TimeEntry = {
  id: string;
  date: string;
  hours: number;
  hourly_rate: number | null;
  notes: string | null;
};

type Phase = {
  id: string;
  name: string;
  sort_order: number;
  status: 'planned' | 'active' | 'blocked' | 'completed';
};

type Task = {
  id: string;
  phase_id: string;
  name: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done';
  assignee: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  sort_order: number;
  notes: string | null;
};

type Permit = {
  id: string;
  permit_number: string | null;
  authority: string | null;
  status: 'draft' | 'applied' | 'approved' | 'rejected' | 'closed';
  inspection_date: string | null;
};

type Material = {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  unit_cost: number | null;
  vendor: string | null;
};

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const router = useRouter();
  const { user } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTime, setNewTime] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    hourly_rate: '',
    notes: '',
  });
  const [savingTime, setSavingTime] = useState(false);
  const [addingTaskForPhase, setAddingTaskForPhase] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskEdit, setTaskEdit] = useState<{ assignee: string; due_date: string }>({ assignee: '', due_date: '' });
  const [newPermit, setNewPermit] = useState({ permit_number: '', authority: '', status: 'applied', inspection_date: '' });
  const [editingPermitId, setEditingPermitId] = useState<string | null>(null);
  const [newMaterial, setNewMaterial] = useState({ name: '', quantity: '1', unit_cost: '', unit: '', vendor: '' });
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');

  useEffect(() => {
    if (!jobId || !user?.id) return;
    void loadData();
  }, [jobId, user?.id]);

  async function loadData() {
    if (!user?.id) return;

    setLoading(true);
    setError(null);
    try {
      // Load job details
      const jobRes = await fetch(`/api/jobs/${jobId}`);
      const jobData = await jobRes.json();

      if (!jobData.success || !jobData.data) {
        setError('Job not found');
        setLoading(false);
        return;
      }

      setJob(jobData.data);

      // Load related data in parallel
      const [expensesRes, timeRes, phasesRes, tasksRes, permitsRes, materialsRes] = await Promise.all([
        fetch(`/api/jobs/${jobId}/expenses`),
        fetch(`/api/jobs/${jobId}/time-entries`),
        fetch(`/api/jobs/${jobId}/phases`),
        fetch(`/api/jobs/${jobId}/tasks`),
        fetch(`/api/jobs/${jobId}/permits`),
        fetch(`/api/jobs/${jobId}/materials`),
      ]);

      const [expensesData, timeData, phasesData, tasksData, permitsData, materialsData] = await Promise.all([
        expensesRes.json(),
        timeRes.json(),
        phasesRes.json(),
        tasksRes.json(),
        permitsRes.json(),
        materialsRes.json(),
      ]);

      if (expensesData.success) setExpenses(expensesData.data || []);
      if (timeData.success) setTimeEntries(timeData.data || []);
      if (phasesData.success) setPhases(phasesData.data || []);
      if (tasksData.success) setTasks(tasksData.data || []);
      if (permitsData.success) setPermits(permitsData.data || []);
      if (materialsData.success) setMaterials(materialsData.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load job details.');
    } finally {
      setLoading(false);
    }
  }

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalBusinessExpense = expenses
    .filter((e) => e.is_business)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalHours = timeEntries.reduce((sum, t) => sum + t.hours, 0);
  const totalLaborCost = timeEntries.reduce((sum, t) => {
    if (!t.hourly_rate) return sum;
    return sum + t.hours * t.hourly_rate;
  }, 0);

  const totalMaterialsCost = materials.reduce((sum, m) => {
    if (!m.unit_cost) return sum;
    return sum + m.quantity * m.unit_cost;
  }, 0);

  const totalJobCost = totalExpense + totalLaborCost + totalMaterialsCost;

  async function handleAddTimeEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId || !user?.id) return;

    const hours = parseFloat(newTime.hours || '0');
    const hourlyRate = newTime.hourly_rate ? parseFloat(newTime.hourly_rate) : null;

    if (!hours || hours <= 0) {
      alert('Enter hours > 0');
      return;
    }

    setSavingTime(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          date: newTime.date,
          hours,
          hourly_rate: hourlyRate,
          notes: newTime.notes || null,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setNewTime({
        date: newTime.date,
        hours: '',
        hourly_rate: '',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      alert('Failed to save time entry: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingTime(false);
    }
  }

  async function updateTaskStatus(taskId: string, status: Task['status']) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status }),
      });
      const data = await res.json();
      if (data.success) await loadData();
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  }

  async function addTask(phaseId: string) {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase_id: phaseId, name: newTaskTitle.trim(), status: 'todo' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setNewTaskTitle('');
      setAddingTaskForPhase(null);
      await loadData();
    } catch (err: any) {
      alert('Failed to add task: ' + (err.message || 'Unknown error'));
    }
  }

  async function addPhase() {
    if (!newPhaseName.trim() || !user?.id) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: newPhaseName.trim(),
          status: 'planned',
          sort_order: phases.length,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setNewPhaseName('');
      setShowAddPhase(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to add phase: ' + (err.message || 'Unknown error'));
    }
  }

  async function saveTaskEdit(taskId: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          assignee: taskEdit.assignee || null,
          due_date: taskEdit.due_date || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingTaskId(null);
        await loadData();
      }
    } catch (err) {
      console.error('Failed to save task edit:', err);
    }
  }

  async function addPermit() {
    if (!jobId || !user?.id) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}/permits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          permit_number: newPermit.permit_number || null,
          authority: newPermit.authority || null,
          status: newPermit.status || 'applied',
          inspection_date: newPermit.inspection_date || null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setNewPermit({ permit_number: '', authority: '', status: 'applied', inspection_date: '' });
      await loadData();
    } catch (err: any) {
      alert('Failed to add permit: ' + (err.message || 'Unknown error'));
    }
  }

  async function deletePermit(id: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/permits?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await loadData();
    } catch (err) {
      console.error('Failed to delete permit:', err);
    }
  }

  function startEditPermit(p: Permit) {
    setEditingPermitId(p.id);
    setNewPermit({
      permit_number: p.permit_number || '',
      authority: p.authority || '',
      status: p.status || 'applied',
      inspection_date: p.inspection_date || '',
    });
  }

  async function savePermitEdit() {
    if (!editingPermitId) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}/permits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPermitId,
          permit_number: newPermit.permit_number || null,
          authority: newPermit.authority || null,
          status: newPermit.status,
          inspection_date: newPermit.inspection_date || null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setEditingPermitId(null);
      setNewPermit({ permit_number: '', authority: '', status: 'applied', inspection_date: '' });
      await loadData();
    } catch (err: any) {
      alert('Failed to update permit: ' + (err.message || 'Unknown error'));
    }
  }

  async function addMaterial() {
    if (!jobId || !user?.id || !newMaterial.name.trim()) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: newMaterial.name.trim(),
          quantity: newMaterial.quantity ? Number(newMaterial.quantity) : 1,
          unit: newMaterial.unit || null,
          unit_cost: newMaterial.unit_cost ? Number(newMaterial.unit_cost) : null,
          vendor: newMaterial.vendor || null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setNewMaterial({ name: '', quantity: '1', unit_cost: '', unit: '', vendor: '' });
      await loadData();
    } catch (err: any) {
      alert('Failed to add material: ' + (err.message || 'Unknown error'));
    }
  }

  async function deleteMaterial(id: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}/materials?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await loadData();
    } catch (err) {
      console.error('Failed to delete material:', err);
    }
  }

  function startEditMaterial(m: Material) {
    setEditingMaterialId(m.id);
    setNewMaterial({
      name: m.name,
      quantity: m.quantity.toString(),
      unit_cost: m.unit_cost?.toString() || '',
      unit: m.unit || '',
      vendor: m.vendor || '',
    });
  }

  async function saveMaterialEdit() {
    if (!editingMaterialId) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}/materials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMaterialId,
          name: newMaterial.name.trim(),
          quantity: newMaterial.quantity ? Number(newMaterial.quantity) : 1,
          unit_cost: newMaterial.unit_cost ? Number(newMaterial.unit_cost) : null,
          unit: newMaterial.unit || null,
          vendor: newMaterial.vendor || null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setEditingMaterialId(null);
      setNewMaterial({ name: '', quantity: '1', unit_cost: '', unit: '', vendor: '' });
      await loadData();
    } catch (err: any) {
      alert('Failed to update material: ' + (err.message || 'Unknown error'));
    }
  }

  function cancelEdit() {
    setEditingPermitId(null);
    setEditingMaterialId(null);
    setNewPermit({ permit_number: '', authority: '', status: 'applied', inspection_date: '' });
    setNewMaterial({ name: '', quantity: '1', unit_cost: '', unit: '', vendor: '' });
  }

  async function updateJobStatus(newStatus: string) {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setJob(prev => prev ? { ...prev, status: newStatus } : null);
      } else {
        alert('Failed to update status: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Failed to update status: ' + (err.message || 'Unknown error'));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="sitesense" />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading job...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="sitesense" />
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-red-600">{error || 'Job not found'}</p>
          <button
            onClick={() => router.push('/jobs')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation variant="sitesense" />
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{job.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {job.client_name && <span className="text-gray-600 text-sm">Client: {job.client_name}</span>}
              {job.industry_name && <span className="text-gray-600 text-sm">· Industry: {job.industry_name}</span>}
              <span className="text-gray-600 text-sm">·</span>
              <select
                value={job.status || 'active'}
                onChange={(e) => updateJobStatus(e.target.value)}
                className={`text-sm font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  job.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                  job.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
            ← Back to Jobs
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">${totalExpense.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase">Materials Cost</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">${totalMaterialsCost.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase">Hours Logged</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalHours.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-500 uppercase">Total Job Cost</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">${totalJobCost.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expenses */}
          <section className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <h2 className="font-semibold text-gray-900">Expenses for this Job</h2>
              <Link href="/expenses/new" className="text-sm text-blue-600 hover:text-blue-700">+ Add Expense</Link>
            </div>
            {expenses.length === 0 ? (
              <div className="p-6 text-gray-500 text-sm">No expenses linked to this job yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-600">Date</th>
                      <th className="px-4 py-2 text-left text-gray-600">Description</th>
                      <th className="px-4 py-2 text-left text-gray-600">Category</th>
                      <th className="px-4 py-2 text-left text-gray-600">Vendor</th>
                      <th className="px-4 py-2 text-right text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="px-4 py-2">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2">{e.description}</td>
                        <td className="px-4 py-2">
                          {e.category_name && (
                            <span className="inline-flex items-center gap-1">
                              <span>{e.category_icon}</span>
                              <span>{e.category_name}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">{e.vendor || '—'}</td>
                        <td className="px-4 py-2 text-right">${e.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Time tracking */}
          <section className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-gray-900">Time Entries</h2>
            </div>

            <form onSubmit={handleAddTimeEntry} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Date</label>
                <input type="date" value={newTime.date} onChange={(e) => setNewTime((prev) => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Hours *</label>
                  <input type="number" step="0.25" min="0" required value={newTime.hours} onChange={(e) => setNewTime((prev) => ({ ...prev, hours: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Hourly Rate</label>
                  <input type="number" step="0.01" min="0" value={newTime.hourly_rate} onChange={(e) => setNewTime((prev) => ({ ...prev, hourly_rate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" placeholder="optional" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Notes</label>
                <textarea rows={2} value={newTime.notes} onChange={(e) => setNewTime((prev) => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>

              <button type="submit" disabled={savingTime} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {savingTime ? 'Saving...' : '+ Add Time Entry'}
              </button>
            </form>

            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 mb-1">Total Hours: <span className="font-semibold text-gray-900">{totalHours.toFixed(2)}</span></p>
              <p className="text-xs text-gray-500">Labor Cost: <span className="font-semibold text-purple-700">${totalLaborCost.toFixed(2)}</span></p>
            </div>

            {timeEntries.length > 0 && (
              <div className="border-t pt-3 max-h-60 overflow-y-auto text-xs">
                {timeEntries.map((t) => (
                  <div key={t.id} className="py-1 border-b last:border-b-0">
                    <div className="flex justify-between">
                      <span>{new Date(t.date).toLocaleDateString()}</span>
                      <span>{t.hours.toFixed(2)} hrs</span>
                    </div>
                    {t.hourly_rate && (
                      <div className="flex justify-between text-gray-500">
                        <span>@ ${t.hourly_rate.toFixed(2)}/hr</span>
                        <span>${(t.hourly_rate * t.hours).toFixed(2)}</span>
                      </div>
                    )}
                    {t.notes && (
                      <p className="text-gray-600 mt-0.5 line-clamp-2">{t.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Phases & Tasks */}
        <section className="bg-white rounded-lg shadow mt-6">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Project Phases</h2>
              <p className="text-xs text-gray-500">Track progress from intake to closeout.</p>
            </div>
            <button
              onClick={() => setShowAddPhase(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Phase
            </button>
          </div>

          {showAddPhase && (
            <div className="p-4 border-b bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPhaseName}
                  onChange={(e) => setNewPhaseName(e.target.value)}
                  placeholder="Phase name (e.g., Planning, Execution, Review)"
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && addPhase()}
                />
                <button
                  onClick={addPhase}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddPhase(false); setNewPhaseName(''); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {phases.length === 0 && !showAddPhase ? (
            <div className="p-6 text-sm text-gray-500">No phases yet. Click "+ Add Phase" to get started.</div>
          ) : phases.length > 0 ? (
            <div className="divide-y">
              {phases.map((p) => (
                <div key={p.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'completed' ? 'bg-green-100 text-green-800' :
                        p.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        p.status === 'blocked' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <button onClick={() => { setAddingTaskForPhase(p.id); setNewTaskTitle(''); }} className="text-sm text-blue-600 hover:text-blue-700">+ Add Task</button>
                  </div>

                  <ul className="space-y-2">
                    {tasks.filter(t => t.phase_id === p.id).map((t) => (
                      <li key={t.id} className="bg-gray-50 rounded p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-gray-800">{t.name}</p>
                            {editingTaskId === t.id ? (
                              <div className="mt-1 flex items-center gap-2 text-xs">
                                <input value={taskEdit.assignee} onChange={(e) => setTaskEdit({ ...taskEdit, assignee: e.target.value })} placeholder="Assignee" className="px-2 py-1 border rounded" />
                                <input type="date" value={taskEdit.due_date} onChange={(e) => setTaskEdit({ ...taskEdit, due_date: e.target.value })} className="px-2 py-1 border rounded" />
                                <button onClick={() => saveTaskEdit(t.id)} className="px-2 py-1 bg-blue-600 text-white rounded">Save</button>
                                <button onClick={() => setEditingTaskId(null)} className="px-2 py-1 bg-gray-200 text-gray-700 rounded">Cancel</button>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">{t.assignee ? `Assignee: ${t.assignee} · ` : ''}{t.due_date ? `Due: ${new Date(t.due_date).toLocaleDateString()}` : ''}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <select value={t.status} onChange={(e) => updateTaskStatus(t.id, e.target.value as Task['status'])} className="text-sm px-2 py-1 border rounded">
                              <option value="todo">To do</option>
                              <option value="in_progress">In progress</option>
                              <option value="blocked">Blocked</option>
                              <option value="done">Done</option>
                            </select>
                            <button onClick={() => { setEditingTaskId(t.id); setTaskEdit({ assignee: t.assignee || '', due_date: t.due_date || '' }); }} className="text-xs text-blue-600 hover:text-blue-700">Edit</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {addingTaskForPhase === p.id && (
                    <div className="mt-3 flex items-center gap-2">
                      <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title" className="flex-1 px-3 py-2 border rounded" />
                      <button onClick={() => addTask(p.id)} className="px-3 py-2 bg-blue-600 text-white rounded">Add</button>
                      <button onClick={() => { setAddingTaskForPhase(null); setNewTaskTitle(''); }} className="px-3 py-2 bg-gray-200 text-gray-700 rounded">Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* Permits */}
        <section className="bg-white rounded-lg shadow mt-6">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-900">Permits</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <input placeholder="Permit Number" value={newPermit.permit_number} onChange={(e) => setNewPermit({ ...newPermit, permit_number: e.target.value })} className="px-3 py-2 border rounded" />
              <input placeholder="Authority" value={newPermit.authority} onChange={(e) => setNewPermit({ ...newPermit, authority: e.target.value })} className="px-3 py-2 border rounded" />
              <select value={newPermit.status} onChange={(e) => setNewPermit({ ...newPermit, status: e.target.value })} className="px-3 py-2 border rounded">
                <option value="draft">Draft</option>
                <option value="applied">Applied</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
              </select>
              <input type="date" value={newPermit.inspection_date} onChange={(e) => setNewPermit({ ...newPermit, inspection_date: e.target.value })} className="px-3 py-2 border rounded" title="Inspection Date" />
              {editingPermitId ? (
                <>
                  <button onClick={savePermitEdit} className="px-3 py-2 bg-green-600 text-white rounded">Save</button>
                  <button onClick={cancelEdit} className="px-3 py-2 bg-gray-300 text-gray-700 rounded">Cancel</button>
                </>
              ) : (
                <button onClick={addPermit} className="px-3 py-2 bg-blue-600 text-white rounded md:col-span-2">Add Permit</button>
              )}
            </div>

            {permits.length === 0 ? (
              <p className="text-sm text-gray-500">No permits yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Number</th>
                      <th className="px-3 py-2 text-left">Authority</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Inspection</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permits.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-3 py-2">{p.permit_number || '—'}</td>
                        <td className="px-3 py-2">{p.authority || '—'}</td>
                        <td className="px-3 py-2 capitalize">{p.status}</td>
                        <td className="px-3 py-2">{p.inspection_date ? new Date(p.inspection_date).toLocaleDateString() : '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => startEditPermit(p)} className="text-blue-600 hover:text-blue-700 mr-3">Edit</button>
                          <button onClick={() => deletePermit(p.id)} className="text-red-600 hover:text-red-700">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Materials / BOM */}
        <section className="bg-white rounded-lg shadow mt-6">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-900">Materials / BOM</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              <input placeholder="Material name" value={newMaterial.name} onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })} className="px-3 py-2 border rounded md:col-span-2" />
              <input type="number" min="0" step="0.01" placeholder="Qty" value={newMaterial.quantity} onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })} className="px-3 py-2 border rounded" />
              <input type="number" step="0.01" min="0" placeholder="Unit Cost" value={newMaterial.unit_cost} onChange={(e) => setNewMaterial({ ...newMaterial, unit_cost: e.target.value })} className="px-3 py-2 border rounded" />
              <input placeholder="Unit (e.g., sq, roll)" value={newMaterial.unit} onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })} className="px-3 py-2 border rounded" />
              <input placeholder="Vendor" value={newMaterial.vendor} onChange={(e) => setNewMaterial({ ...newMaterial, vendor: e.target.value })} className="px-3 py-2 border rounded" />
              {editingMaterialId ? (
                <div className="flex gap-2">
                  <button onClick={saveMaterialEdit} className="px-3 py-2 bg-green-600 text-white rounded">Save</button>
                  <button onClick={cancelEdit} className="px-3 py-2 bg-gray-300 text-gray-700 rounded">Cancel</button>
                </div>
              ) : (
                <button onClick={addMaterial} className="px-3 py-2 bg-blue-600 text-white rounded">Add</button>
              )}
            </div>

            {materials.length === 0 ? (
              <p className="text-sm text-gray-500">No materials yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Qty</th>
                      <th className="px-3 py-2 text-left">Unit Cost</th>
                      <th className="px-3 py-2 text-left">Unit</th>
                      <th className="px-3 py-2 text-left">Vendor</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => (
                      <tr key={m.id} className="border-t">
                        <td className="px-3 py-2">{m.name}</td>
                        <td className="px-3 py-2">{m.quantity}</td>
                        <td className="px-3 py-2">{m.unit_cost !== null ? `$${m.unit_cost.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2">{m.unit || '—'}</td>
                        <td className="px-3 py-2">{m.vendor || '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => startEditMaterial(m)} className="text-blue-600 hover:text-blue-700 mr-3">Edit</button>
                          <button onClick={() => deleteMaterial(m.id)} className="text-red-600 hover:text-red-700">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Estimates */}
        <section className="bg-white rounded-lg shadow mt-6">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Estimates</h2>
            <Link href={`/estimates/new/${job.id}`} className="text-sm text-blue-600 hover:text-blue-700">+ New Estimate</Link>
          </div>
          <div className="p-4 text-sm text-gray-500">
            Create professional estimates with optional add-ons and photo attachments.
          </div>
        </section>
      </main>
    </div>
  );
}
