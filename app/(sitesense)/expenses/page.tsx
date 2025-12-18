'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

type Job = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  amount: number;
  description: string;
  date: string;
  vendor: string | null;
  is_business: boolean;
  payment_method: string | null;
  notes: string | null;
  category_id: string | null;
  job_id: string | null;
  receipt_url: string | null;
  category: Category | null;
  job_name: string | null;
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    is_business: true,
    payment_method: 'credit',
    notes: '',
    category_id: '',
    job_id: '',
    receipt_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // OCR state
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (user?.id) {
      void loadData();
    }
  }, [user?.id]);

  async function loadData() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [expensesRes, categoriesRes, jobsRes] = await Promise.all([
        fetch(`/api/expenses?user_id=${user.id}`),
        fetch(`/api/categories?user_id=${user.id}`),
        fetch(`/api/jobs?user_id=${user.id}`),
      ]);

      const [expensesData, categoriesData, jobsData] = await Promise.all([
        expensesRes.json(),
        categoriesRes.json(),
        jobsRes.json(),
      ]);

      if (expensesData.success) setExpenses(expensesData.data || []);
      if (categoriesData.success) setCategories(categoriesData.data || []);
      if (jobsData.success) setJobs(jobsData.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleScanReceipt(file: File) {
    setScanning(true);
    setScanError(null);

    try {
      const formData = new FormData();
      formData.append('receipt', file);

      const res = await fetch('/api/ocr-receipt', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to scan receipt');
      }

      // Populate form with scanned data
      const scanned = data.data;
      setFormData(prev => ({
        ...prev,
        amount: scanned.amount?.toString() || prev.amount,
        description: scanned.description || prev.description,
        vendor: scanned.vendor || prev.vendor,
        date: scanned.date || prev.date,
        payment_method: scanned.payment_method || prev.payment_method,
      }));

      setShowForm(true);
    } catch (err: any) {
      setScanError(err.message || 'Failed to scan receipt');
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        user_id: user.id,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id || null,
        job_id: formData.job_id || null,
      };

      const res = await fetch('/api/expenses', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await loadData();
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return;

    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleEdit(expense: Expense) {
    setFormData({
      amount: expense.amount.toString(),
      description: expense.description,
      date: expense.date,
      vendor: expense.vendor || '',
      is_business: expense.is_business,
      payment_method: expense.payment_method || 'credit',
      notes: expense.notes || '',
      category_id: expense.category_id || '',
      job_id: expense.job_id || '',
      receipt_url: expense.receipt_url || '',
    });
    setEditingId(expense.id);
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      is_business: true,
      payment_method: 'credit',
      notes: '',
      category_id: '',
      job_id: '',
      receipt_url: '',
    });
    setEditingId(null);
    setShowForm(false);
  }

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const businessTotal = expenses.filter(e => e.is_business).reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading expenses...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
            <p className="text-sm text-gray-600 mt-1">
              {expenses.length} expenses · ${totalAmount.toFixed(2)} total · ${businessTotal.toFixed(2)} business
            </p>
          </div>
          <div className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleScanReceipt(file);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50"
            >
              {scanning ? 'Scanning...' : 'Scan Receipt'}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              + Add Expense
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {scanError && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
            {scanError}
            <button onClick={() => setScanError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingId ? 'Edit Expense' : 'New Expense'}
              </h2>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vendor</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Store name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What was purchased?"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Job (optional)</label>
                  <select
                    value={formData.job_id}
                    onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No job</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="credit">Credit Card</option>
                    <option value="debit">Debit Card</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <div className="flex items-center gap-6 mt-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={formData.is_business}
                      onChange={() => setFormData({ ...formData, is_business: true })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Business</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!formData.is_business}
                      onChange={() => setFormData({ ...formData, is_business: false })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Personal</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Expenses List */}
        {expenses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">💰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
            <p className="text-sm text-gray-500">
              Add your first expense or scan a receipt to get started.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Description</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Vendor</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Category</th>
                  <th className="px-4 py-3 text-left text-gray-600 font-medium">Job</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-medium">Amount</th>
                  <th className="px-4 py-3 text-center text-gray-600 font-medium">Type</th>
                  <th className="px-4 py-3 text-right text-gray-600 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense, idx) => (
                  <tr
                    key={expense.id}
                    className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50`}
                  >
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {expense.description}
                      {expense.receipt_url && (
                        <span className="ml-2 text-purple-600" title="Has receipt">📎</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{expense.vendor || '—'}</td>
                    <td className="px-4 py-3">
                      {expense.category ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                          style={{ backgroundColor: expense.category.color + '20', color: expense.category.color }}
                        >
                          {expense.category.icon} {expense.category.name}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{expense.job_name || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">${expense.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        expense.is_business
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {expense.is_business ? 'Business' : 'Personal'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-blue-600 hover:text-blue-700 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-700"
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
