'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustry } from '@/contexts/IndustryContext';

type IndustryProfile = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  enabled_modules: string[];
  terminology: Record<string, string>;
  default_settings: Record<string, any>;
};

const MODULE_LABELS: Record<string, string> = {
  jobs: 'Jobs/Projects',
  estimates: 'Estimates & Quotes',
  sov: 'Schedule of Values',
  bid_packages: 'Bid Packages',
  subcontractors: 'Subcontractors',
  cost_codes: 'Cost Codes',
  crews: 'Crew Management',
  daily_logs: 'Daily Logs',
  rfi: 'RFIs',
  submittals: 'Submittals',
  units: 'Units/Spaces',
  tenants: 'Tenants',
  leases: 'Leases',
  work_orders: 'Work Orders',
  rent_roll: 'Rent Roll',
  vendors: 'Vendors',
  tools: 'Tool Tracking',
  proforma: 'Pro Forma',
  draws: 'Draw Schedule',
};

const ICONS: Record<string, JSX.Element> = {
  building: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  home: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  wrench: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  'building-office': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  ),
};

export default function IndustrySettingsPage() {
  const { user } = useAuth();
  const { settings, refreshSettings } = useIndustry();
  const [profiles, setProfiles] = useState<IndustryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<IndustryProfile | null>(null);
  const [customTerminology, setCustomTerminology] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (settings?.terminology) {
      setCustomTerminology(settings.custom_terminology || settings.terminology);
    }
  }, [settings]);

  async function loadProfiles() {
    try {
      const res = await fetch('/api/industry-profiles');
      const data = await res.json();
      if (data.success) {
        setProfiles(data.data);
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
    } finally {
      setLoading(false);
    }
  }

  async function changeIndustry(profile: IndustryProfile) {
    if (!user?.id) return;
    setSaving(true);

    try {
      const res = await fetch('/api/user-industry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, industry_id: profile.id }),
      });

      const data = await res.json();
      if (data.success) {
        setCustomTerminology(profile.terminology);
        await refreshSettings();
        setMessage({ type: 'success', text: `Switched to ${profile.name}` });
        setShowConfirm(false);
        setPendingProfile(null);
      }
    } catch (err) {
      console.error('Error changing industry:', err);
      setMessage({ type: 'error', text: 'Failed to change industry' });
    } finally {
      setSaving(false);
    }
  }

  async function saveTerminology() {
    if (!user?.id) return;
    setSaving(true);

    try {
      const res = await fetch('/api/user-industry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          custom_terminology: customTerminology,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await refreshSettings();
        setMessage({ type: 'success', text: 'Terminology updated' });
      }
    } catch (err) {
      console.error('Error saving terminology:', err);
      setMessage({ type: 'error', text: 'Failed to save terminology' });
    } finally {
      setSaving(false);
    }
  }

  const currentProfile = profiles.find(p => p.id === settings?.industry_id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/settings" className="hover:text-blue-600">Settings</Link>
            <span>/</span>
            <span className="text-gray-900">Industry</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Industry Settings</h1>
          <p className="text-gray-600 mt-1">Configure your industry type and customize terminology</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="float-right font-bold">&times;</button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Current Industry */}
            {currentProfile && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Industry</h2>
                <div className="flex items-center gap-4 p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${currentProfile.color}20`, color: currentProfile.color }}
                  >
                    {ICONS[currentProfile.icon] || ICONS.building}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{currentProfile.name}</h3>
                    <p className="text-sm text-gray-600">{currentProfile.description}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Active</span>
                </div>
              </div>
            )}

            {/* Switch Industry */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Switch Industry</h2>
              <p className="text-sm text-gray-600 mb-4">
                Changing your industry will update which modules are visible and the default terminology.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profiles.filter(p => p.id !== settings?.industry_id).map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => { setPendingProfile(profile); setShowConfirm(true); }}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${profile.color}20`, color: profile.color }}
                    >
                      {ICONS[profile.icon] || ICONS.building}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                      <p className="text-sm text-gray-500">{profile.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Terminology */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Terminology</h2>
              <p className="text-sm text-gray-600 mb-4">
                Customize how terms appear throughout the app to match your business language.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {Object.entries(customTerminology).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {key}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setCustomTerminology({ ...customTerminology, [key]: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={saveTerminology}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Terminology'}
                </button>
              </div>
            </div>

            {/* Enabled Modules */}
            {currentProfile && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Enabled Modules</h2>
                <p className="text-sm text-gray-600 mb-4">
                  These modules are enabled for {currentProfile.name}.
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentProfile.enabled_modules.map((module) => (
                    <span
                      key={module}
                      className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm"
                    >
                      {MODULE_LABELS[module] || module}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirm Modal */}
        {showConfirm && pendingProfile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Switch Industry?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to switch to <strong>{pendingProfile.name}</strong>?
                This will update your enabled modules and default terminology.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowConfirm(false); setPendingProfile(null); }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => changeIndustry(pendingProfile)}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Switching...' : 'Switch Industry'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
