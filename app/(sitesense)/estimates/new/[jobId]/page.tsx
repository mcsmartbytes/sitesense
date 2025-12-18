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
};

type Job = {
  id: string;
  name: string;
  client_name: string | null;
  property_address: string | null;
};

export default function NewEstimatePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Job data
  const [job, setJob] = useState<Job | null>(null);

  // Estimate header fields
  const [estimateTitle, setEstimateTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [projectAddress, setProjectAddress] = useState('');

  // Estimate details
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiresAt, setExpiresAt] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Due upon completion');

  // Scope and notes
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  // Line items
  const [items, setItems] = useState<Item[]>([
    { id: crypto.randomUUID(), description: '', qty: '1', unit: 'each', unit_price: '0', is_optional: false }
  ]);

  // Pricing
  const [taxRate, setTaxRate] = useState('0');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('0');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      void loadJob();
      // Set default expiration to 30 days from now
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      setExpiresAt(expires.toISOString().split('T')[0]);
    }
  }, [jobId, authLoading, user]);

  async function loadJob() {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setJob(data.data);
        setEstimateTitle(`Estimate for ${data.data.name}`);
        if (data.data.client_name) setClientName(data.data.client_name);
        if (data.data.property_address) setProjectAddress(data.data.property_address);
      }
    } catch (error) {
      console.error('Error loading job:', error);
    }
  }

  const totals = useMemo(() => {
    const requiredSubtotal = items
      .filter(it => !it.is_optional)
      .reduce((s, it) => s + (parseFloat(it.qty || '0') * parseFloat(it.unit_price || '0')), 0);

    const optionalSubtotal = items
      .filter(it => it.is_optional)
      .reduce((s, it) => s + (parseFloat(it.qty || '0') * parseFloat(it.unit_price || '0')), 0);

    const subtotal = requiredSubtotal;

    const discount = discountType === 'percent'
      ? subtotal * (parseFloat(discountValue || '0') / 100)
      : parseFloat(discountValue || '0');

    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (parseFloat(taxRate || '0') / 100);
    const total = afterDiscount + tax;

    return { requiredSubtotal, optionalSubtotal, subtotal, discount, tax, total };
  }, [items, taxRate, discountType, discountValue]);

  function updateItem(id: string, patch: Partial<Item>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }

  function addItem(isOptional = false) {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      description: '',
      qty: '1',
      unit: 'each',
      unit_price: '0',
      is_optional: isOptional
    }]);
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function duplicateItem(id: string) {
    const item = items.find(i => i.id === id);
    if (item) {
      setItems(prev => [...prev, { ...item, id: crypto.randomUUID() }]);
    }
  }

  async function handleSave(asDraft = true) {
    if (!user) {
      alert('Please sign in');
      return;
    }

    setSaving(true);
    try {
      const estimateRes = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          user_id: user.id,
          status: asDraft ? 'draft' : 'sent',
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
          total: totals.total
        })
      });

      const estimateData = await estimateRes.json();
      if (!estimateData.success) throw new Error(estimateData.error);

      const estimateId = estimateData.data.id;

      // Create items
      if (items.length > 0) {
        const itemsToCreate = items.map((it, idx) => ({
          estimate_id: estimateId,
          description: it.description,
          quantity: parseFloat(it.qty || '0'),
          unit: it.unit || null,
          unit_price: parseFloat(it.unit_price || '0'),
          is_optional: it.is_optional,
          sort_order: idx
        }));

        const itemsRes = await fetch(`/api/estimates/${estimateId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsToCreate })
        });

        const itemsData = await itemsRes.json();
        if (!itemsData.success) throw new Error(itemsData.error);
      }

      router.push(`/estimates/${estimateId}`);
    } catch (err: any) {
      alert('Failed to save estimate: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="sitesense" />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const requiredItems = items.filter(it => !it.is_optional);
  const optionalItems = items.filter(it => it.is_optional);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation variant="sitesense" />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Create New Estimate</h1>
                  <p className="text-sm text-gray-500">Job: {job?.name || jobId}</p>
                </div>
              </div>
            </div>
            <Link
              href={`/jobs/${jobId}`}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Job
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Estimate Title */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Estimate Title</label>
              <input
                type="text"
                value={estimateTitle}
                onChange={(e) => setEstimateTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="e.g., Kitchen Remodel Estimate"
              />
            </div>

            {/* Client Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Client Information
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project/Service Address</label>
                  <input
                    type="text"
                    value={projectAddress}
                    onChange={(e) => setProjectAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="456 Oak Ave, City, State (if different from billing)"
                  />
                </div>
              </div>
            </div>

            {/* Scope of Work */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Scope of Work
                </h2>
              </div>
              <div className="p-6">
                <textarea
                  value={scopeOfWork}
                  onChange={(e) => setScopeOfWork(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the work to be performed in detail..."
                />
              </div>
            </div>

            {/* Required Line Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Line Items
                </h2>
                <button
                  onClick={() => addItem(false)}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>
              <div className="p-6">
                {/* Header */}
                <div className="hidden md:grid md:grid-cols-12 gap-3 mb-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="space-y-3">
                  {requiredItems.map((it) => {
                    const lineTotal = parseFloat(it.qty || '0') * parseFloat(it.unit_price || '0');
                    return (
                      <div key={it.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 bg-gray-50 rounded-lg">
                        <div className="md:col-span-5">
                          <input
                            value={it.description}
                            onChange={(e) => updateItem(it.id, { description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Item description"
                          />
                        </div>
                        <div className="md:col-span-2 flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.qty}
                            onChange={(e) => updateItem(it.id, { qty: e.target.value })}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Qty"
                          />
                          <select
                            value={it.unit}
                            onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                            className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="each">each</option>
                            <option value="hour">hour</option>
                            <option value="day">day</option>
                            <option value="sqft">sq ft</option>
                            <option value="lnft">ln ft</option>
                            <option value="lot">lot</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={it.unit_price}
                              onChange={(e) => updateItem(it.id, { unit_price: e.target.value })}
                              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2 flex items-center justify-end">
                          <span className="text-sm font-semibold text-gray-900">${lineTotal.toFixed(2)}</span>
                        </div>
                        <div className="md:col-span-1 flex items-center justify-end gap-1">
                          <button
                            onClick={() => duplicateItem(it.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Duplicate"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => removeItem(it.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {requiredItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No line items yet. Click "Add Item" to get started.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex justify-between items-center">
                <h2 className="font-semibold text-amber-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Optional Add-Ons
                  <span className="text-xs font-normal text-amber-700 ml-2">(Not included in total)</span>
                </h2>
                <button
                  onClick={() => addItem(true)}
                  className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Optional
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {optionalItems.map((it) => {
                    const lineTotal = parseFloat(it.qty || '0') * parseFloat(it.unit_price || '0');
                    return (
                      <div key={it.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                        <div className="md:col-span-5">
                          <input
                            value={it.description}
                            onChange={(e) => updateItem(it.id, { description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            placeholder="Optional item description"
                          />
                        </div>
                        <div className="md:col-span-2 flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={it.qty}
                            onChange={(e) => updateItem(it.id, { qty: e.target.value })}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            placeholder="Qty"
                          />
                          <select
                            value={it.unit}
                            onChange={(e) => updateItem(it.id, { unit: e.target.value })}
                            className="flex-1 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                          >
                            <option value="each">each</option>
                            <option value="hour">hour</option>
                            <option value="day">day</option>
                            <option value="sqft">sq ft</option>
                            <option value="lnft">ln ft</option>
                            <option value="lot">lot</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={it.unit_price}
                              onChange={(e) => updateItem(it.id, { unit_price: e.target.value })}
                              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2 flex items-center justify-end">
                          <span className="text-sm font-semibold text-amber-800">${lineTotal.toFixed(2)}</span>
                        </div>
                        <div className="md:col-span-1 flex items-center justify-end">
                          <button
                            onClick={() => removeItem(it.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {optionalItems.length === 0 && (
                  <div className="text-center py-6 text-amber-700/70 text-sm">
                    <p>Add optional upgrades or add-ons for your client to consider.</p>
                  </div>
                )}

                {totals.optionalSubtotal > 0 && (
                  <div className="mt-4 pt-3 border-t border-amber-200 text-right">
                    <span className="text-sm text-amber-800">Optional Total: </span>
                    <span className="font-semibold text-amber-900">${totals.optionalSubtotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Notes & Terms
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any additional notes for the client..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Payment terms, warranty information, disclaimers..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Estimate Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Estimate Details</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimate Date</label>
                  <input
                    type="date"
                    value={estimateDate}
                    onChange={(e) => setEstimateDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Due upon completion">Due upon completion</option>
                    <option value="Due on receipt">Due on receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="50% deposit, 50% on completion">50% deposit, 50% on completion</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-blue-600">
                <h2 className="font-semibold text-white">Pricing Summary</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                  <div className="flex gap-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="percent">%</option>
                      <option value="fixed">$</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount</span>
                      <span className="font-medium text-green-600">-${totals.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax ({taxRate}%)</span>
                      <span className="font-medium">${totals.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-blue-600">${totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Save & Send
                  </>
                )}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50 transition-colors"
              >
                Save as Draft
              </button>
              <Link
                href={`/jobs/${jobId}`}
                className="block w-full px-4 py-3 text-center text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
