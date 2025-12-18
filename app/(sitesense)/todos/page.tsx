'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

type Todo = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  due_time: string | null;
  reminder_date: string | null;
  reminder_time: string | null;
  job_id: string | null;
  job_name: string | null;
  completed_at: string | null;
  created_at: string;
};

type Job = {
  id: string;
  name: string;
};

function TodosPageContent() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [jobId, setJobId] = useState('');

  useEffect(() => {
    if (user) {
      void loadData();
    }
  }, [user]);

  // Check for upcoming reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      todos.forEach(todo => {
        if (todo.status === 'pending' && todo.reminder_date && todo.reminder_time) {
          const reminderDateTime = new Date(`${todo.reminder_date}T${todo.reminder_time}`);
          const diff = reminderDateTime.getTime() - now.getTime();
          // Alert if reminder is within the next minute and hasn't passed
          if (diff > 0 && diff < 60000) {
            if (Notification.permission === 'granted') {
              new Notification('SiteSense Reminder', {
                body: todo.title,
                icon: '/icons/icon-192x192.png',
              });
            }
          }
        }
      });
    };

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [todos]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Load todos
      const todoRes = await fetch(`/api/todos?user_id=${user?.id}`);
      const todoData = await todoRes.json();
      if (todoData.success) {
        setTodos(todoData.data || []);
      }

      // Load jobs for dropdown
      const jobRes = await fetch(`/api/jobs?user_id=${user?.id}`);
      const jobData = await jobRes.json();
      if (jobData.success) {
        setJobs(jobData.data || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setDueTime('');
    setReminderDate('');
    setReminderTime('');
    setJobId('');
    setEditingId(null);
    setShowForm(false);
  }

  function openEditForm(todo: Todo) {
    setTitle(todo.title);
    setDescription(todo.description || '');
    setPriority(todo.priority);
    setDueDate(todo.due_date || '');
    setDueTime(todo.due_time || '');
    setReminderDate(todo.reminder_date || '');
    setReminderTime(todo.reminder_time || '');
    setJobId(todo.job_id || '');
    setEditingId(todo.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setError(null);

    try {
      const payload = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
        due_time: dueTime || null,
        reminder_date: reminderDate || null,
        reminder_time: reminderTime || null,
        job_id: jobId || null,
      };

      const res = await fetch('/api/todos', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });

      const data = await res.json();

      if (data.success) {
        resetForm();
        await loadData();
      } else {
        setError(data.error || 'Failed to save task');
      }
    } catch (err) {
      console.error('Error saving task:', err);
      setError('Failed to save task');
    }
  }

  async function toggleComplete(todo: Todo) {
    try {
      const newStatus = todo.status === 'completed' ? 'pending' : 'completed';
      const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

      const res = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todo.id,
          status: newStatus,
          completed_at: completedAt,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  }

  async function deleteTodo(id: string) {
    if (!confirm('Delete this task?')) return;

    try {
      const res = await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'pending') return todo.status === 'pending';
    if (filter === 'completed') return todo.status === 'completed';
    return true;
  });

  // Group by date
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const overdue = filteredTodos.filter(t => t.due_date && t.due_date < today && t.status !== 'completed');
  const dueToday = filteredTodos.filter(t => t.due_date === today);
  const dueTomorrow = filteredTodos.filter(t => t.due_date === tomorrow);
  const upcoming = filteredTodos.filter(t => t.due_date && t.due_date > tomorrow);
  const noDueDate = filteredTodos.filter(t => !t.due_date);

  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    low: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  };

  function TodoItem({ todo }: { todo: Todo }) {
    return (
      <div
        className={`flex items-start gap-3 p-3 border dark:border-gray-700 rounded-lg ${
          todo.status === 'completed' ? 'opacity-60' : ''
        }`}
      >
        <button
          onClick={() => toggleComplete(todo)}
          className={`mt-1 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
            todo.status === 'completed'
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
          }`}
        >
          {todo.status === 'completed' && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`font-medium text-gray-900 dark:text-white ${todo.status === 'completed' ? 'line-through' : ''}`}>
            {todo.title}
          </p>
          {todo.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{todo.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${priorityColors[todo.priority]}`}>
              {todo.priority}
            </span>
            {todo.due_time && (
              <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {todo.due_time}
              </span>
            )}
            {todo.job_name && (
              <span className="inline-flex px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {todo.job_name}
              </span>
            )}
            {todo.reminder_date && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 00-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {todo.reminder_date}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => openEditForm(todo)}
            className="p-1.5 text-gray-400 hover:text-blue-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={() => deleteTodo(todo.id)}
            className="p-1.5 text-gray-400 hover:text-red-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  function TodoSection({ title, todos, color }: { title: string; todos: Todo[]; color: string }) {
    if (todos.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-2 ${color}`}>{title} ({todos.length})</h3>
        <div className="space-y-2">
          {todos.map(todo => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation variant="sitesense" />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600 dark:text-gray-300">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation variant="sitesense" />
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tasks & Reminders</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track your to-dos and set reminders
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Add Task Button */}
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingId ? 'Edit Task' : 'New Task'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="What needs to be done?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Additional details..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Due Time</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Reminder Date</label>
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Reminder Time</label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Link to Job</label>
                  <select
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">No job linked</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>{job.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  {editingId ? 'Update Task' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b dark:border-gray-700">
            <nav className="flex -mb-px">
              {(['all', 'pending', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-3 border-b-2 font-medium text-sm capitalize ${
                    filter === f
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {f} ({f === 'all' ? todos.length : todos.filter(t => t.status === f).length})
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4">
            {filteredTodos.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                {filter === 'all' ? 'No tasks yet. Add your first task above!' : `No ${filter} tasks.`}
              </p>
            ) : (
              <>
                <TodoSection title="Overdue" todos={overdue} color="text-red-600 dark:text-red-400" />
                <TodoSection title="Today" todos={dueToday} color="text-blue-600 dark:text-blue-400" />
                <TodoSection title="Tomorrow" todos={dueTomorrow} color="text-yellow-600 dark:text-yellow-400" />
                <TodoSection title="Upcoming" todos={upcoming} color="text-gray-600 dark:text-gray-400" />
                <TodoSection title="No Due Date" todos={noDueDate} color="text-gray-500 dark:text-gray-500" />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TodosPage() {
  return (
    <ProtectedRoute>
      <TodosPageContent />
    </ProtectedRoute>
  );
}
