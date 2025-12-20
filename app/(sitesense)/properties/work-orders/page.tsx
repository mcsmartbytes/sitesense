'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

type WorkOrder = {
  id: string;
  work_order_number: string;
  property_id: string;
  property_name: string | null;
  unit_id: string | null;
  unit_number: string | null;
  tenant_name: string | null;
  title: string;
  description: string | null;
  category: string | null;
  priority: 'emergency' | 'urgent' | 'normal' | 'low';
  status: string;
  vendor_name: string | null;
  scheduled_date: string | null;
  created_at: string;
};

type Property = { id: string; name: string };

export default function WorkOrdersPage() {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const [formData, setFormData] = useState({
    property_id: '',
    title: '',
    description: '',
    category: '',
    priority: 'normal',
    access_instructions: '',
  });

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id, filterStatus, filterPriority]);

  async function loadData() {
    setLoading(true);
    try {
      let url = `/api/properties/work-orders?user_id=${user?.id}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterPriority) url += `&priority=${filterPriority}`;

      const [woRes, propsRes] = await Promise.all([
        fetch(url),
        fetch(`/api/jobs?user_id=${user?.id}`),
      ]);
      const [woData, propsData] = await Promise.all([woRes.json(), propsRes.json()]);
      if (woData.success) setWorkOrders(woData.data || []);
      if (propsData.success) setProperties(propsData.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const res = await fetch('/api/properties/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...formData }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setFormData({ property_id: '', title: '', description: '', category: '', priority: 'normal', access_instructions: '' });
        loadData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error('Error creating work order:', err);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch('/api/properties/work-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) loadData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this work order?')) return;
    try {
      const res = await fetch(`/api/properties/work-orders?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) loadData();
    } catch (err) {
      console.error('Error deleting work order:', err);
    }
  }

  const priorityColors: Record<string, string> = {
    emergency: 'bg-red-600 text-white',
    urgent: 'bg-orange-500 text-white',
    normal: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-700',
  };

  const statusColors: Record<string, string> = {
    new: 'bg-purple-100 text-purple-700',
    triaged: 'bg-yellow-100 text-yellow-700',
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
    pending_parts: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/properties" className="hover:text-blue-600">Properties</Link>
              <span>/</span>
              <span className="text-gray-900">Work Orders</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Work Order
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="triaged">Triaged</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="">All Priorities</option>
            <option value="emergency">Emergency</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Open</div>
            <div className="text-2xl font-bold text-gray-900">
              {workOrders.filter(wo => !['completed', 'cancelled'].includes(wo.status)).length}
            </div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 border border-red-100">
            <div className="text-sm text-red-600">Emergency</div>
            <div className="text-2xl font-bold text-red-600">
              {workOrders.filter(wo => wo.priority === 'emergency' && !['completed', 'cancelled'].includes(wo.status)).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">In Progress</div>
            <div className="text-2xl font-bold text-blue-600">
              {workOrders.filter(wo => wo.status === 'in_progress').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Completed Today</div>
            <div className="text-2xl font-bold text-green-600">
              {workOrders.filter(wo => wo.status === 'completed').length}
            </div>
          </div>
        </div>

        {/* Work Orders List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">Loading...</div>
        ) : workOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No work orders found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workOrders.map((wo) => (
              <div key={wo.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm text-gray-500">{wo.work_order_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[wo.priority]}`}>
                        {wo.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[wo.status]}`}>
                        {wo.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{wo.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{wo.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{wo.property_name}</span>
                      {wo.unit_number && <span>Unit {wo.unit_number}</span>}
                      {wo.tenant_name && <span>Reported by: {wo.tenant_name}</span>}
                      {wo.category && <span className="capitalize">{wo.category}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <select
                      value={wo.status}
                      onChange={(e) => updateStatus(wo.id, e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="new">New</option>
                      <option value="triaged">Triaged</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="pending_parts">Pending Parts</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button onClick={() => handleDelete(wo.id)} className="text-red-600 hover:text-red-700 text-sm">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Work Order Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">New Work Order</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
                  <select value={formData.property_id} onChange={(e) => setFormData({ ...formData, property_id: e.target.value })} required className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select Property</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" placeholder="Brief description of the issue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="Detailed description..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Category</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="hvac">HVAC</option>
                      <option value="appliance">Appliance</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Work Order</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
