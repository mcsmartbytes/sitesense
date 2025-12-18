'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

type Tool = {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  qr_code: string;
  status: string;
  condition: string;
  home_location: string | null;
  current_location: string | null;
  tool_categories: Category | null;
  jobs: { id: string; name: string } | null;
};

type Checkout = {
  id: string;
  checked_out_at: string;
  checked_out_to: string | null;
  checkout_notes: string | null;
  checkout_location: string | null;
  jobs: { id: string; name: string } | null;
};

type Job = {
  id: string;
  name: string;
};

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-800 border-green-300',
  checked_out: 'bg-blue-100 text-blue-800 border-blue-300',
  maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  retired: 'bg-gray-100 text-gray-800 border-gray-300',
  lost: 'bg-red-100 text-red-800 border-red-300',
};

function ToolScanPageContent() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Scanner state
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Scanned tool state
  const [scannedTool, setScannedTool] = useState<Tool | null>(null);
  const [activeCheckout, setActiveCheckout] = useState<Checkout | null>(null);
  const [recentHistory, setRecentHistory] = useState<Checkout[]>([]);

  // Checkout form
  const [checkoutTo, setCheckoutTo] = useState('');
  const [checkoutJobId, setCheckoutJobId] = useState('');
  const [checkoutLocation, setCheckoutLocation] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Checkin form
  const [checkinLocation, setCheckinLocation] = useState('');
  const [checkinCondition, setCheckinCondition] = useState('');
  const [checkinNotes, setCheckinNotes] = useState('');

  useEffect(() => {
    if (user) {
      void loadInitialData();
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [user]);

  async function loadInitialData() {
    if (!user) return;

    try {
      // Load jobs via API
      try {
        const jobRes = await fetch(`/api/jobs?user_id=${user.id}&status=active`);
        const jobData = await jobRes.json();
        if (jobData.success) {
          setJobs(jobData.data || []);
        }
      } catch {
        // Jobs API may not exist yet
        setJobs([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  function startScanner() {
    setScanning(true);
    setError(null);

    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        false
      );

      scanner.render(
        (decodedText) => {
          scanner.clear().catch(console.error);
          setScanning(false);
          handleScan(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors (no QR found yet)
        }
      );

      scannerRef.current = scanner;
    }, 100);
  }

  function stopScanner() {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function handleScan(code: string) {
    if (!code.trim()) return;

    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/tools/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), user_id: user?.id }),
      });

      const data = await res.json();

      if (data.success) {
        setScannedTool(data.data.tool);
        setActiveCheckout(data.data.activeCheckout);
        setRecentHistory(data.data.recentHistory || []);

        // Pre-fill checkin location with home location
        if (data.data.tool.home_location) {
          setCheckinLocation(data.data.tool.home_location);
        }
        setCheckinCondition(data.data.tool.condition);
      } else {
        setError(data.error || 'Tool not found');
        setScannedTool(null);
      }
    } catch (err) {
      console.error('Error scanning:', err);
      setError('Failed to look up tool');
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode('');
    }
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!scannedTool || !user) return;

    try {
      const res = await fetch('/api/tools/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_id: scannedTool.id,
          user_id: user.id,
          checked_out_to: checkoutTo.trim() || null,
          checked_out_to_job_id: checkoutJobId || null,
          checkout_location: checkoutLocation.trim() || null,
          checkout_notes: checkoutNotes.trim() || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `${scannedTool.name} checked out successfully!` });
        // Refresh tool data
        await handleScan(scannedTool.qr_code);
        // Reset form
        setCheckoutTo('');
        setCheckoutJobId('');
        setCheckoutLocation('');
        setCheckoutNotes('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to check out tool' });
      }
    } catch (err) {
      console.error('Error checking out:', err);
      setMessage({ type: 'error', text: 'Failed to check out tool' });
    }
  }

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!scannedTool || !user) return;

    try {
      const res = await fetch('/api/tools/checkout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_id: scannedTool.id,
          checkin_location: checkinLocation.trim() || null,
          checkin_condition: checkinCondition || null,
          checkin_notes: checkinNotes.trim() || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `${scannedTool.name} checked in successfully!` });
        // Refresh tool data
        await handleScan(scannedTool.qr_code);
        // Reset form
        setCheckinLocation(scannedTool.home_location || '');
        setCheckinNotes('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to check in tool' });
      }
    } catch (err) {
      console.error('Error checking in:', err);
      setMessage({ type: 'error', text: 'Failed to check in tool' });
    }
  }

  function clearScannedTool() {
    setScannedTool(null);
    setActiveCheckout(null);
    setRecentHistory([]);
    setMessage(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="sitesense" />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation variant="sitesense" />
      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Scan Tool</h1>
            <p className="text-sm text-gray-600 mt-1">
              Scan QR code or enter code manually
            </p>
          </div>
          <Link
            href="/tools"
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
          >
            Tool Inventory
          </Link>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Scanner Section */}
        {!scannedTool && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            {/* Camera Scanner */}
            {scanning ? (
              <div className="mb-6">
                <div id="qr-reader" className="w-full"></div>
                <button
                  onClick={stopScanner}
                  className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Stop Camera
                </button>
              </div>
            ) : (
              <button
                onClick={startScanner}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 mb-6"
              >
                Start Camera Scanner
              </button>
            )}

            {/* Manual Entry */}
            <div className="border-t pt-6">
              <p className="text-sm text-gray-600 mb-3">Or enter code manually:</p>
              <form onSubmit={handleManualSubmit} className="flex gap-3">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="TOOL-XXXXXXXX"
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Look Up
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Scanned Tool Display */}
        {scannedTool && (
          <div className="space-y-6">
            {/* Tool Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{scannedTool.name}</h2>
                  <p className="text-sm text-gray-500">
                    {scannedTool.brand} {scannedTool.model}
                    {scannedTool.serial_number && ` · SN: ${scannedTool.serial_number}`}
                  </p>
                </div>
                <button
                  onClick={clearScannedTool}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[scannedTool.status]}`}>
                    {scannedTool.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Condition</p>
                  <p className="text-sm font-medium capitalize mt-1">{scannedTool.condition.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-sm font-medium mt-1">{scannedTool.tool_categories?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm font-medium mt-1">{scannedTool.current_location || scannedTool.home_location || '—'}</p>
                </div>
              </div>

              {activeCheckout && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-2">Currently Checked Out</p>
                  <div className="text-sm text-blue-700">
                    <p>To: {activeCheckout.checked_out_to || 'Unknown'}</p>
                    {activeCheckout.jobs && <p>Job: {activeCheckout.jobs.name}</p>}
                    <p>Since: {new Date(activeCheckout.checked_out_at).toLocaleString()}</p>
                    {activeCheckout.checkout_location && <p>Location: {activeCheckout.checkout_location}</p>}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-4 font-mono">{scannedTool.qr_code}</p>
            </div>

            {/* Action Forms */}
            {scannedTool.status === 'available' ? (
              /* Checkout Form */
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Check Out Tool</h3>
                <form onSubmit={handleCheckout} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Checked Out To</label>
                    <input
                      value={checkoutTo}
                      onChange={(e) => setCheckoutTo(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Person or crew name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Job (optional)</label>
                    <select
                      value={checkoutJobId}
                      onChange={(e) => setCheckoutJobId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No specific job</option>
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>{j.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Location</label>
                    <input
                      value={checkoutLocation}
                      onChange={(e) => setCheckoutLocation(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Where is the tool going?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                      value={checkoutNotes}
                      onChange={(e) => setCheckoutNotes(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Optional notes..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                  >
                    Check Out Tool
                  </button>
                </form>
              </div>
            ) : scannedTool.status === 'checked_out' ? (
              /* Checkin Form */
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Check In Tool</h3>
                <form onSubmit={handleCheckin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Return Location</label>
                    <input
                      value={checkinLocation}
                      onChange={(e) => setCheckinLocation(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Where is the tool being returned?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Condition</label>
                    <select
                      value={checkinCondition}
                      onChange={(e) => setCheckinCondition(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="needs_repair">Needs Repair</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                      value={checkinNotes}
                      onChange={(e) => setCheckinNotes(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Any issues or notes..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                  >
                    Check In Tool
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6 text-center">
                <p className="text-yellow-800">
                  This tool is marked as <strong>{scannedTool.status}</strong> and cannot be checked out.
                </p>
                <Link
                  href="/tools"
                  className="inline-block mt-3 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Edit in Tool Inventory
                </Link>
              </div>
            )}

            {/* Recent History */}
            {recentHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent History</h3>
                <div className="space-y-3">
                  {recentHistory.slice(0, 5).map(h => (
                    <div key={h.id} className="border-b pb-3 last:border-0">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{h.checked_out_to || 'Unknown'}</span>
                        <span className="text-gray-500">
                          {new Date(h.checked_out_at).toLocaleDateString()}
                        </span>
                      </div>
                      {h.jobs && <p className="text-xs text-gray-500">Job: {h.jobs.name}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scan Another */}
            <button
              onClick={clearScannedTool}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Scan Another Tool
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// Wrap with ProtectedRoute for authentication
export default function ToolScanPage() {
  return (
    <ProtectedRoute>
      <ToolScanPageContent />
    </ProtectedRoute>
  );
}
