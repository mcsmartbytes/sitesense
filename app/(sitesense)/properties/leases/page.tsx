'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

type Lease = {
  id: string;
  property_id: string;
  property_name: string | null;
  unit_id: string | null;
  unit_number: string | null;
  tenant_id: string;
  tenant_name: string | null;
  lease_type: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  security_deposit: number;
  status: string;
};

type Property = { id: string; name: string };
type Tenant = { id: string; first_name: string; last_name: string | null };
type Unit = { id: string; unit_number: string; property_id: string };

export default function LeasesPage() {
  const { user } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const [formData, setFormData] = useState({
    property_id: '',
    unit_id: '',
    tenant_id: '',
    lease_type: 'fixed',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    security_deposit: '',
    status: 'draft',
  });

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id, filterStatus]);

  async function loadData() {
    setLoading(true);
    try {
      const [leasesRes, propsRes, tenantsRes, unitsRes] = await Promise.all([
        fetch(`/api/properties/leases?user_id=${user?.id}${filterStatus ? `&status=${filterStatus}` : ''}`),
        fetch(`/api/jobs?user_id=${user?.id}`),
        fetch(`/api/properties/tenants?user_id=${user?.id}`),
        fetch(`/api/properties/units?user_id=${user?.id}`),
      ]);
      const [leasesData, propsData, tenantsData, unitsData] = await Promise.all([
        leasesRes.json(),
        propsRes.json(),
        tenantsRes.json(),
        unitsRes.json(),
      ]);
      if (leasesData.success) setLeases(leasesData.data || []);
      if (propsData.success) setProperties(propsData.data || []);
      if (tenantsData.success) setTenants(tenantsData.data || []);
      if (unitsData.success) setUnits(unitsData.data || []);
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
      const payload = {
        user_id: user.id,
        property_id: formData.property_id,
        unit_id: formData.unit_id || null,
        tenant_id: formData.tenant_id,
        lease_type: formData.lease_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        monthly_rent: Number(formData.monthly_rent),
        security_deposit: formData.security_deposit ? Number(formData.security_deposit) : null,
        status: formData.status,
      };

      let res;
      if (editingLease) {
        res = await fetch('/api/properties/leases', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingLease.id, ...payload }),
        });
      } else {
        res = await fetch('/api/properties/leases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setEditingLease(null);
        resetForm();
        loadData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error('Error saving lease:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lease?')) return;
    try {
      const res = await fetch(`/api/properties/leases?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) loadData();
    } catch (err) {
      console.error('Error deleting lease:', err);
    }
  }

  function resetForm() {
    setFormData({
      property_id: '',
      unit_id: '',
      tenant_id: '',
      lease_type: 'fixed',
      start_date: '',
      end_date: '',
      monthly_rent: '',
      security_deposit: '',
      status: 'draft',
    });
  }

  function openEdit(lease: Lease) {
    setEditingLease(lease);
    setFormData({
      property_id: lease.property_id,
      unit_id: lease.unit_id || '',
      tenant_id: lease.tenant_id,
      lease_type: lease.lease_type,
      start_date: lease.start_date,
      end_date: lease.end_date || '',
      monthly_rent: lease.monthly_rent.toString(),
      security_deposit: lease.security_deposit?.toString() || '',
      status: lease.status,
    });
    setShowForm(true);
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    expired: 'bg-blue-100 text-blue-700',
    terminated: 'bg-red-100 text-red-700',
  };

  const filteredUnits = formData.property_id
    ? units.filter(u => u.property_id === formData.property_id)
    : units;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/properties" className="hover:text-blue-600">Properties</Link>
              <span>/</span>
              <span className="text-gray-900">Leases</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Leases</h1>
          </div>
          <button
            onClick={() => { resetForm(); setEditingLease(null); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Lease
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">Loading...</div>
        ) : leases.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No leases found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Tenant</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Property / Unit</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Term</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Rent</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leases.map((lease) => (
                  <tr key={lease.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{lease.tenant_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {lease.property_name || '-'}
                      {lease.unit_number && <span className="ml-2 text-sm text-gray-500">Unit {lease.unit_number}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {lease.start_date} - {lease.end_date || 'Ongoing'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">${lease.monthly_rent.toLocaleString()}/mo</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[lease.status]}`}>
                        {lease.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(lease)} className="text-blue-600 hover:text-blue-700 mr-3">Edit</button>
                      <button onClick={() => handleDelete(lease.id)} className="text-red-600 hover:text-red-700">Delete</button>
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
                <h2 className="text-xl font-bold text-gray-900">{editingLease ? 'Edit Lease' : 'New Lease'}</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                  <select value={formData.tenant_id} onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })} required className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select Tenant</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
                  <select value={formData.property_id} onChange={(e) => setFormData({ ...formData, property_id: e.target.value, unit_id: '' })} required className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select Property</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                {filteredUnits.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select value={formData.unit_id} onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">Select Unit</option>
                      {filteredUnits.map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent *</label>
                    <input type="number" value={formData.monthly_rent} onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })} required className="w-full px-3 py-2 border rounded-lg" placeholder="$" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit</label>
                    <input type="number" value={formData.security_deposit} onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="$" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => { setShowForm(false); setEditingLease(null); }} className="px-4 py-2 text-gray-600">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingLease ? 'Save Changes' : 'Create Lease'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
