'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';

type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

type Budget = {
  id: string;
  category_id: string;
  budget_amount: number;
  period: string;
  start_date: string;
  categories: Category | null;
};

const PERIODS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function BudgetsPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseTotals, setExpenseTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    if (user?.id) {
      void loadData();
    }
  }, [user?.id]);

  async function loadData() {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Load categories
      const catRes = await fetch(`/api/categories?user_id=${user.id}`);
      const catData = await catRes.json();
      if (catData.success) {
        setCategories(catData.data || []);
      }

      // Load budgets
      const budgetRes = await fetch(`/api/budgets?user_id=${user.id}`);
      const budgetData = await budgetRes.json();

      if (!budgetData.success) {
        throw new Error(budgetData.error || 'Failed to load budgets');
      }

      setBudgets(budgetData.data || []);

      // Calculate spending for current period per category
      await calculateExpenseTotals(budgetData.data || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }

  async function calculateExpenseTotals(budgetList: Budget[]) {
    if (!user?.id) return;

    const totals: Record<string, number> = {};

    for (const budget of budgetList) {
      const { startDate, endDate } = getPeriodDates(budget.period, budget.start_date);

      const res = await fetch(
        `/api/budgets/spending?user_id=${user.id}&category_id=${budget.category_id}&start_date=${startDate}&end_date=${endDate}`
      );
      const data = await res.json();

      if (data.success && data.data) {
        totals[budget.category_id] = data.data[budget.category_id] || 0;
      }
    }

    setExpenseTotals(totals);
  }

  function getPeriodDates(period: string, _startDate: string): { startDate: string; endDate: string } {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'weekly':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'yearly':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }

  function resetForm() {
    setEditingId(null);
    setCategoryId('');
    setBudgetAmount('');
    setPeriod('monthly');
    setShowForm(false);
  }

  function handleEdit(budget: Budget) {
    setEditingId(budget.id);
    setCategoryId(budget.category_id);
    setBudgetAmount(budget.budget_amount.toString());
    setPeriod(budget.period);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !categoryId || !budgetAmount) return;

    try {
      if (editingId) {
        const res = await fetch('/api/budgets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            category_id: categoryId,
            budget_amount: parseFloat(budgetAmount),
            period,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      } else {
        const res = await fetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            category_id: categoryId,
            budget_amount: parseFloat(budgetAmount),
            period,
            start_date: new Date().toISOString().split('T')[0],
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      console.error('Error saving budget:', err);
      setError(err.message || 'Failed to save budget');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this budget?')) return;

    try {
      const res = await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting:', err);
      setError(err.message || 'Failed to delete budget');
    }
  }

  function getProgressColor(spent: number, budget: number): string {
    const percent = (spent / budget) * 100;
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  function getStatusBadge(spent: number, budget: number) {
    const percent = (spent / budget) * 100;
    if (percent >= 100) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Over Budget</span>;
    }
    if (percent >= 80) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Near Limit</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">On Track</span>;
  }

  // Categories that don't have a budget yet
  const availableCategories = categories.filter(
    c => !budgets.some(b => b.category_id === c.id) || editingId
  );

  const totalBudgeted = budgets.reduce((sum, b) => sum + Number(b.budget_amount), 0);
  const totalSpent = Object.values(expenseTotals).reduce((sum, t) => sum + t, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading budgets...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
            <p className="text-sm text-gray-600 mt-1">
              Total budgeted: <span className="font-semibold">${totalBudgeted.toFixed(2)}</span>
              {' · '}
              Spent: <span className="font-semibold">${totalSpent.toFixed(2)}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              + Add Budget
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

        {/* Add/Edit Form */}
        {showForm && (
          <section className="bg-white rounded-lg shadow p-5 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Budget' : 'Create Budget'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {(editingId ? categories : availableCategories).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Budget Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {PERIODS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
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
                  {editingId ? 'Update' : 'Create Budget'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Budget Cards */}
        {budgets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-500">
            No budgets set up yet. Create a budget to start tracking spending limits.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map(budget => {
              const spent = expenseTotals[budget.category_id] || 0;
              const budgetAmt = Number(budget.budget_amount);
              const percent = Math.min((spent / budgetAmt) * 100, 100);
              const remaining = budgetAmt - spent;

              return (
                <div key={budget.id} className="bg-white rounded-lg shadow p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {budget.categories?.name || 'Unknown Category'}
                      </h3>
                      <p className="text-xs text-gray-500 capitalize">{budget.period}</p>
                    </div>
                    {getStatusBadge(spent, budgetAmt)}
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">${spent.toFixed(2)} spent</span>
                      <span className="text-gray-600">${budgetAmt.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${getProgressColor(spent, budgetAmt)}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {remaining >= 0 ? `$${remaining.toFixed(2)} remaining` : `$${Math.abs(remaining).toFixed(2)} over`}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(budget)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
