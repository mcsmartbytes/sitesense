'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

type SOV = {
  id: string;
  job_id: string;
  job_name: string | null;
  estimate_id: string | null;
  estimate_po: string | null;
  name: string;
  status: string;
  version: number;
  total_contract_amount: number;
  notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  line_items: LineItem[];
};

type LineItem = {
  id: string;
  line_number: string | null;
  cost_code: string | null;
  cost_code_name: string | null;
  description: string;
  scheduled_value: number;
  approved_changes: number;
  revised_value: number;
  previous_billed: number;
  current_billed: number;
  total_billed: number;
  percent_complete: number;
  balance_to_finish: number;
  retainage_percent: number;
  retainage_held: number;
  sort_order: number;
  notes: string | null;
};

type CostCode = {
  id: string;
  code: string;
  name: string;
  division: string;
};

export default function SOVDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [sov, setSov] = useState<SOV | null>(null);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);

  const [itemForm, setItemForm] = useState({
    line_number: '',
    cost_code_id: '',
    description: '',
    scheduled_value: '',
    retainage_percent: '10',
    notes: '',
  });

  useEffect(() => {
    if (user?.id && id) {
      loadData();
    }
  }, [user?.id, id]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadSOV(), loadCostCodes()]);
    setLoading(false);
  }

  async function loadSOV() {
    try {
      const res = await fetch(`/api/sov?id=${id}`);
      const data = await res.json();
      if (data.success) {
        setSov(data.data);
      }
    } catch (err) {
      console.error('Failed to load SOV:', err);
    }
  }

  async function loadCostCodes() {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/cost-codes?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setCostCodes(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load cost codes:', err);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/sov/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_number: itemForm.line_number || null,
          cost_code_id: itemForm.cost_code_id || null,
          description: itemForm.description,
          scheduled_value: Number(itemForm.scheduled_value) || 0,
          retainage_percent: Number(itemForm.retainage_percent) || 10,
          notes: itemForm.notes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddItem(false);
        resetItemForm();
        loadSOV();
      } else {
        alert(data.error || 'Failed to add item');
      }
    } catch (err) {
      console.error('Error adding item:', err);
    }
  }

  async function updateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/sov/${id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: editingItem.id,
          line_number: itemForm.line_number || null,
          cost_code_id: itemForm.cost_code_id || null,
          description: itemForm.description,
          scheduled_value: Number(itemForm.scheduled_value) || 0,
          retainage_percent: Number(itemForm.retainage_percent) || 10,
          notes: itemForm.notes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingItem(null);
        resetItemForm();
        loadSOV();
      } else {
        alert(data.error || 'Failed to update item');
      }
    } catch (err) {
      console.error('Error updating item:', err);
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Delete this line item?')) return;
    try {
      const res = await fetch(`/api/sov/${id}/items?item_id=${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadSOV();
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  }

  async function updateStatus(status: string) {
    try {
      const res = await fetch('/api/sov', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, approved_by: status === 'approved' ? user?.id : null }),
      });
      const data = await res.json();
      if (data.success) {
        loadSOV();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  function resetItemForm() {
    setItemForm({
      line_number: '',
      cost_code_id: '',
      description: '',
      scheduled_value: '',
      retainage_percent: '10',
      notes: '',
    });
  }

  function openEditItem(item: LineItem) {
    setEditingItem(item);
    const cc = costCodes.find(c => c.code === item.cost_code);
    setItemForm({
      line_number: item.line_number || '',
      cost_code_id: cc?.id || '',
      description: item.description,
      scheduled_value: item.scheduled_value.toString(),
      retainage_percent: item.retainage_percent.toString(),
      notes: item.notes || '',
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'revised': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">Loading...</div>
        </main>
      </div>
    );
  }

  if (!sov) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            Schedule of Values not found
          </div>
        </main>
      </div>
    );
  }

  // Calculate totals
  const totalScheduled = sov.line_items.reduce((sum, item) => sum + item.scheduled_value, 0);
  const totalRevised = sov.line_items.reduce((sum, item) => sum + item.revised_value, 0);
  const totalBilled = sov.line_items.reduce((sum, item) => sum + item.total_billed, 0);
  const totalBalance = sov.line_items.reduce((sum, item) => sum + item.balance_to_finish, 0);
  const totalRetainage = sov.line_items.reduce((sum, item) => sum + item.retainage_held, 0);
  const overallPercent = totalRevised > 0 ? (totalBilled / totalRevised) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/sov" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            &larr; Back to Schedule of Values
          </Link>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sov.status)}`}>
                  {sov.status}
                </span>
                <span className="text-sm text-gray-500">v{sov.version}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{sov.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Job: <Link href={`/jobs/${sov.job_id}`} className="text-blue-600 hover:underline">{sov.job_name || 'Unknown'}</Link>
                {sov.estimate_po && <span className="ml-3">PO: {sov.estimate_po}</span>}
              </p>
            </div>
            <div className="flex gap-2">
              {sov.status === 'draft' && (
                <>
                  <button
                    onClick={() => setShowAddItem(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    + Add Line Item
                  </button>
                  <button
                    onClick={() => updateStatus('pending')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
                  >
                    Submit for Approval
                  </button>
                </>
              )}
              {sov.status === 'pending' && (
                <button
                  onClick={() => updateStatus('approved')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Approve SOV
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Contract Amount</div>
            <div className="text-xl font-bold text-gray-900">${totalScheduled.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Revised Total</div>
            <div className="text-xl font-bold text-gray-900">${totalRevised.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Billed</div>
            <div className="text-xl font-bold text-blue-600">${totalBilled.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Balance to Finish</div>
            <div className="text-xl font-bold text-gray-900">${totalBalance.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Retainage Held</div>
            <div className="text-xl font-bold text-orange-600">${totalRetainage.toLocaleString()}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Overall Progress</span>
            <span className="text-gray-600">{overallPercent.toFixed(1)}% Complete</span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${Math.min(overallPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Changes</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revised</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Billed</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">%</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  {sov.status === 'draft' && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sov.line_items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      No line items yet. Add items to build your Schedule of Values.
                    </td>
                  </tr>
                ) : (
                  sov.line_items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{item.line_number || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {item.cost_code ? (
                          <span className="font-mono text-gray-700">{item.cost_code}</span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        ${item.scheduled_value.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        {item.approved_changes !== 0 && (
                          <span className={item.approved_changes > 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.approved_changes > 0 ? '+' : ''}${item.approved_changes.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono font-medium">
                        ${item.revised_value.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-blue-600">
                        ${item.total_billed.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <div className="w-16 mx-auto">
                          <div className="text-xs text-gray-600 mb-1">{item.percent_complete.toFixed(0)}%</div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${Math.min(item.percent_complete, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono">
                        ${item.balance_to_finish.toLocaleString()}
                      </td>
                      {sov.status === 'draft' && (
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => openEditItem(item)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {sov.line_items.length > 0 && (
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm text-gray-900">TOTALS</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">${totalScheduled.toLocaleString()}</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-sm text-right font-mono">${totalRevised.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-blue-600">${totalBilled.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-center">{overallPercent.toFixed(0)}%</td>
                    <td className="px-4 py-3 text-sm text-right font-mono">${totalBalance.toLocaleString()}</td>
                    {sov.status === 'draft' && <td></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Add/Edit Item Modal */}
        {(showAddItem || editingItem) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingItem ? 'Edit Line Item' : 'Add Line Item'}
                </h2>
              </div>
              <form onSubmit={editingItem ? updateItem : addItem} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Line Number</label>
                    <input
                      type="text"
                      value={itemForm.line_number}
                      onChange={(e) => setItemForm({ ...itemForm, line_number: e.target.value })}
                      placeholder="Auto-assigned if blank"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost Code</label>
                    <select
                      value={itemForm.cost_code_id}
                      onChange={(e) => setItemForm({ ...itemForm, cost_code_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      {costCodes.map(cc => (
                        <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    required
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Value *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemForm.scheduled_value}
                      onChange={(e) => setItemForm({ ...itemForm, scheduled_value: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Retainage %</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={itemForm.retainage_percent}
                      onChange={(e) => setItemForm({ ...itemForm, retainage_percent: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={itemForm.notes}
                    onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => { setShowAddItem(false); setEditingItem(null); resetItemForm(); }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
