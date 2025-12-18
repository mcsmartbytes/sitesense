'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Variant = 'expenses' | 'sitesense';

type DropdownItem = {
  href: string;
  label: string;
  description?: string;
};

function NavDropdown({
  label,
  items,
  isOpen,
  onToggle,
  onClose
}: {
  label: string;
  items: DropdownItem[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-slate-200 hover:text-blue-400 transition-colors"
      >
        {label}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="block px-4 py-2 hover:bg-gray-50"
            >
              <span className="text-sm font-medium text-gray-900">{item.label}</span>
              {item.description && (
                <span className="block text-xs text-gray-500">{item.description}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navigation({ variant = 'sitesense' }: { variant?: Variant }) {
  const { user, logout } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isExpense = variant === 'expenses';

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const handleDropdownToggle = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const closeAllDropdowns = () => {
    setOpenDropdown(null);
  };

  // Dropdown menu items for SiteSense
  const workItems: DropdownItem[] = [
    { href: '/jobs', label: 'Jobs', description: 'Manage projects & clients' },
    { href: '/estimates', label: 'Estimates', description: 'Create & send bids' },
    { href: '/time-tracking', label: 'Time Tracking', description: 'Log hours worked' },
  ];

  const financialItems: DropdownItem[] = [
    { href: '/expenses', label: 'Expenses', description: 'Track all expenses' },
    { href: '/receipts', label: 'Receipts', description: 'Receipt gallery & OCR' },
    { href: '/mileage', label: 'Mileage', description: 'Track business trips' },
    { href: '/budgets', label: 'Budgets', description: 'Set spending limits' },
    { href: '/recurring', label: 'Recurring', description: 'Recurring expenses' },
  ];

  return (
    <nav className="bg-gradient-to-r from-slate-900 to-slate-800 text-slate-100 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-slate-700 flex items-center justify-center text-slate-50 text-sm font-bold border border-slate-600">
            {isExpense ? 'EM' : 'SS'}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">
              {isExpense ? 'Expenses Made Easy' : 'SiteSense'}
            </span>
            <span className="text-[11px] text-slate-300">
              {isExpense ? 'Expenses · Budgets · Receipts' : 'Jobs · Time · Costs'}
            </span>
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="md:hidden p-2 text-slate-200 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {showMobileMenu ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Main nav - Desktop */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          {isExpense ? (
            <>
              <Link href="/expense-dashboard" className="text-slate-200 hover:text-blue-400 transition-colors">
                Dashboard
              </Link>
              <Link href="/recurring" className="text-slate-200 hover:text-blue-400 transition-colors">
                Recurring
              </Link>
              <Link href="/budgets" className="text-slate-200 hover:text-blue-400 transition-colors">
                Budgets
              </Link>
              <Link href="/receipts" className="text-slate-200 hover:text-blue-400 transition-colors">
                Receipts
              </Link>
              <Link href="/mileage" className="text-slate-200 hover:text-blue-400 transition-colors">
                Mileage
              </Link>
              <Link href="/reports" className="text-slate-200 hover:text-blue-400 transition-colors">
                Reports
              </Link>
              <Link href="/settings" className="text-slate-200 hover:text-blue-400 transition-colors">
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="text-slate-200 hover:text-blue-400 transition-colors">
                Dashboard
              </Link>

              <NavDropdown
                label="Work"
                items={workItems}
                isOpen={openDropdown === 'work'}
                onToggle={() => handleDropdownToggle('work')}
                onClose={closeAllDropdowns}
              />

              <Link href="/contacts" className="text-slate-200 hover:text-blue-400 transition-colors">
                Contacts
              </Link>

              <Link href="/todos" className="text-slate-200 hover:text-blue-400 transition-colors">
                Tasks
              </Link>

              <Link href="/tools" className="text-slate-200 hover:text-blue-400 transition-colors">
                Tools
              </Link>

              <NavDropdown
                label="Financial"
                items={financialItems}
                isOpen={openDropdown === 'financial'}
                onToggle={() => handleDropdownToggle('financial')}
                onClose={closeAllDropdowns}
              />

              <Link href="/reports" className="text-slate-200 hover:text-blue-400 transition-colors">
                Reports
              </Link>
            </>
          )}
        </div>

        {/* Right side: user menu */}
        <div className="relative hidden md:flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden sm:inline text-[11px] text-slate-300">
                {user.company_name || user.full_name || user.email}
              </span>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="h-8 w-8 rounded-full bg-slate-700/60 border border-slate-600 flex items-center justify-center text-[10px] font-semibold text-slate-200 hover:bg-slate-600 transition-colors"
              >
                {getInitials()}
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setShowUserDropdown(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700">
          <div className="px-4 py-3 space-y-1">
            {isExpense ? (
              <>
                <Link href="/expense-dashboard" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Dashboard</Link>
                <Link href="/recurring" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Recurring</Link>
                <Link href="/budgets" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Budgets</Link>
                <Link href="/receipts" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Receipts</Link>
                <Link href="/mileage" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Mileage</Link>
                <Link href="/reports" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Reports</Link>
                <Link href="/settings" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Settings</Link>
              </>
            ) : (
              <>
                <Link href="/" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Dashboard</Link>

                {/* Work section */}
                <div className="py-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Work</p>
                  <Link href="/jobs" className="block py-1.5 pl-3 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Jobs</Link>
                  <Link href="/estimates" className="block py-1.5 pl-3 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Estimates</Link>
                  <Link href="/time-tracking" className="block py-1.5 pl-3 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Time Tracking</Link>
                </div>

                <Link href="/contacts" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Contacts</Link>
                <Link href="/todos" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Tasks</Link>
                <Link href="/tools" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Tools</Link>

                {/* Financial section */}
                <div className="py-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Financial</p>
                  <Link href="/mileage" className="block py-1.5 pl-3 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Mileage</Link>
                  <Link href="/budgets" className="block py-1.5 pl-3 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Budgets</Link>
                  <Link href="/recurring" className="block py-1.5 pl-3 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Recurring</Link>
                  <Link href="/receipts" className="block py-1.5 pl-3 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Receipts</Link>
                </div>

                <Link href="/reports" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Reports</Link>
                <Link href="/settings" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Settings</Link>
              </>
            )}

            {/* User section in mobile */}
            {user && (
              <div className="pt-3 mt-3 border-t border-slate-700">
                <p className="text-xs text-slate-400">{user.email}</p>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleLogout();
                  }}
                  className="block w-full text-left py-2 text-red-400 hover:text-red-300"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
