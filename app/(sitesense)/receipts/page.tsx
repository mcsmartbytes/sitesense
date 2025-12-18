'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';

type Receipt = {
  id: string;
  expense_id: string;
  file_url: string;
  file_name: string | null;
  created_at: string;
  expenses: {
    id: string;
    description: string;
    amount: number;
    date: string;
    vendor: string | null;
    categories: { name: string } | null;
  } | null;
};

type ExpenseWithReceipt = {
  id: string;
  description: string;
  amount: number;
  date: string;
  vendor: string | null;
  receipt_url: string | null;
  categories: { name: string } | null;
};

export default function ReceiptsPage() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [expensesWithReceipts, setExpensesWithReceipts] = useState<ExpenseWithReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // Filter state
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (user?.id) {
      void loadData();
    }
  }, [user?.id]);

  async function loadData() {
    if (!user?.id) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/receipts?user_id=${user.id}`);
      const data = await res.json();

      if (data.success) {
        setReceipts(data.data.receipts || []);
        setExpensesWithReceipts(data.data.expensesWithReceipts || []);
      } else {
        setError(data.error || 'Failed to load receipts');
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  }

  // Combine both sources of receipts
  const allReceipts = [
    ...receipts.map(r => ({
      id: r.id,
      url: r.file_url,
      fileName: r.file_name || 'Receipt',
      date: r.expenses?.date || r.created_at,
      description: r.expenses?.description || 'Receipt',
      amount: r.expenses?.amount || 0,
      vendor: r.expenses?.vendor || null,
      category: r.expenses?.categories?.name || null,
      expenseId: r.expense_id,
    })),
    ...expensesWithReceipts.map(e => ({
      id: `exp-${e.id}`,
      url: e.receipt_url!,
      fileName: 'Receipt',
      date: e.date,
      description: e.description,
      amount: e.amount,
      vendor: e.vendor,
      category: e.categories?.name || null,
      expenseId: e.id,
    })),
  ];

  // Filter receipts
  const filteredReceipts = allReceipts.filter(r => {
    const date = new Date(r.date);
    if (date.getFullYear() !== filterYear) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        r.description.toLowerCase().includes(search) ||
        r.vendor?.toLowerCase().includes(search) ||
        r.category?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Get unique years
  const years = [...new Set(allReceipts.map(r => new Date(r.date).getFullYear()))];
  if (!years.includes(new Date().getFullYear())) {
    years.push(new Date().getFullYear());
  }
  years.sort((a, b) => b - a);

  const totalAmount = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading receipts...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
            <p className="text-sm text-gray-600 mt-1">
              {filteredReceipts.length} receipts · ${totalAmount.toFixed(2)} total
            </p>
          </div>
          <div className="flex gap-3">
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Year</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(parseInt(e.target.value))}
                  className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Search</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search receipts..."
                  className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Receipt Gallery */}
        {filteredReceipts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">🧾</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {allReceipts.length === 0
                ? 'Upload receipts when adding expenses to keep them organized.'
                : 'No receipts match your current filters.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredReceipts.map(receipt => (
              <div
                key={receipt.id}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedReceipt(receipt.url)}
              >
                <div className="aspect-[3/4] bg-gray-100 relative">
                  {receipt.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={receipt.url}
                      alt={receipt.description}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-xs text-gray-500">PDF/Document</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-gray-900 text-sm truncate">{receipt.description}</p>
                  <p className="text-sm text-gray-600">${receipt.amount.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(receipt.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Receipt</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Description</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Vendor</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Category</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Amount</th>
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt, idx) => (
                  <tr
                    key={receipt.id}
                    className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-blue-50 cursor-pointer`}
                    onClick={() => setSelectedReceipt(receipt.url)}
                  >
                    <td className="px-4 py-2">
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        {receipt.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img
                            src={receipt.url}
                            alt=""
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <span className="text-lg">📄</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">{receipt.description}</td>
                    <td className="px-4 py-2 text-gray-600">{receipt.vendor || '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{receipt.category || '—'}</td>
                    <td className="px-4 py-2 text-right font-medium">${receipt.amount.toFixed(2)}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(receipt.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Receipt Modal */}
        {selectedReceipt && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedReceipt(null)}
          >
            <div
              className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
                <h3 className="font-semibold">Receipt Preview</h3>
                <div className="flex gap-2">
                  <a
                    href={selectedReceipt}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    Open in New Tab
                  </a>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="p-4">
                {selectedReceipt.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img
                    src={selectedReceipt}
                    alt="Receipt"
                    className="max-w-full h-auto"
                  />
                ) : selectedReceipt.match(/\.pdf$/i) ? (
                  <iframe
                    src={selectedReceipt}
                    className="w-full h-[70vh]"
                    title="Receipt PDF"
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">Cannot preview this file type.</p>
                    <a
                      href={selectedReceipt}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
