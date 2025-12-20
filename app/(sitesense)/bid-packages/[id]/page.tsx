'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import Link from 'next/link';

type BidPackage = {
  id: string;
  job_id: string;
  job_name: string | null;
  package_number: string | null;
  name: string;
  description: string | null;
  csi_division: string | null;
  scope_of_work: string | null;
  inclusions: string | null;
  exclusions: string | null;
  status: string;
  bid_due_date: string | null;
  work_start_date: string | null;
  work_end_date: string | null;
  budget_estimate: number | null;
  awarded_to: string | null;
  awarded_to_name: string | null;
  awarded_amount: number | null;
  created_at: string;
};

type Invite = {
  id: string;
  subcontractor_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  trade: string | null;
  is_compliant: boolean;
  has_coi: boolean;
  has_w9: boolean;
  license_verified: boolean;
  status: string;
  invited_at: string;
  responded_at: string | null;
};

type Bid = {
  id: string;
  subcontractor_id: string;
  company_name: string;
  contact_name: string | null;
  base_bid: number;
  alternates_total: number | null;
  total_bid: number;
  labor_cost: number | null;
  material_cost: number | null;
  equipment_cost: number | null;
  proposed_start_date: string | null;
  proposed_duration_days: number | null;
  inclusions: string | null;
  exclusions: string | null;
  qualifications: string | null;
  status: string;
  score: number | null;
  score_notes: string | null;
  is_compliant: boolean;
  submitted_at: string;
};

type Subcontractor = {
  id: string;
  company_name: string;
  trade: string | null;
  is_active: boolean;
  has_coi: boolean;
  has_w9: boolean;
  license_verified: boolean;
};

