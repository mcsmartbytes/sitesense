'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

type Tenant = {
  id: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  status: 'prospect' | 'applicant' | 'active' | 'past' | 'evicted';
};

export default function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    mobile: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    status: 'prospect',
    notes: '',
  });

  useEffect(() => {
    if (user?.id) loadTenants();
  }, [user?.id, filterStatus]);

  async function loadTenants() {
    setLoading(true);
    try {
      let url = `/api/properties/tenants?user_id=${user?.id}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setTenants(data.data || []);
    } catch (err) {
      console.error('Error loading tenants:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const payload = { user_id: user.id, ...formData };
      let res;
      if (editingTenant) {
        res = await fetch('/api/properties/tenants', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTenant.id, ...payload }),
        });
      } else {
        res = await fetch('/api/properties/tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setEditingTenant(null);
        resetForm();
        loadTenants();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error('Error saving tenant:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tenant?')) return;
    try {
      const res = await fetch(`/api/properties/tenants?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) loadTenants();
    } catch (err) {
      console.error('Error deleting tenant:', err);
    }
  }

  function resetForm() {
    setFormData({
      first_name: '',
      last_name: '',
      company_name: '',
      email: '',
      phone: '',
      mobile: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      status: 'prospect',
      notes: '',
    });
  }

  function openEdit(tenant: Tenant) {
    setEditingTenant(tenant);
    setFormData({
      first_name: tenant.first_name,
      last_name: tenant.last_name || '',
      company_name: tenant.company_name || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      mobile: tenant.mobile || '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      status: tenant.status,
      notes: '',
    });
    setShowForm(true);
  }

  const statusColors: Record<string, string> = {
    prospect: 'bg-gray-100 text-gray-700',
    applicant: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    past: 'bg-blue-100 text-blue-700',
    evicted: 'bg-red-100 text-red-700',
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
              <span className="text-gray-900">Tenants</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
          </div>
          <button
            onClick={() => { resetForm(); setEditingTenant(null); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Tenant
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Statuses</option>
            <option value="prospect">Prospect</option>
            <option value="applicant">Applicant</option>
            <option value="active">Active</option>
            <option value="past">Past</option>
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">Loading...</div>
        ) : tenants.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No tenants found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Company</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {tenant.first_name} {tenant.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tenant.company_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {tenant.email && <div>{tenant.email}</div>}
                      {tenant.phone && <div className="text-sm">{tenant.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[tenant.status]}`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(tenant)} className="text-blue-600 hover:text-blue-700 mr-3">Edit</button>
                      <button onClick={() => handleDelete(tenant.id)} className="text-red-600 hover:text-red-700">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">{editingTenant ? 'Edit Tenant' : 'Add Tenant'}</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input type="text" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="prospect">Prospect</option>
                    <option value="applicant">Applicant</option>
                    <option value="active">Active</option>
                    <option value="past">Past</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => { setShowForm(false); setEditingTenant(null); }} className="px-4 py-2 text-gray-600">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingTenant ? 'Save Changes' : 'Add Tenant'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
