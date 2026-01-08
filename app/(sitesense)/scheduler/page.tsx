'use client';

import { useEffect, useState, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

type ScheduleItem = {
  id: string;
  title: string;
  description: string | null;
  item_type: 'permit' | 'crew' | 'milestone' | 'subcontractor' | 'inspection' | 'deadline' | 'reminder' | 'other';
  job_id: string | null;
  job_name: string | null;
  scheduled_date: string;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
};

type Job = {
  id: string;
  name: string;
};

const ITEM_TYPES = [
  { value: 'permit', label: 'Permit', color: 'bg-purple-500', icon: '📋' },
  { value: 'crew', label: 'Crew Assignment', color: 'bg-blue-500', icon: '👷' },
  { value: 'milestone', label: 'Milestone', color: 'bg-green-500', icon: '🎯' },
  { value: 'subcontractor', label: 'Subcontractor', color: 'bg-orange-500', icon: '🔧' },
  { value: 'inspection', label: 'Inspection', color: 'bg-red-500', icon: '🔍' },
  { value: 'deadline', label: 'Deadline', color: 'bg-rose-500', icon: '⏰' },
  { value: 'reminder', label: 'Reminder', color: 'bg-yellow-500', icon: '🔔' },
  { value: 'other', label: 'Other', color: 'bg-gray-500', icon: '📌' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-gray-600 bg-gray-100' },
  { value: 'medium', label: 'Medium', color: 'text-blue-600 bg-blue-100' },
  { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-100' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-600 bg-red-100' },
];

export default function SchedulerPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list' | 'upcoming'>('upcoming');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterJob, setFilterJob] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    item_type: 'reminder' as ScheduleItem['item_type'],
    job_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    due_date: '',
    priority: 'medium' as ScheduleItem['priority'],
    assigned_to: '',
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && user?.id) {
      loadData();
    }
  }, [authLoading, user?.id]);

  async function loadData() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [itemsRes, jobsRes] = await Promise.all([
        fetch(`/api/scheduler?user_id=${user.id}`),
        fetch(`/api/jobs?user_id=${user.id}`),
      ]);
      const [itemsData, jobsData] = await Promise.all([
        itemsRes.json(),
        jobsRes.json(),
      ]);
      if (itemsData.success) setItems(itemsData.data || []);
      if (jobsData.success) setJobs(jobsData.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveItem() {
    if (!user?.id || !form.title.trim()) return;

    try {
      const method = editingItem ? 'PUT' : 'POST';
      const body = editingItem
        ? { id: editingItem.id, ...form }
        : { user_id: user.id, ...form };

      const res = await fetch('/api/scheduler', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          job_id: form.job_id || null,
          due_date: form.due_date || null,
          assigned_to: form.assigned_to || null,
          notes: form.notes || null,
          description: form.description || null,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      resetForm();
      await loadData();
    } catch (err: any) {
      alert('Failed to save: ' + (err.message || 'Unknown error'));
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this scheduled item?')) return;
    try {
      const res = await fetch(`/api/scheduler?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) await loadData();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  }

  async function updateStatus(id: string, status: ScheduleItem['status']) {
    try {
      const res = await fetch('/api/scheduler', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) await loadData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  function resetForm() {
    setShowModal(false);
    setEditingItem(null);
    setForm({
      title: '',
      description: '',
      item_type: 'reminder',
      job_id: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      due_date: '',
      priority: 'medium',
      assigned_to: '',
      notes: '',
    });
  }

  function startEdit(item: ScheduleItem) {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description || '',
      item_type: item.item_type,
      job_id: item.job_id || '',
      scheduled_date: item.scheduled_date,
      due_date: item.due_date || '',
      priority: item.priority,
      assigned_to: item.assigned_to || '',
      notes: item.notes || '',
    });
    setShowModal(true);
  }

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterType !== 'all' && item.item_type !== filterType) return false;
      if (filterJob !== 'all' && item.job_id !== filterJob) return false;
      return true;
    });
  }, [items, filterType, filterJob]);

  // Upcoming items (next 14 days)
  const upcomingItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 14);

    return filteredItems
      .filter(item => {
        const date = new Date(item.scheduled_date);
        return date >= today && date <= twoWeeks && item.status !== 'completed' && item.status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
  }, [filteredItems]);

  // Overdue items
  const overdueItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return filteredItems.filter(item => {
      if (item.status === 'completed' || item.status === 'cancelled') return false;
      const dueDate = item.due_date ? new Date(item.due_date) : new Date(item.scheduled_date);
      return dueDate < today;
    });
  }, [filteredItems]);

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: Date; items: ScheduleItem[] }[] = [];

    // Pad start
    for (let i = 0; i < firstDay.getDay(); i++) {
      const d = new Date(year, month, -firstDay.getDay() + i + 1);
      days.push({ date: d, items: [] });
    }

    // Days of month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().split('T')[0];
      const dayItems = filteredItems.filter(item => item.scheduled_date === dateStr);
      days.push({ date, items: dayItems });
    }

    // Pad end
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, items: [] });
    }

    return days;
  }, [currentMonth, filteredItems]);

  const getTypeInfo = (type: string) => ITEM_TYPES.find(t => t.value === type) || ITEM_TYPES[7];
  const getPriorityInfo = (priority: string) => PRIORITIES.find(p => p.value === priority) || PRIORITIES[1];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="sitesense" />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation variant="sitesense" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Scheduler</h1>
            <p className="text-gray-600 text-sm mt-1">
              Track permits, crews, milestones, inspections & deadlines
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Item
          </button>
        </div>

        {/* Alerts */}
        {overdueItems.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
              <span>⚠️</span>
              <span>{overdueItems.length} Overdue Item{overdueItems.length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-1">
              {overdueItems.slice(0, 3).map(item => (
                <div key={item.id} className="text-sm text-red-700 flex items-center gap-2">
                  <span>{getTypeInfo(item.item_type).icon}</span>
                  <span className="font-medium">{item.title}</span>
                  {item.job_name && <span className="text-red-500">• {item.job_name}</span>}
                </div>
              ))}
              {overdueItems.length > 3 && (
                <p className="text-sm text-red-600">+ {overdueItems.length - 3} more...</p>
              )}
            </div>
          </div>
        )}

        {/* Filters & View Toggle */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="all">All Types</option>
              {ITEM_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
            <select
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="all">All Jobs</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'calendar', label: 'Calendar' },
              { id: 'list', label: 'List' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id as any)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  view === v.id ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming View */}
        {view === 'upcoming' && (
          <div className="space-y-4">
            {upcomingItems.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <p>No upcoming items in the next 14 days.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Schedule something
                </button>
              </div>
            ) : (
              upcomingItems.map(item => {
                const typeInfo = getTypeInfo(item.item_type);
                const priorityInfo = getPriorityInfo(item.priority);
                const date = new Date(item.scheduled_date);
                const isItemToday = isToday(date);

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                      isItemToday ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${typeInfo.color} flex items-center justify-center text-white text-lg`}>
                          {typeInfo.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{item.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${priorityInfo.color}`}>
                              {priorityInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {typeInfo.label}
                            {item.job_name && <span> • {item.job_name}</span>}
                          </p>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-medium ${isItemToday ? 'text-blue-600' : 'text-gray-900'}`}>
                          {isItemToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateStatus(item.id, 'completed')}
                            className="text-xs text-green-600 hover:text-green-700"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => startEdit(item)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex items-center justify-between">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ←
              </button>
              <h2 className="text-lg font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                →
              </button>
            </div>
            <div className="grid grid-cols-7">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 border-b">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`min-h-[100px] p-1 border-b border-r ${
                    !isCurrentMonth(day.date) ? 'bg-gray-50' : ''
                  } ${isToday(day.date) ? 'bg-blue-50' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 ${
                    isToday(day.date) ? 'text-blue-600' : isCurrentMonth(day.date) ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {day.items.slice(0, 3).map(item => {
                      const typeInfo = getTypeInfo(item.item_type);
                      return (
                        <div
                          key={item.id}
                          onClick={() => startEdit(item)}
                          className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer ${typeInfo.color} text-white`}
                        >
                          {typeInfo.icon} {item.title}
                        </div>
                      );
                    })}
                    {day.items.length > 3 && (
                      <div className="text-xs text-gray-500 px-1">+{day.items.length - 3} more</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No scheduled items found.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map(item => {
                    const typeInfo = getTypeInfo(item.item_type);
                    const priorityInfo = getPriorityInfo(item.priority);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{item.title}</div>
                          {item.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white ${typeInfo.color}`}>
                            {typeInfo.icon} {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.job_name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(item.scheduled_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.status}
                            onChange={(e) => updateStatus(item.id, e.target.value as ScheduleItem['status'])}
                            className={`text-xs px-2 py-1 rounded border-0 ${
                              item.status === 'completed' ? 'bg-green-100 text-green-800' :
                              item.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => startEdit(item)} className="text-sm text-blue-600 hover:text-blue-700 mr-3">
                            Edit
                          </button>
                          <button onClick={() => deleteItem(item.id)} className="text-sm text-red-600 hover:text-red-700">
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingItem ? 'Edit Scheduled Item' : 'Add Scheduled Item'}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Building permit application"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={form.item_type}
                      onChange={(e) => setForm({ ...form, item_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {ITEM_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {PRIORITIES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job (Optional)</label>
                  <select
                    value={form.job_id}
                    onChange={(e) => setForm({ ...form, job_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No job linked</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date *</label>
                    <input
                      type="date"
                      value={form.scheduled_date}
                      onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <input
                    type="text"
                    value={form.assigned_to}
                    onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Person or crew responsible"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Internal notes..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