export default function BidPackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [pkg, setPkg] = useState<BidPackage | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'invites' | 'bids'>('details');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [scoringBid, setScoringBid] = useState<Bid | null>(null);
  const [scoreForm, setScoreForm] = useState({ score: '', notes: '' });

  useEffect(() => {
    if (user?.id && id) {
      loadData();
    }
  }, [user?.id, id]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadPackage(), loadInvites(), loadBids(), loadSubs()]);
    setLoading(false);
  }

  async function loadPackage() {
    try {
      const res = await fetch(`/api/bid-packages?id=${id}`);
      const data = await res.json();
      if (data.success) {
        setPkg(data.data);
      }
    } catch (err) {
      console.error('Failed to load bid package:', err);
    }
  }

  async function loadInvites() {
    try {
      const res = await fetch(`/api/bid-packages/${id}/invites`);
      const data = await res.json();
      if (data.success) {
        setInvites(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load invites:', err);
    }
  }

  async function loadBids() {
    try {
      const res = await fetch(`/api/bid-packages/${id}/bids`);
      const data = await res.json();
      if (data.success) {
        setBids(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load bids:', err);
    }
  }

  async function loadSubs() {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/subcontractors?user_id=${user.id}&active_only=true`);
      const data = await res.json();
      if (data.success) {
        setSubs(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load subcontractors:', err);
    }
  }

  async function sendInvites() {
    if (selectedSubs.length === 0) return;
    try {
      const res = await fetch(`/api/bid-packages/${id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subcontractor_ids: selectedSubs }),
      });
      const data = await res.json();
      if (data.success) {
        setShowInviteModal(false);
        setSelectedSubs([]);
        loadInvites();
        loadPackage();
      } else {
        alert(data.error || 'Failed to send invites');
      }
    } catch (err) {
      console.error('Error sending invites:', err);
    }
  }

  async function removeInvite(inviteId: string) {
    if (!confirm('Remove this invite?')) return;
    try {
      const res = await fetch(`/api/bid-packages/${id}/invites?invite_id=${inviteId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadInvites();
      }
    } catch (err) {
      console.error('Error removing invite:', err);
    }
  }

  async function scoreBid(bidId: string, score: number, notes: string) {
    try {
      const res = await fetch(`/api/bid-packages/${id}/bids`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid_id: bidId, score, score_notes: notes }),
      });
      const data = await res.json();
      if (data.success) {
        setScoringBid(null);
        setScoreForm({ score: '', notes: '' });
        loadBids();
      }
    } catch (err) {
      console.error('Error scoring bid:', err);
    }
  }

  async function awardBid(bidId: string) {
    const bid = bids.find(b => b.id === bidId);
    if (!bid) return;
    if (!confirm(`Award this package to ${bid.company_name} for $${bid.total_bid.toLocaleString()}?`)) return;
    try {
      const res = await fetch(`/api/bid-packages/${id}/bids`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid_id: bidId, status: 'selected' }),
      });
      const data = await res.json();
      if (data.success) {
        loadBids();
        loadPackage();
      }
    } catch (err) {
      console.error('Error awarding bid:', err);
    }
  }

  async function updatePackageStatus(status: string) {
    try {
      const res = await fetch('/api/bid-packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        loadPackage();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'reviewing': return 'bg-yellow-100 text-yellow-700';
      case 'awarded': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  function getInviteStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'viewed': return 'bg-purple-100 text-purple-700';
      case 'declined': return 'bg-red-100 text-red-700';
      case 'submitted': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  function getBidStatusColor(status: string) {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-700';
      case 'under_review': return 'bg-yellow-100 text-yellow-700';
      case 'selected': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  // Get subs that haven't been invited yet
  const availableSubs = subs.filter(s => !invites.find(i => i.subcontractor_id === s.id));

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

  if (!pkg) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            Bid package not found
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/bid-packages" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            &larr; Back to Bid Packages
          </Link>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-mono text-gray-500">{pkg.package_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pkg.status)}`}>
                  {pkg.status}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{pkg.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Job: <Link href={`/jobs/${pkg.job_id}`} className="text-blue-600 hover:underline">{pkg.job_name || 'Unknown'}</Link>
                {pkg.csi_division && <span className="ml-3">Division: {pkg.csi_division}</span>}
              </p>
            </div>
            <div className="flex gap-2">
              {pkg.status === 'draft' && (
                <button
                  onClick={() => updatePackageStatus('open')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Open for Bidding
                </button>
              )}
              {pkg.status === 'open' && (
                <button
                  onClick={() => updatePackageStatus('reviewing')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
                >
                  Start Review
                </button>
              )}
              {pkg.status !== 'cancelled' && pkg.status !== 'awarded' && (
                <button
                  onClick={() => updatePackageStatus('cancelled')}
                  className="px-4 py-2 text-red-600 hover:text-red-700 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 px-1 font-medium border-b-2 transition-colors ${
                activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('invites')}
              className={`pb-3 px-1 font-medium border-b-2 transition-colors ${
                activeTab === 'invites' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Invites ({invites.length})
            </button>
            <button
              onClick={() => setActiveTab('bids')}
              className={`pb-3 px-1 font-medium border-b-2 transition-colors ${
                activeTab === 'bids' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Bids ({bids.length})
            </button>
          </div>
        </div>

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Timeline</h3>
                <div className="space-y-2 text-sm">
                  {pkg.bid_due_date && (
                    <div><span className="text-gray-500">Bid Due:</span> {new Date(pkg.bid_due_date).toLocaleDateString()}</div>
                  )}
                  {pkg.work_start_date && (
                    <div><span className="text-gray-500">Work Start:</span> {new Date(pkg.work_start_date).toLocaleDateString()}</div>
                  )}
                  {pkg.work_end_date && (
                    <div><span className="text-gray-500">Work End:</span> {new Date(pkg.work_end_date).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Budget</h3>
                <div className="space-y-2 text-sm">
                  {pkg.budget_estimate && (
                    <div><span className="text-gray-500">Estimate:</span> ${pkg.budget_estimate.toLocaleString()}</div>
                  )}
                  {pkg.awarded_to_name && (
                    <div className="text-green-600 font-medium">
                      Awarded to {pkg.awarded_to_name}
                      {pkg.awarded_amount && ` - $${pkg.awarded_amount.toLocaleString()}`}
                    </div>
                  )}
                </div>
              </div>
              {pkg.description && (
                <div className="md:col-span-2">
                  <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{pkg.description}</p>
                </div>
              )}
              {pkg.scope_of_work && (
                <div className="md:col-span-2">
                  <h3 className="font-semibold text-gray-700 mb-2">Scope of Work</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{pkg.scope_of_work}</p>
                </div>
              )}
              {pkg.inclusions && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Inclusions</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{pkg.inclusions}</p>
                </div>
              )}
              {pkg.exclusions && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Exclusions</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{pkg.exclusions}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invites Tab */}
        {activeTab === 'invites' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Invited Subcontractors</h2>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                disabled={availableSubs.length === 0}
              >
                + Invite Subcontractors
              </button>
            </div>

            {invites.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
                No subcontractors invited yet. Invite subcontractors to start collecting bids.
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trade</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compliance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invited</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invites.map(invite => (
                      <tr key={invite.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{invite.company_name}</div>
                          {invite.contact_name && <div className="text-sm text-gray-500">{invite.contact_name}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{invite.trade || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${invite.has_coi ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>COI</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${invite.has_w9 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>W9</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${invite.license_verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>LIC</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getInviteStatusColor(invite.status)}`}>
                            {invite.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(invite.invited_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => removeInvite(invite.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Bids Tab */}
        {activeTab === 'bids' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Submitted Bids</h2>
              {bids.length > 0 && pkg.budget_estimate && (
                <div className="text-sm text-gray-600">
                  Budget: <span className="font-medium">${pkg.budget_estimate.toLocaleString()}</span>
                </div>
              )}
            </div>

            {bids.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
                No bids received yet. Bids will appear here once subcontractors submit them.
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subcontractor</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Bid</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">vs Budget</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Compliance</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bids.map((bid, idx) => {
                      const variance = pkg.budget_estimate ? ((bid.total_bid - pkg.budget_estimate) / pkg.budget_estimate) * 100 : null;
                      return (
                        <tr key={bid.id} className={`hover:bg-gray-50 ${idx === 0 ? 'bg-green-50' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {idx === 0 && <span className="text-green-600 mr-2">LOW</span>}
                              {bid.company_name}
                            </div>
                            {bid.contact_name && <div className="text-sm text-gray-500">{bid.contact_name}</div>}
                            <div className="text-xs text-gray-400">{new Date(bid.submitted_at).toLocaleDateString()}</div>
                          </td>
                          <td className="px-6 py-4 text-right font-mono">
                            ${bid.base_bid.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-semibold">
                            ${bid.total_bid.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {variance !== null && (
                              <span className={`text-sm ${variance <= 0 ? 'text-green-600' : variance <= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${bid.is_compliant ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {bid.is_compliant ? 'Compliant' : 'Not Compliant'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {bid.score !== null ? (
                              <span className="font-medium">{bid.score}/100</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBidStatusColor(bid.status)}`}>
                              {bid.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setScoringBid(bid);
                                setScoreForm({ score: bid.score?.toString() || '', notes: bid.score_notes || '' });
                              }}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Score
                            </button>
                            {bid.status !== 'selected' && pkg.status !== 'awarded' && (
                              <button
                                onClick={() => awardBid(bid.id)}
                                className="text-green-600 hover:text-green-700 text-sm font-medium"
                              >
                                Award
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bid Comparison Summary */}
            {bids.length >= 2 && (
              <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h3 className="font-semibold text-gray-700 mb-4">Bid Comparison Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Low Bid</div>
                    <div className="text-xl font-bold text-green-600">${Math.min(...bids.map(b => b.total_bid)).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">High Bid</div>
                    <div className="text-xl font-bold text-red-600">${Math.max(...bids.map(b => b.total_bid)).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Average</div>
                    <div className="text-xl font-bold text-gray-900">
                      ${Math.round(bids.reduce((sum, b) => sum + b.total_bid, 0) / bids.length).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Spread</div>
                    <div className="text-xl font-bold text-gray-900">
                      ${(Math.max(...bids.map(b => b.total_bid)) - Math.min(...bids.map(b => b.total_bid))).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Invite Subcontractors</h2>
                <p className="text-sm text-gray-600 mt-1">Select subcontractors to invite to bid on this package</p>
              </div>
              <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
                {availableSubs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    All active subcontractors have been invited.
                    <Link href="/subcontractors" className="text-blue-600 hover:underline ml-1">Add more subs</Link>
                  </p>
                ) : (
                  availableSubs.map(sub => (
                    <label key={sub.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSubs.includes(sub.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSubs([...selectedSubs, sub.id]);
                          } else {
                            setSelectedSubs(selectedSubs.filter(id => id !== sub.id));
                          }
                        }}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{sub.company_name}</div>
                        {sub.trade && <div className="text-sm text-gray-500">{sub.trade}</div>}
                      </div>
                      <div className="flex gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${sub.has_coi ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>COI</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${sub.has_w9 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>W9</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${sub.license_verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>LIC</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div className="flex justify-between items-center gap-3 p-6 border-t">
                <div className="text-sm text-gray-500">
                  {selectedSubs.length} selected
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowInviteModal(false); setSelectedSubs([]); }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendInvites}
                    disabled={selectedSubs.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Invites
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scoring Modal */}
        {scoringBid && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Score Bid</h2>
                <p className="text-sm text-gray-600 mt-1">{scoringBid.company_name}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={scoreForm.score}
                    onChange={(e) => setScoreForm({ ...scoreForm, score: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 85"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={scoreForm.notes}
                    onChange={(e) => setScoreForm({ ...scoreForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Scoring rationale..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t">
                <button
                  onClick={() => { setScoringBid(null); setScoreForm({ score: '', notes: '' }); }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => scoreBid(scoringBid.id, Number(scoreForm.score), scoreForm.notes)}
                  disabled={!scoreForm.score}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  Save Score
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
