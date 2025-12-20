'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

type Unit = {
  id: string;
  property_id: string;
  property_name: string;
  unit_number: string;
  unit_type: string | null;
  floor: number | null;
  square_footage: number;
  bedrooms: number | null;
  bathrooms: number | null;
  status: 'vacant' | 'occupied' | 'maintenance' | 'offline';
  tenant_name: string | null;
  market_rent: number;
  current_rent: number;
};

type Property = {
  id: string;
  name: string;
};

export default function UnitsPage() {
  const { user } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Filters
  const [filterProperty, setFilterProperty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    property_id: '',
    unit_number: '',
    unit_type: '',
    floor: '',
    square_footage: '',
    bedrooms: '',
    bathrooms: '',
    status: 'vacant',
    market_rent: '',
    current_rent: '',
    notes: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, filterProperty, filterStatus]);

  async function loadData() {
    setLoading(true);
    try {
      // Load properties (jobs that could be properties)
      const propsRes = await fetch(`/api/jobs?user_id=${user?.id}`);
      const propsData = await propsRes.json();
      if (propsData.success) {
        setProperties(propsData.data || []);
      }

      // Load units
      let url = `/api/properties/units?user_id=${user?.id}`;
      if (filterProperty) url += `&property_id=${filterProperty}`;
      if (filterStatus) url += `&status=${filterStatus}`;

      const unitsRes = await fetch(url);
      const unitsData = await unitsRes.json();
      if (unitsData.success) {
        setUnits(unitsData.data || []);
      }
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
        unit_number: formData.unit_number,
        unit_type: formData.unit_type || null,
        floor: formData.floor ? Number(formData.floor) : null,
        square_footage: formData.square_footage ? Number(formData.square_footage) : null,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : null,
        status: formData.status,
        market_rent: formData.market_rent ? Number(formData.market_rent) : null,
        current_rent: formData.current_rent ? Number(formData.current_rent) : null,
        notes: formData.notes || null,
      };

      let res;
      if (editingUnit) {
        res = await fetch('/api/properties/units', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingUnit.id, ...payload }),
        });
      } else {
        res = await fetch('/api/properties/units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setEditingUnit(null);
        resetForm();
        loadData();
      } else {
        alert(data.error || 'Failed to save unit');
      }
    } catch (err) {
      console.error('Error saving unit:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this unit?')) return;
    try {
      const res = await fetch(`/api/properties/units?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        alert(data.error || 'Failed to delete unit');
      }
    } catch (err) {
      console.error('Error deleting unit:', err);
    }
  }

  function resetForm() {
    setFormData({
      property_id: filterProperty || '',
      unit_number: '',
      unit_type: '',
      floor: '',
      square_footage: '',
      bedrooms: '',
      bathrooms: '',
      status: 'vacant',
      market_rent: '',
      current_rent: '',
      notes: '',
    });
  }

  function openEdit(unit: Unit) {
    setEditingUnit(unit);
    setFormData({
      property_id: unit.property_id,
      unit_number: unit.unit_number,
      unit_type: unit.unit_type || '',
      floor: unit.floor?.toString() || '',
      square_footage: unit.square_footage?.toString() || '',
      bedrooms: unit.bedrooms?.toString() || '',
      bathrooms: unit.bathrooms?.toString() || '',
      status: unit.status,
      market_rent: unit.market_rent?.toString() || '',
      current_rent: unit.current_rent?.toString() || '',
      notes: '',
    });
    setShowForm(true);
  }

  const statusColors: Record<string, string> = {
    vacant: 'bg-green-100 text-green-700',
    occupied: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-amber-100 text-amber-700',
    offline: 'bg-gray-100 text-gray-700',
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
              <span className="text-gray-900">Units</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Units</h1>
          </div>
          <button
            onClick={() => { resetForm(); setEditingUnit(null); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Unit
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Statuses</option>
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Units</div>
            <div className="text-2xl font-bold text-gray-900">{units.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Occupied</div>
            <div className="text-2xl font-bold text-blue-600">
              {units.filter(u => u.status === 'occupied').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Vacant</div>
            <div className="text-2xl font-bold text-green-600">
              {units.filter(u => u.status === 'vacant').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Occupancy Rate</div>
            <div className="text-2xl font-bold text-gray-900">
              {units.length > 0 ? Math.round((units.filter(u => u.status === 'occupied').length / units.length) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* Units List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">Loading units...</div>
        ) : units.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No units found. Add your first unit to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Unit</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Property</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Size</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Tenant</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Rent</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{unit.unit_number}</td>
                    <td className="px-4 py-3 text-gray-600">{unit.property_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{unit.unit_type || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {unit.square_footage > 0 ? `${unit.square_footage.toLocaleString()} sqft` : '-'}
                      {unit.bedrooms && <span className="ml-2">{unit.bedrooms}BR</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[unit.status]}`}>
                        {unit.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{unit.tenant_name || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      ${(unit.current_rent || unit.market_rent || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(unit)} className="text-blue-600 hover:text-blue-700 mr-3">Edit</button>
                      <button onClick={() => handleDelete(unit.id)} className="text-red-600 hover:text-red-700">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingUnit ? 'Edit Unit' : 'Add Unit'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
                  <select
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select Property</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number *</label>
                    <input
                      type="text"
                      value={formData.unit_number}
                      onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., 101, A, Suite 500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
                    <select
                      value={formData.unit_type}
                      onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select Type</option>
                      <option value="apartment">Apartment</option>
                      <option value="office">Office</option>
                      <option value="retail">Retail</option>
                      <option value="storage">Storage</option>
                      <option value="house">House</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sqft</label>
                    <input
                      type="number"
                      value={formData.square_footage}
                      onChange={(e) => setFormData({ ...formData, square_footage: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                    <input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Market Rent</label>
                    <input
                      type="number"
                      value={formData.market_rent}
                      onChange={(e) => setFormData({ ...formData, market_rent: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="$"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="vacant">Vacant</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => { setShowForm(false); setEditingUnit(null); }} className="px-4 py-2 text-gray-600">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    {editingUnit ? 'Save Changes' : 'Add Unit'}
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
