'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

type Item = {
  id: string;
  description: string;
  qty: string;
  unit: string;
  unit_price: string;
  is_optional: boolean;
  section_id?: string | null;
  isNew?: boolean;
};

type Section = {
  id: string;
  name: string;
  description: string | null;
  cost_code: string | null;
  sort_order: number;
  isNew?: boolean;
};

type Allowance = {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  status: string;
  notes: string | null;
  isNew?: boolean;
};

type Alternate = {
  id: string;
  alternate_number: string | null;
  name: string;
  description: string | null;
  type: 'add' | 'deduct';
  amount: number;
  status: string;
  notes: string | null;
  isNew?: boolean;
};

type Estimate = {
  id: string;
  job_id: string | null;
  title: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  project_address: string | null;
  estimate_date: string | null;
  valid_until: string | null;
  po_number: string | null;
  payment_terms: string | null;
  scope_of_work: string | null;
  notes: string | null;
  terms_and_conditions: string | null;
  subtotal: number;
  discount_type: string;
  discount_value: number;
  tax_rate: number;
  total: number;
  status: string;
  job_name?: string | null;
};

type Tab = 'items' | 'allowances' | 'alternates';

export default function EditEstimatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('items');

  // Estimate header fields
  const [estimateTitle, setEstimateTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [projectAddress, setProjectAddress] = useState('');

  // Estimate details
  const [estimateDate, setEstimateDate] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Due upon completion');

  // Scope and notes
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  // Sections, items, allowances, alternates
  const [sections, setSections] = useState<Section[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [alternates, setAlternates] = useState<Alternate[]>([]);

  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
  const [deletedSectionIds, setDeletedSectionIds] = useState<string[]>([]);
  const [deletedAllowanceIds, setDeletedAllowanceIds] = useState<string[]>([]);
  const [deletedAlternateIds, setDeletedAlternateIds] = useState<string[]>([]);

  // Pricing
  const [taxRate, setTaxRate] = useState('0');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('0');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user && id) {
      void loadEstimate();
    }
  }, [id, authLoading, user]);

  async function loadEstimate() {
    setLoading(true);
    try {
      // Fetch estimate
      const estRes = await fetch(`/api/estimates/${id}`);
      const estData = await estRes.json();
      if (!estData.success || !estData.data) {
        alert('Estimate not found');
        router.push('/estimates');
        return;
      }

      const est = estData.data;
      setEstimate(est);

      // Populate form fields
      setEstimateTitle(est.title || '');
      setClientName(est.client_name || '');
      setClientEmail(est.client_email || '');
      setClientPhone(est.client_phone || '');
      setClientAddress(est.client_address || '');
      setProjectAddress(est.project_address || '');
      setEstimateDate(est.estimate_date || '');
      setExpiresAt(est.valid_until || '');
      setPoNumber(est.po_number || '');
      setPaymentTerms(est.payment_terms || 'Due upon completion');
      setScopeOfWork(est.scope_of_work || '');
      setNotes(est.notes || '');
      setTermsAndConditions(est.terms_and_conditions || '');
      setTaxRate(String(est.tax_rate || 0));
      setDiscountType(est.discount_type === 'fixed' ? 'fixed' : 'percent');
      setDiscountValue(String(est.discount_value || 0));

      // Fetch items, sections, allowances, alternates in parallel
      const [itemsRes, sectionsRes, allowancesRes, alternatesRes] = await Promise.all([
        fetch(`/api/estimates/${id}/items`),
        fetch(`/api/estimates/${id}/sections`),
        fetch(`/api/estimates/${id}/allowances`),
        fetch(`/api/estimates/${id}/alternates`),
      ]);

      const [itemsData, sectionsData, allowancesData, alternatesData] = await Promise.all([
        itemsRes.json(),
        sectionsRes.json(),
        allowancesRes.json(),
        alternatesRes.json(),
      ]);

      if (itemsData.success && itemsData.data) {
        setItems(itemsData.data.map((i: any) => ({
          id: i.id,
          description: i.description || '',
          qty: String(i.quantity || 1),
          unit: i.unit || 'each',
          unit_price: String(i.unit_price || 0),
          is_optional: Boolean(i.is_optional),
          section_id: i.section_id || null,
          isNew: false,
        })));
      }

      if (sectionsData.success && sectionsData.data) {
        setSections(sectionsData.data.map((s: any) => ({
          ...s,
          isNew: false,
        })));
      }

      if (allowancesData.success && allowancesData.data) {
        setAllowances(allowancesData.data.map((a: any) => ({
          ...a,
          amount: Number(a.amount),
          isNew: false,
        })));
      }

      if (alternatesData.success && alternatesData.data) {
        setAlternates(alternatesData.data.map((a: any) => ({
          ...a,
          amount: Number(a.amount),
          isNew: false,
        })));
      }
    } catch (error) {
      console.error('Error loading estimate:', error);
      alert('Error loading estimate');
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    const requiredSubtotal = items
      .filter(it => !it.is_optional)
      .reduce((s, it) => s + (parseFloat(it.qty || '0') * parseFloat(it.unit_price || '0')), 0);

    const optionalSubtotal = items
      .filter(it => it.is_optional)
      .reduce((s, it) => s + (parseFloat(it.qty || '0') * parseFloat(it.unit_price || '0')), 0);

    const allowancesTotal = allowances.reduce((s, a) => s + a.amount, 0);

    const acceptedAlternatesTotal = alternates
      .filter(a => a.status === 'accepted')
      .reduce((s, a) => a.type === 'add' ? s + a.amount : s - a.amount, 0);

    const subtotal = requiredSubtotal + allowancesTotal;

    const discount = discountType === 'percent'
      ? subtotal * (parseFloat(discountValue || '0') / 100)
      : parseFloat(discountValue || '0');

    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (parseFloat(taxRate || '0') / 100);
    const total = afterDiscount + tax + acceptedAlternatesTotal;

    return { requiredSubtotal, optionalSubtotal, allowancesTotal, acceptedAlternatesTotal, subtotal, discount, tax, total };
  }, [items, allowances, alternates, taxRate, discountType, discountValue]);

  // Item functions
  function updateItem(itemId: string, patch: Partial<Item>) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...patch } : i));
  }

  function addItem(isOptional = false, sectionId?: string) {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      description: '',
      qty: '1',
      unit: 'each',
      unit_price: '0',
      is_optional: isOptional,
      section_id: sectionId || null,
      isNew: true,
    }]);
  }

  function removeItem(itemId: string) {
    const item = items.find(i => i.id === itemId);
    if (item && !item.isNew) {
      setDeletedItemIds(prev => [...prev, itemId]);
    }
    setItems(prev => prev.filter(i => i.id !== itemId));
  }

  // Section functions
  function addSection() {
    setSections(prev => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      description: null,
      cost_code: null,
      sort_order: prev.length,
      isNew: true,
    }]);
  }

  function updateSection(sectionId: string, patch: Partial<Section>) {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, ...patch } : s));
  }

  function removeSection(sectionId: string) {
    const section = sections.find(s => s.id === sectionId);
    if (section && !section.isNew) {
      setDeletedSectionIds(prev => [...prev, sectionId]);
    }
    setSections(prev => prev.filter(s => s.id !== sectionId));
    // Move items in this section to unsectioned
    setItems(prev => prev.map(i => i.section_id === sectionId ? { ...i, section_id: null } : i));
  }

  // Allowance functions
  function addAllowance() {
    setAllowances(prev => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      description: null,
      amount: 0,
      status: 'pending',
      notes: null,
      isNew: true,
    }]);
  }

  function updateAllowance(allowanceId: string, patch: Partial<Allowance>) {
    setAllowances(prev => prev.map(a => a.id === allowanceId ? { ...a, ...patch } : a));
  }

  function removeAllowance(allowanceId: string) {
    const allowance = allowances.find(a => a.id === allowanceId);
    if (allowance && !allowance.isNew) {
      setDeletedAllowanceIds(prev => [...prev, allowanceId]);
    }
    setAllowances(prev => prev.filter(a => a.id !== allowanceId));
  }

  // Alternate functions
  function addAlternate(type: 'add' | 'deduct') {
    setAlternates(prev => [...prev, {
      id: crypto.randomUUID(),
      alternate_number: null,
      name: '',
      description: null,
      type,
      amount: 0,
      status: 'proposed',
      notes: null,
      isNew: true,
    }]);
  }

  function updateAlternate(alternateId: string, patch: Partial<Alternate>) {
    setAlternates(prev => prev.map(a => a.id === alternateId ? { ...a, ...patch } : a));
  }

  function removeAlternate(alternateId: string) {
    const alternate = alternates.find(a => a.id === alternateId);
    if (alternate && !alternate.isNew) {
      setDeletedAlternateIds(prev => [...prev, alternateId]);
    }
    setAlternates(prev => prev.filter(a => a.id !== alternateId));
  }

  async function handleSave() {
    if (!user || !estimate) {
      alert('Please sign in');
      return;
    }

    setSaving(true);
    try {
      // Update estimate
      await fetch(`/api/estimates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: estimateTitle || null,
          client_name: clientName || null,
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
          client_address: clientAddress || null,
          project_address: projectAddress || null,
          estimate_date: estimateDate || null,
          valid_until: expiresAt || null,
          po_number: poNumber || null,
          payment_terms: paymentTerms || null,
          scope_of_work: scopeOfWork || null,
          notes: notes || null,
          terms_and_conditions: termsAndConditions || null,
          subtotal: totals.subtotal,
          discount_type: discountType,
          discount_value: parseFloat(discountValue || '0'),
          discount_amount: totals.discount,
          tax_rate: parseFloat(taxRate || '0'),
          tax_amount: totals.tax,
          total: totals.total,
        })
      });

      // Delete removed sections
      for (const sectionId of deletedSectionIds) {
        await fetch(`/api/estimates/${id}/sections?id=${sectionId}`, { method: 'DELETE' });
      }

      // Save sections
      for (const section of sections) {
        if (section.isNew) {
          await fetch(`/api/estimates/${id}/sections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: section.name,
              description: section.description,
              cost_code: section.cost_code,
              sort_order: section.sort_order,
            }),
          });
        } else {
          await fetch(`/api/estimates/${id}/sections`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: section.id,
              name: section.name,
              description: section.description,
              cost_code: section.cost_code,
              sort_order: section.sort_order,
            }),
          });
        }
      }

      // Delete removed items
      for (const itemId of deletedItemIds) {
        await fetch(`/api/estimates/${id}/items?id=${itemId}`, { method: 'DELETE' });
      }

      // Save items
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        if (item.isNew) {
          await fetch(`/api/estimates/${id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: [{
                description: item.description,
                quantity: parseFloat(item.qty || '0'),
                unit: item.unit || null,
                unit_price: parseFloat(item.unit_price || '0'),
                is_optional: item.is_optional,
                sort_order: idx,
              }]
            })
          });
        } else {
          await fetch(`/api/estimates/${id}/items`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: item.id,
              description: item.description,
              quantity: parseFloat(item.qty || '0'),
              unit: item.unit || null,
              unit_price: parseFloat(item.unit_price || '0'),
              is_optional: item.is_optional,
              sort_order: idx,
            })
          });
        }
      }

      // Delete removed allowances
      for (const allowanceId of deletedAllowanceIds) {
        await fetch(`/api/estimates/${id}/allowances?id=${allowanceId}`, { method: 'DELETE' });
      }

      // Save allowances
      for (const allowance of allowances) {
        if (allowance.isNew) {
          await fetch(`/api/estimates/${id}/allowances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: allowance.name,
              description: allowance.description,
              amount: allowance.amount,
              notes: allowance.notes,
            }),
          });
        } else {
          await fetch(`/api/estimates/${id}/allowances`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: allowance.id,
              name: allowance.name,
              description: allowance.description,
              amount: allowance.amount,
              status: allowance.status,
              notes: allowance.notes,
            }),
          });
        }
      }

      // Delete removed alternates
      for (const alternateId of deletedAlternateIds) {
        await fetch(`/api/estimates/${id}/alternates?id=${alternateId}`, { method: 'DELETE' });
      }

      // Save alternates
      for (const alternate of alternates) {
        if (alternate.isNew) {
          await fetch(`/api/estimates/${id}/alternates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: alternate.name,
              description: alternate.description,
              type: alternate.type,
              amount: alternate.amount,
              notes: alternate.notes,
            }),
          });
        } else {
          await fetch(`/api/estimates/${id}/alternates`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: alternate.id,
              name: alternate.name,
              description: alternate.description,
              type: alternate.type,
              amount: alternate.amount,
              status: alternate.status,
              notes: alternate.notes,
            }),
          });
        }
      }

      router.push(`/estimates/${id}`);
    } catch (err: any) {
      alert('Failed to save estimate: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="sitesense" />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="sitesense" />
        <div className="flex items-center justify-center py-24">
          <p className="text-red-600">Estimate not found</p>
        </div>
      </div>
    );
  }

  const requiredItems = items.filter(it => !it.is_optional);
  const optionalItems = items.filter(it => it.is_optional);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation variant="sitesense" />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Estimate</h1>
              {estimate.job_name && <p className="text-sm text-gray-500">Job: {estimate.job_name}</p>}
            </div>
          </div>
          <Link
            href={`/estimates/${id}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Estimate
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Client Info */}
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimate Title</label>
                <input
                  type="text"
                  value={estimateTitle}
                  onChange={(e) => setEstimateTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Kitchen Remodel Estimate"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="John Smith" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="(555) 123-4567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Address</label>
                  <input type="text" value={projectAddress} onChange={(e) => setProjectAddress(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="123 Main St" />
                </div>
              </div>
            </div>

            {/* Scope of Work */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Scope of Work</label>
              <textarea
                value={scopeOfWork}
                onChange={(e) => setScopeOfWork(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Describe the work to be performed..."
              />
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="flex border-b">
                {[
                  { id: 'items', label: 'Line Items', count: items.length },
                  { id: 'allowances', label: 'Allowances', count: allowances.length },
                  { id: 'alternates', label: 'Alternates', count: alternates.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Line Items Tab */}
              {activeTab === 'items' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900">Line Items</h3>
                    <div className="flex gap-2">
                      <button onClick={() => addItem(false)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
                      <button onClick={() => addItem(true)} className="text-sm text-amber-600 hover:text-amber-700 font-medium">+ Add Optional</button>
                    </div>
                  </div>

                  {requiredItems.length === 0 && optionalItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No line items yet. Click "Add Item" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Required Items */}
                      {requiredItems.length > 0 && (
                        <div className="space-y-2">
                          {requiredItems.map((it) => {
                            const lineTotal = parseFloat(it.qty || '0') * parseFloat(it.unit_price || '0');
                            return (
                              <div key={it.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded-lg">
                                <input
                                  value={it.description}
                                  onChange={(e) => updateItem(it.id, { description: e.target.value })}
                                  className="col-span-5 px-2 py-1.5 border rounded text-sm"
                                  placeholder="Description"
                                />
                                <input
                                  type="number"
                                  value={it.qty}
                                  onChange={(e) => updateItem(it.id, { qty: e.target.value })}
                                  className="col-span-2 px-2 py-1.5 border rounded text-sm"
                                  placeholder="Qty"
                                />
                                <input
                                  type="number"
                                  value={it.unit_price}
                                  onChange={(e) => updateItem(it.id, { unit_price: e.target.value })}
                                  className="col-span-2 px-2 py-1.5 border rounded text-sm"
                                  placeholder="Price"
                                />
                                <div className="col-span-2 text-right text-sm font-medium">${lineTotal.toFixed(2)}</div>
                                <button onClick={() => removeItem(it.id)} className="col-span-1 text-red-500 hover:text-red-600">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Optional Items */}
                      {optionalItems.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="text-sm font-medium text-amber-700 mb-2">Optional Add-Ons</h4>
                          <div className="space-y-2">
                            {optionalItems.map((it) => {
                              const lineTotal = parseFloat(it.qty || '0') * parseFloat(it.unit_price || '0');
                              return (
                                <div key={it.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                                  <input
                                    value={it.description}
                                    onChange={(e) => updateItem(it.id, { description: e.target.value })}
                                    className="col-span-5 px-2 py-1.5 border rounded text-sm"
                                    placeholder="Description"
                                  />
                                  <input
                                    type="number"
                                    value={it.qty}
                                    onChange={(e) => updateItem(it.id, { qty: e.target.value })}
                                    className="col-span-2 px-2 py-1.5 border rounded text-sm"
                                  />
                                  <input
                                    type="number"
                                    value={it.unit_price}
                                    onChange={(e) => updateItem(it.id, { unit_price: e.target.value })}
                                    className="col-span-2 px-2 py-1.5 border rounded text-sm"
                                  />
                                  <div className="col-span-2 text-right text-sm font-medium text-amber-700">${lineTotal.toFixed(2)}</div>
                                  <button onClick={() => removeItem(it.id)} className="col-span-1 text-red-500 hover:text-red-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Allowances Tab */}
              {activeTab === 'allowances' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Allowances</h3>
                      <p className="text-xs text-gray-500">Budget placeholders for owner selections (flooring, fixtures, etc.)</p>
                    </div>
                    <button onClick={addAllowance} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add Allowance</button>
                  </div>

                  {allowances.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No allowances. Add allowances for items the owner will select.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allowances.map((a) => (
                        <div key={a.id} className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                          <div className="grid grid-cols-12 gap-3 items-center">
                            <input
                              value={a.name}
                              onChange={(e) => updateAllowance(a.id, { name: e.target.value })}
                              className="col-span-5 px-3 py-2 border rounded-lg text-sm"
                              placeholder="Allowance name (e.g., Flooring Allowance)"
                            />
                            <div className="col-span-3 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <input
                                type="number"
                                value={a.amount}
                                onChange={(e) => updateAllowance(a.id, { amount: Number(e.target.value) })}
                                className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm"
                                placeholder="Amount"
                              />
                            </div>
                            <select
                              value={a.status}
                              onChange={(e) => updateAllowance(a.id, { status: e.target.value })}
                              className="col-span-3 px-2 py-2 border rounded-lg text-sm"
                            >
                              <option value="pending">Pending</option>
                              <option value="selected">Selected</option>
                              <option value="finalized">Finalized</option>
                            </select>
                            <button onClick={() => removeAllowance(a.id)} className="col-span-1 text-red-500 hover:text-red-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <input
                            value={a.description || ''}
                            onChange={(e) => updateAllowance(a.id, { description: e.target.value })}
                            className="mt-2 w-full px-3 py-1.5 border rounded text-sm text-gray-600"
                            placeholder="Description (optional)"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alternates Tab */}
              {activeTab === 'alternates' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Alternates</h3>
                      <p className="text-xs text-gray-500">Add/deduct options the client can accept or reject</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => addAlternate('add')} className="text-sm text-green-600 hover:text-green-700 font-medium">+ Add Alternate</button>
                      <button onClick={() => addAlternate('deduct')} className="text-sm text-red-600 hover:text-red-700 font-medium">+ Deduct Alternate</button>
                    </div>
                  </div>

                  {alternates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No alternates. Add alternates for optional upgrades or deductions.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {alternates.map((a) => (
                        <div key={a.id} className={`p-4 rounded-lg border ${a.type === 'add' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                          <div className="grid grid-cols-12 gap-3 items-center">
                            <div className={`col-span-1 text-center font-bold ${a.type === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                              {a.type === 'add' ? '+' : '-'}
                            </div>
                            <input
                              value={a.name}
                              onChange={(e) => updateAlternate(a.id, { name: e.target.value })}
                              className="col-span-4 px-3 py-2 border rounded-lg text-sm"
                              placeholder="Alternate name"
                            />
                            <div className="col-span-3 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <input
                                type="number"
                                value={a.amount}
                                onChange={(e) => updateAlternate(a.id, { amount: Number(e.target.value) })}
                                className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm"
                                placeholder="Amount"
                              />
                            </div>
                            <select
                              value={a.status}
                              onChange={(e) => updateAlternate(a.id, { status: e.target.value })}
                              className="col-span-3 px-2 py-2 border rounded-lg text-sm"
                            >
                              <option value="proposed">Proposed</option>
                              <option value="accepted">Accepted</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            <button onClick={() => removeAlternate(a.id)} className="col-span-1 text-red-500 hover:text-red-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <input
                            value={a.description || ''}
                            onChange={(e) => updateAlternate(a.id, { description: e.target.value })}
                            className="mt-2 w-full px-3 py-1.5 border rounded text-sm text-gray-600"
                            placeholder="Description (optional)"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes & Terms */}
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Any additional notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                <textarea
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Payment terms, warranty, disclaimers..."
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Estimate Details */}
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Details</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimate Date</label>
                <input type="date" value={estimateDate} onChange={(e) => setEstimateDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                <input type="text" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="Due upon completion">Due upon completion</option>
                  <option value="Due on receipt">Due on receipt</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="50% deposit, 50% on completion">50% deposit, 50% on completion</option>
                </select>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 bg-blue-600">
                <h3 className="font-semibold text-white">Pricing Summary</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                  <div className="flex gap-2">
                    <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')} className="px-3 py-2 border rounded-lg">
                      <option value="percent">%</option>
                      <option value="fixed">$</option>
                    </select>
                    <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="0" />
                </div>

                <div className="pt-4 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Line Items</span>
                    <span className="font-medium">${totals.requiredSubtotal.toFixed(2)}</span>
                  </div>
                  {totals.allowancesTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Allowances</span>
                      <span className="font-medium">${totals.allowancesTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount</span>
                      <span className="font-medium text-green-600">-${totals.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax ({taxRate}%)</span>
                      <span className="font-medium">${totals.tax.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.acceptedAlternatesTotal !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Accepted Alternates</span>
                      <span className={`font-medium ${totals.acceptedAlternatesTotal > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totals.acceptedAlternatesTotal > 0 ? '+' : ''}${totals.acceptedAlternatesTotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg pt-2 border-t">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-blue-600">${totals.total.toFixed(2)}</span>
                  </div>
                </div>

                {totals.optionalSubtotal > 0 && (
                  <div className="pt-3 border-t text-sm">
                    <div className="flex justify-between text-amber-700">
                      <span>Optional Items</span>
                      <span className="font-medium">${totals.optionalSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
              <Link href={`/estimates/${id}`} className="block w-full px-4 py-3 text-center text-gray-500 hover:text-gray-700 font-medium">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
