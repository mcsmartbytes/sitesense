'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

type Industry = { id: string; name: string };

type Preferences = {
  darkMode: boolean;
  showCalendar: boolean;
  notifications: boolean;
};

function SettingsPageContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile state
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industryId, setIndustryId] = useState('');
  const [industries, setIndustries] = useState<Industry[]>([]);

  // Preferences state
  const [preferences, setPreferences] = useState<Preferences>({
    darkMode: false,
    showCalendar: true,
    notifications: true,
  });

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      void loadData();
    }
  }, [user]);

  // Apply dark mode on mount and changes
  useEffect(() => {
    if (preferences.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.darkMode]);

  async function loadData() {
    setLoading(true);
    try {
      // Load industries
      const indRes = await fetch('/api/industries');
      const indData = await indRes.json();
      if (indData.success) {
        setIndustries(indData.data || []);
      }

      // Set profile from user context
      if (user) {
        setFullName(user.full_name || '');
        setCompanyName(user.company_name || '');
        setIndustryId(user.industry_id || '');
      }

      // Load preferences from localStorage
      const savedPrefs = localStorage.getItem('sitesense_preferences');
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          company_name: companyName.trim() || null,
          industry_id: industryId || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Profile saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save profile.' });
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  function handlePreferenceChange(key: keyof Preferences, value: boolean) {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    localStorage.setItem('sitesense_preferences', JSON.stringify(newPrefs));

    if (key === 'darkMode') {
      setMessage({ type: 'success', text: value ? 'Dark mode enabled!' : 'Dark mode disabled!' });
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setShowPasswordForm(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password.' });
      }
    } catch (err: any) {
      console.error('Error changing password:', err);
      setMessage({ type: 'error', text: 'Failed to change password.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSeedIndustryData() {
    if (!user?.id || !industryId) {
      setMessage({ type: 'error', text: 'Please select an industry first.' });
      return;
    }

    if (!confirm('This will replace your current phases and custom fields with industry-specific templates. Continue?')) {
      return;
    }

    setSeeding(true);
    setMessage(null);

    try {
      const res = await fetch('/api/industry/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          industry_id: industryId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: data.message || 'Industry data seeded successfully! Phases and custom fields have been added.',
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to seed industry data.' });
      }
    } catch (err: any) {
      console.error('Error seeding industry data:', err);
      setMessage({ type: 'error', text: 'Failed to seed industry data. Please try again.' });
    } finally {
      setSeeding(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation variant="sitesense" />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600 dark:text-gray-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navigation variant="sitesense" />
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage your account and preferences
            </p>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
            ← Back to Dashboard
          </Link>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
            }`}
          >
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Account Info */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="font-medium text-gray-900 dark:text-white">{user?.email || 'Not available'}</p>
            </div>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              Change Password
            </button>
          </div>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile}>
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Company Name</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Smith Contracting LLC"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Industry</label>
                <div className="flex gap-3">
                  <select
                    value={industryId}
                    onChange={(e) => setIndustryId(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select your primary industry</option>
                    {industries.map((ind) => (
                      <option key={ind.id} value={ind.id}>{ind.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleSeedIndustryData}
                    disabled={seeding || !industryId}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {seeding ? 'Seeding...' : 'Seed Industry Data'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Selecting an industry enables specialized features and fields. Click &quot;Seed Industry Data&quot; to populate phases, tasks, and custom fields for your trade.
                </p>
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Preferences</h2>
            <div className="space-y-4">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Use dark theme for the interface</p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreferenceChange('darkMode', !preferences.darkMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.darkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Calendar Widget Toggle */}
              <div className="flex items-center justify-between border-t dark:border-gray-700 pt-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Calendar Widget</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Show calendar on dashboard</p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreferenceChange('showCalendar', !preferences.showCalendar)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.showCalendar ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.showCalendar ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between border-t dark:border-gray-700 pt-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Notifications</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Receive reminder notifications</p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreferenceChange('notifications', !preferences.notifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>

        {/* Quick Links */}
        <section className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/jobs"
              className="p-4 border dark:border-gray-700 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <p className="font-medium text-gray-900 dark:text-white">Jobs</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Manage projects</p>
            </Link>
            <Link
              href="/tools"
              className="p-4 border dark:border-gray-700 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <p className="font-medium text-gray-900 dark:text-white">Tools</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Equipment tracking</p>
            </Link>
            <Link
              href="/estimates"
              className="p-4 border dark:border-gray-700 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <p className="font-medium text-gray-900 dark:text-white">Estimates</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Create bids</p>
            </Link>
            <Link
              href="/reports"
              className="p-4 border dark:border-gray-700 rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <p className="font-medium text-gray-900 dark:text-white">Reports</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">View analytics</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsPageContent />
    </ProtectedRoute>
  );
}
