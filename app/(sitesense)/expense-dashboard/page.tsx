'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

type Job = {
  id: string;
  name: string;
  client_name: string | null;
  status: string | null;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
};

type Expense = {
  id: string;
  amount: number;
  description: string;
  date: string;
  job_id: string | null;
  job_name: string | null;
  category_name: string | null;
};

type TimeEntry = {
  id: string;
  date: string;
  hours: number;
  hourly_rate: number | null;
  description: string | null;
  job_id: string | null;
  job_name: string | null;
};

type Todo = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  job_id: string | null;
};

type ScheduleItem = {
  id: string;
  title: string;
  item_type: string;
  scheduled_date: string;
  due_date: string | null;
  status: string;
  priority: string;
  job_name: string | null;
};

type Estimate = {
  id: string;
  title: string | null;
  client_name: string | null;
  total: number;
  status: string;
  created_at: string;
};

export default function ExpenseDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      void loadData();
    } else if (!authLoading && !user) {
      setLoading(false);
      setError('Please sign in to view your SiteSense dashboard.');
    }
  }, [authLoading, user]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, expensesRes, timeRes, todosRes, scheduleRes, estimatesRes] = await Promise.all([
        fetch(`/api/jobs?user_id=${user!.id}`),
        fetch(`/api/expenses?user_id=${user!.id}&limit=20`),
        fetch(`/api/time-entries?user_id=${user!.id}&limit=20`),
        fetch(`/api/todos?user_id=${user!.id}`),
        fetch(`/api/scheduler?user_id=${user!.id}`),
        fetch(`/api/estimates?user_id=${user!.id}`),
      ]);

      const [jobsData, expensesData, timeData, todosData, scheduleData, estimatesData] = await Promise.all([
        jobsRes.json(),
        expensesRes.json(),
        timeRes.json(),
        todosRes.json(),
        scheduleRes.json(),
        estimatesRes.json(),
      ]);

      if (jobsData.success) setJobs(jobsData.data || []);
      if (expensesData.success) {
        setExpenses((expensesData.data || []).map((e: any) => ({
          ...e,
          amount: Number(e.amount),
        })));
      }
      if (timeData.success) {
        setTimeEntries((timeData.data || []).map((t: any) => ({
          ...t,
          hours: Number(t.hours),
          hourly_rate: t.hourly_rate !== null ? Number(t.hourly_rate) : null,
        })));
      }
      if (todosData.success) setTodos(todosData.data || []);
      if (scheduleData.success) setScheduleItems(scheduleData.data || []);
      if (estimatesData.success) setEstimates(estimatesData.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  // ---- Derived stats ----
  const activeJobs = jobs.filter((j) => (j.status || 'active') === 'active');
  const plannedJobs = jobs.filter((j) => j.status === 'planned');
  const completedJobs = jobs.filter((j) => j.status === 'completed');

  // Time windows
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - 7);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  const hoursThisWeek = timeEntries
    .filter((t) => new Date(t.date) >= startOfWeek)
    .reduce((sum, t) => sum + t.hours, 0);

  const laborThisMonth = timeEntries
    .filter((t) => new Date(t.date) >= startOfMonth)
    .reduce((sum, t) => {
      if (!t.hourly_rate) return sum;
      return sum + t.hours * t.hourly_rate;
    }, 0);

  const expensesThisMonth = expenses
    .filter((e) => new Date(e.date) >= startOfMonth)
    .reduce((sum, e) => sum + e.amount, 0);

  const expensesLastMonth = expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d >= lastMonth && d <= endOfLastMonth;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const totalJobCostThisMonth = expensesThisMonth + laborThisMonth;

  // Growth calculations
  const expenseGrowth = expensesLastMonth > 0
    ? ((expensesThisMonth - expensesLastMonth) / expensesLastMonth * 100).toFixed(0)
    : '0';

  // Action Required items
  const overdueTodos = todos.filter(t =>
    t.status === 'pending' && t.due_date && new Date(t.due_date) < today
  );
  const urgentTodos = todos.filter(t =>
    t.status === 'pending' && t.priority === 'high'
  );
  const overdueSchedule = scheduleItems.filter(s =>
    s.status === 'pending' && s.scheduled_date && new Date(s.scheduled_date) < today
  );
  const pendingEstimates = estimates.filter(e => e.status === 'draft' || e.status === 'sent');
  const upcomingDeadlines = scheduleItems.filter(s => {
    if (s.status !== 'pending') return false;
    const schedDate = new Date(s.scheduled_date);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    return schedDate >= today && schedDate <= threeDaysFromNow;
  });

  const actionRequiredCount = overdueTodos.length + overdueSchedule.length + urgentTodos.length;

  // Recent activity (combined and sorted)
  const recentActivity = [
    ...expenses.slice(0, 5).map(e => ({
      type: 'expense' as const,
      id: e.id,
      title: e.description,
      subtitle: e.job_name || 'No job assigned',
      amount: e.amount,
      date: e.date,
      icon: '💰',
      color: 'text-red-400',
    })),
    ...timeEntries.slice(0, 5).map(t => ({
      type: 'time' as const,
      id: t.id,
      title: `${t.hours.toFixed(1)} hours logged`,
      subtitle: t.job_name || 'No job assigned',
      amount: t.hourly_rate ? t.hours * t.hourly_rate : null,
      date: t.date,
      icon: '⏱️',
      color: 'text-blue-400',
    })),
    ...todos.filter(t => t.status === 'completed').slice(0, 3).map(t => ({
      type: 'todo' as const,
      id: t.id,
      title: t.title,
      subtitle: 'Task completed',
      amount: null,
      date: todayStr,
      icon: '✅',
      color: 'text-green-400',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  const recentJobs = jobs.slice(0, 5);

  // ---- UI ----
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation variant="sitesense" />
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-300 text-sm">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation variant="sitesense" />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-red-300 text-sm">{error}</p>
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation variant="sitesense" />

      {/* Header with gradient */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 border-b border-blue-700/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!</h1>
              <p className="text-sm text-blue-200 mt-1">
                Here's what's happening with your business today.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/jobs"
                className="px-5 py-2.5 bg-white/10 backdrop-blur border border-white/20 text-white rounded-lg hover:bg-white/20 transition font-medium shadow-sm flex items-center gap-2 text-sm"
              >
                <span>📋</span> New Job
              </Link>
              <Link
                href="/estimates/new"
                className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold shadow-sm flex items-center gap-2 text-sm"
              >
                <span>📝</span> Create Estimate
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">

        {/* Action Required Banner */}
        {actionRequiredCount > 0 && (
          <section className="bg-gradient-to-r from-red-900/80 to-orange-900/80 rounded-xl border border-red-500/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <h2 className="font-bold text-white">Action Required</h2>
                  <p className="text-sm text-red-200">
                    {actionRequiredCount} item{actionRequiredCount !== 1 ? 's' : ''} need{actionRequiredCount === 1 ? 's' : ''} your attention
                  </p>
                </div>
              </div>
              <Link
                href="/todos"
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition"
              >
                View All
              </Link>
            </div>

            {/* Action items list */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {overdueTodos.slice(0, 2).map(todo => (
                <div key={todo.id} className="bg-black/20 rounded-lg p-3 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400">🔴</span>
                    <div>
                      <p className="text-sm font-medium text-white">{todo.title}</p>
                      <p className="text-xs text-red-300">Overdue task</p>
                    </div>
                  </div>
                </div>
              ))}
              {overdueSchedule.slice(0, 2).map(item => (
                <div key={item.id} className="bg-black/20 rounded-lg p-3 border border-orange-500/20">
                  <div className="flex items-start gap-2">
                    <span className="text-orange-400">📅</span>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-orange-300">Overdue {item.item_type}</p>
                    </div>
                  </div>
                </div>
              ))}
              {urgentTodos.slice(0, 2).map(todo => (
                <div key={todo.id} className="bg-black/20 rounded-lg p-3 border border-yellow-500/20">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">⚡</span>
                    <div>
                      <p className="text-sm font-medium text-white">{todo.title}</p>
                      <p className="text-xs text-yellow-300">High priority</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Stats Cards Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Jobs */}
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Active Jobs</p>
                <p className="mt-2 text-4xl font-bold text-white">{activeJobs.length}</p>
                <p className="mt-1 text-sm text-blue-200">
                  {plannedJobs.length > 0 && `+${plannedJobs.length} planned`}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <Link href="/jobs" className="text-xs text-blue-100 hover:text-white font-medium">
                View all jobs →
              </Link>
            </div>
          </div>

          {/* Hours This Week */}
          <div className="rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-violet-100 uppercase tracking-wider">Hours This Week</p>
                <p className="mt-2 text-4xl font-bold text-white">{hoursThisWeek.toFixed(1)}</p>
                <p className="mt-1 text-sm text-violet-200">
                  From time entries
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <Link href="/time-tracking" className="text-xs text-violet-100 hover:text-white font-medium">
                Log time →
              </Link>
            </div>
          </div>

          {/* Monthly Costs */}
          <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Monthly Costs</p>
                <p className="mt-2 text-4xl font-bold text-white">${totalJobCostThisMonth.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                <p className="mt-1 text-sm text-emerald-200 flex items-center gap-1">
                  {Number(expenseGrowth) > 0 ? (
                    <><span className="text-red-300">↑ {expenseGrowth}%</span> vs last month</>
                  ) : Number(expenseGrowth) < 0 ? (
                    <><span className="text-green-300">↓ {Math.abs(Number(expenseGrowth))}%</span> vs last month</>
                  ) : (
                    'Same as last month'
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <Link href="/expenses" className="text-xs text-emerald-100 hover:text-white font-medium">
                View expenses →
              </Link>
            </div>
          </div>

          {/* Pending Estimates */}
          <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-amber-100 uppercase tracking-wider">Pending Estimates</p>
                <p className="mt-2 text-4xl font-bold text-white">{pendingEstimates.length}</p>
                <p className="mt-1 text-sm text-amber-200">
                  ${pendingEstimates.reduce((sum, e) => sum + (e.total || 0), 0).toLocaleString()} total value
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <Link href="/estimates" className="text-xs text-amber-100 hover:text-white font-medium">
                View estimates →
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Link href="/jobs" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition flex items-center gap-2">
              <span>➕</span> New Job
            </Link>
            <Link href="/expenses" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition flex items-center gap-2">
              <span>💳</span> Add Expense
            </Link>
            <Link href="/time-tracking" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition flex items-center gap-2">
              <span>⏱️</span> Log Time
            </Link>
            <Link href="/todos" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition flex items-center gap-2">
              <span>✅</span> Add Task
            </Link>
            <Link href="/scheduler" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition flex items-center gap-2">
              <span>📅</span> Schedule Item
            </Link>
            <Link href="/contacts" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition flex items-center gap-2">
              <span>👤</span> Add Contact
            </Link>
          </div>
        </section>

        {/* Main Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs Table */}
          <div className="lg:col-span-2 rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
              <div>
                <h2 className="font-semibold text-white">Active Jobs</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeJobs.length} active, {completedJobs.length} completed
                </p>
              </div>
              <Link
                href="/jobs"
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
              >
                View All
              </Link>
            </div>

            {jobs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📋</span>
                </div>
                <p className="text-slate-300 mb-2">No jobs yet</p>
                <Link href="/jobs" className="text-blue-400 hover:text-blue-300 text-sm">
                  Create your first job →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/60 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-300 font-medium text-xs uppercase tracking-wider">Job</th>
                      <th className="px-4 py-3 text-left text-slate-300 font-medium text-xs uppercase tracking-wider">Client</th>
                      <th className="px-4 py-3 text-left text-slate-300 font-medium text-xs uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-medium text-xs uppercase tracking-wider">Cost (MTD)</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-medium text-xs uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {recentJobs.map((job) => {
                      const jobExpenses = expenses.filter(e => e.job_id === job.id && new Date(e.date) >= startOfMonth);
                      const jobTime = timeEntries.filter(t => t.job_id === job.id && new Date(t.date) >= startOfMonth);
                      const jobExpenseTotal = jobExpenses.reduce((sum, e) => sum + e.amount, 0);
                      const jobLaborTotal = jobTime.reduce((sum, t) => t.hourly_rate ? sum + t.hours * t.hourly_rate : sum, 0);
                      const jobTotal = jobExpenseTotal + jobLaborTotal;

                      return (
                        <tr key={job.id} className="hover:bg-slate-700/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-white">{job.name}</td>
                          <td className="px-4 py-3 text-slate-300">{job.client_name || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                              job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              job.status === 'planned' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {job.status || 'active'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-200 font-mono">
                            ${jobTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/jobs/${job.id}`} className="text-blue-400 hover:text-blue-300 text-xs font-medium">
                              Details →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Upcoming Deadlines */}
            {upcomingDeadlines.length > 0 && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20">
                <div className="px-4 py-3 border-b border-yellow-500/20 bg-yellow-900/30">
                  <h2 className="font-semibold text-yellow-200 text-sm flex items-center gap-2">
                    <span>⏰</span> Upcoming (3 days)
                  </h2>
                </div>
                <ul className="divide-y divide-yellow-500/10">
                  {upcomingDeadlines.slice(0, 4).map(item => (
                    <li key={item.id} className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-yellow-300 mt-0.5">
                        {item.item_type} • {new Date(item.scheduled_date).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent Activity */}
            <div className="rounded-xl border border-slate-700 bg-slate-800">
              <div className="px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
                <h2 className="font-semibold text-white text-sm">Recent Activity</h2>
              </div>
              {recentActivity.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">
                  No recent activity
                </div>
              ) : (
                <ul className="divide-y divide-slate-700">
                  {recentActivity.map((item, idx) => (
                    <li key={`${item.type}-${item.id}`} className="px-4 py-3 flex items-start gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.subtitle}</p>
                      </div>
                      {item.amount !== null && (
                        <span className={`text-sm font-medium ${item.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                          ${item.amount.toFixed(2)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Pending Tasks */}
            <div className="rounded-xl border border-slate-700 bg-slate-800">
              <div className="px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700 flex justify-between items-center">
                <h2 className="font-semibold text-white text-sm">Pending Tasks</h2>
                <span className="text-xs bg-slate-600 text-slate-200 px-2 py-0.5 rounded-full">
                  {todos.filter(t => t.status === 'pending').length}
                </span>
              </div>
              {todos.filter(t => t.status === 'pending').length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">
                  All caught up!
                </div>
              ) : (
                <ul className="divide-y divide-slate-700">
                  {todos.filter(t => t.status === 'pending').slice(0, 5).map(todo => (
                    <li key={todo.id} className="px-4 py-3 flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        todo.priority === 'high' ? 'bg-red-500' :
                        todo.priority === 'medium' ? 'bg-yellow-500' : 'bg-slate-500'
                      }`}></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{todo.title}</p>
                        {todo.due_date && (
                          <p className={`text-xs ${new Date(todo.due_date) < today ? 'text-red-400' : 'text-slate-400'}`}>
                            Due: {new Date(todo.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="px-4 py-2 border-t border-slate-700">
                <Link href="/todos" className="text-xs text-blue-400 hover:text-blue-300">
                  View all tasks →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
