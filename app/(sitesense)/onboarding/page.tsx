'use client';

import { useEffect, useState, JSX } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

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

type Step = 'select' | 'customize' | 'complete';

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
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  home: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  wrench: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  'building-office': (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  ),
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('select');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<IndustryProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<IndustryProfile | null>(null);
  const [customTerminology, setCustomTerminology] = useState<Record<string, string>>({});
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      checkOnboardingStatus();
    }
  }, [user?.id]);

  async function checkOnboardingStatus() {
    try {
      const res = await fetch(`/api/user-industry?user_id=${user?.id}`);
      const data = await res.json();

      if (data.success) {
        if (data.data && data.data.onboarding_completed) {
          router.push('/dashboard');
          return;
        }

        if (data.available_profiles) {
          setProfiles(data.available_profiles);
        } else {
          await loadProfiles();
        }

        if (data.data?.industry_id) {
          const profile = profiles.find(p => p.id === data.data.industry_id);
          if (profile) {
            setSelectedProfile(profile);
            setStep('customize');
          }
        }
      }
    } catch (err) {
      console.error('Error checking onboarding:', err);
      await loadProfiles();
    } finally {
      setLoading(false);
    }
  }

  async function loadProfiles() {
    try {
      const res = await fetch('/api/industry-profiles');
      const data = await res.json();
      if (data.success && data.data) {
        setProfiles(data.data);
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
    }
  }

  async function selectIndustry(profile: IndustryProfile) {
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
        setSelectedProfile(profile);
        setCustomTerminology(profile.terminology || {});
        setEnabledModules(profile.enabled_modules || []);
        setStep('customize');
      }
    } catch (err) {
      console.error('Error selecting industry:', err);
    } finally {
      setSaving(false);
    }
  }

  async function completeOnboarding() {
    if (!user?.id) return;
    setSaving(true);

    try {
      await fetch('/api/user-industry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          custom_terminology: customTerminology,
          onboarding_completed: true,
          onboarding_step: 'complete',
        }),
      });

      setStep('complete');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error completing onboarding:', err);
    } finally {
      setSaving(false);
    }
  }

  function toggleModule(module: string) {
    setEnabledModules(prev =>
      prev.includes(module)
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to SiteSense</h1>
          <p className="text-gray-600 mt-2">Let&apos;s set up your account for your industry</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <div className="flex items-center justify-center gap-4">
            {[
              { key: 'select', label: 'Select Industry' },
              { key: 'customize', label: 'Customize' },
              { key: 'complete', label: 'Complete' },
            ].map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      step === s.key
                        ? 'bg-blue-600 text-white'
                        : ['customize', 'complete'].indexOf(step) > ['select', 'customize', 'complete'].indexOf(s.key as Step)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-xs text-gray-600 mt-1">{s.label}</span>
                </div>
                {i < 2 && (
                  <div className={`w-16 h-1 mx-2 ${
                    ['customize', 'complete'].indexOf(step) > i ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {step === 'select' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
              What type of business do you run?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => selectIndustry(profile)}
                  disabled={saving}
                  className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg hover:border-blue-300 border-2 border-transparent transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${profile.color}15`, color: profile.color }}
                    >
                      {ICONS[profile.icon] || ICONS.building}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {profile.name}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {profile.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'customize' && selectedProfile && (
          <div className="space-y-6">
            {/* Selected Industry */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-4">
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${selectedProfile.color}15`, color: selectedProfile.color }}
                >
                  {ICONS[selectedProfile.icon] || ICONS.building}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedProfile.name}</h2>
                  <p className="text-gray-600 text-sm">Customize your settings below</p>
                </div>
              </div>
            </div>

            {/* Terminology */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Terminology</h3>
              <p className="text-gray-600 text-sm mb-4">
                Customize how different terms appear in the app
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(customTerminology).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      What do you call a &quot;{key}&quot;?
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setCustomTerminology({ ...customTerminology, [key]: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Modules */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Enabled Features</h3>
              <p className="text-gray-600 text-sm mb-4">
                These features are enabled for your industry. You can toggle them on or off.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {enabledModules.map((module) => (
                  <label
                    key={module}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={enabledModules.includes(module)}
                      onChange={() => toggleModule(module)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 text-sm">
                      {MODULE_LABELS[module] || module}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep('select')}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Back
              </button>
              <button
                onClick={completeOnboarding}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-flex p-4 bg-green-100 rounded-full mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">You&apos;re All Set!</h2>
            <p className="text-gray-600 mb-6">
              Your account is configured for {selectedProfile?.name}
            </p>
            <p className="text-gray-400 text-sm">
              Redirecting to dashboard...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
