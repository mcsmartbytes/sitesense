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

type RecurringExpense = {
  id: string;
  description: string;
  amount: number;
  frequency: string;
  start_date: string;
  next_due_date: string;
  vendor: string | null;
  payment_method: string | null;
  is_business: boolean;
  is_active: boolean;
  notes: string | null;
  category_id: string | null;
  categories: Category | null;
};

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export default function RecurringExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [isBusiness, setIsBusiness] = useState(true);
  const [notes, setNotes] = useState('');

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

      // Load recurring expenses
      const res = await fetch(`/api/recurring-expenses?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data || []);
      } else {
        setError(data.error || 'Failed to load recurring expenses');
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setFrequency('monthly');
    setStartDate(new Date().toISOString().split('T')[0]);
    setVendor('');
    setCategoryId('');
    setPaymentMethod('credit');
    setIsBusiness(true);
    setNotes('');
    setShowForm(false);
  }

  function handleEdit(expense: RecurringExpense) {
    setEditingId(expense.id);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setFrequency(expense.frequency);
    setStartDate(expense.start_date);
    setVendor(expense.vendor || '');
    setCategoryId(expense.category_id || '');
    setPaymentMethod(expense.payment_method || 'credit');
    setIsBusiness(expense.is_business);
    setNotes(expense.notes || '');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !description.trim() || !amount) return;

    try {
      const payload = {
        user_id: user.id,
        description: description.trim(),
        amount: parseFloat(amount),
        frequency,
        start_date: startDate,
        vendor: vendor.trim() || null,
        category_id: categoryId || null,
        payment_method: paymentMethod,
        is_business: isBusiness,
        notes: notes.trim() || null,
      };

      let res;
      if (editingId) {
        res = await fetch('/api/recurring-expenses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        res = await fetch('/api/recurring-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        resetForm();
        await loadData();
      } else {
        setError(data.error || 'Failed to save recurring expense');
      }
    } catch (err: any) {
      console.error('Error saving:', err);
      setError(err.message || 'Failed to save recurring expense');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this recurring expense?')) return;

    try {
      const res = await fetch(`/api/recurring-expenses?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      } else {
        setError(data.error || 'Failed to delete');
      }
    } catch (err: any) {
      console.error('Error deleting:', err);
      setError(err.message || 'Failed to delete');
    }
  }

  async function handleToggleActive(expense: RecurringExpense) {
    try {
      const res = await fetch('/api/recurring-expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expense.id, is_active: !expense.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Error toggling:', err);
    }
  }

  const activeExpenses = expenses.filter(e => e.is_active);
  const inactiveExpenses = expenses.filter(e => !e.is_active);
  const monthlyTotal = activeExpenses.reduce((sum, e) => {
    const amt = e.amount;
    switch (e.frequency) {
      case 'weekly': return sum + amt * 4.33;
      case 'biweekly': return sum + amt * 2.17;
      case 'monthly': return sum + amt;
      case 'quarterly': return sum + amt / 3;
      case 'annually': return sum + amt / 12;
      default: return sum + amt;
    }
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading recurring expenses...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Recurring Expenses</h1>
            <p className="text-sm text-gray-600 mt-1">
              Estimated monthly: <span className="font-semibold">${monthlyTotal.toFixed(2)}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              + Add Recurring
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
              {editingId ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Office Rent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Frequency *</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {FREQUENCIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vendor</label>
                <input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Landlord LLC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="credit">Credit Card</option>
                  <option value="debit">Debit Card</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isBusiness}
                    onChange={(e) => setIsBusiness(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Business expense</span>
                </label>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
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
                  {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Active Recurring Expenses */}
        <section className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-4 py-3 border-b flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Active ({activeExpenses.length})</h2>
          </div>
          {activeExpenses.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              No active recurring expenses. Add one to start tracking.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Description</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Amount</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Frequency</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Next Due</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Category</th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeExpenses.map((exp, idx) => (
                    <tr key={exp.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {exp.description}
                        {exp.vendor && <span className="text-gray-500 text-xs ml-1">({exp.vendor})</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-700">${exp.amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-gray-700 capitalize">{exp.frequency}</td>
                      <td className="px-4 py-2 text-gray-700">
                        {new Date(exp.next_due_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {exp.categories?.name || '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleEdit(exp)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(exp)}
                          className="text-yellow-600 hover:text-yellow-800 text-sm font-medium mr-3"
                        >
                          Pause
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
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

        {/* Inactive/Paused Expenses */}
        {inactiveExpenses.length > 0 && (
          <section className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold text-gray-900">Paused ({inactiveExpenses.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Description</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Amount</th>
                    <th className="px-4 py-2 text-left text-gray-600 font-medium">Frequency</th>
                    <th className="px-4 py-2 text-right text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveExpenses.map((exp, idx) => (
                    <tr key={exp.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} opacity-60`}>
                      <td className="px-4 py-2 font-medium text-gray-900">{exp.description}</td>
                      <td className="px-4 py-2 text-gray-700">${exp.amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-gray-700 capitalize">{exp.frequency}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleToggleActive(exp)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium mr-3"
                        >
                          Resume
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
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
          </section>
        )}
      </main>
    </div>
  );
}
