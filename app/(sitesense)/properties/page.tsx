'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

type Stats = {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  activeTenants: number;
  activeLeases: number;
  openWorkOrders: number;
};

export default function PropertiesPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalUnits: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    activeTenants: 0,
    activeLeases: 0,
    openWorkOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user?.id]);

  async function loadStats() {
    try {
      const [unitsRes, tenantsRes, leasesRes, workOrdersRes] = await Promise.all([
        fetch(`/api/properties/units?user_id=${user?.id}`),
        fetch(`/api/properties/tenants?user_id=${user?.id}&status=active`),
        fetch(`/api/properties/leases?user_id=${user?.id}&status=active`),
        fetch(`/api/properties/work-orders?user_id=${user?.id}`),
      ]);

      const [unitsData, tenantsData, leasesData, workOrdersData] = await Promise.all([
        unitsRes.json(),
        tenantsRes.json(),
        leasesRes.json(),
        workOrdersRes.json(),
      ]);

      const units = unitsData.data || [];
      const openWO = (workOrdersData.data || []).filter((wo: any) => !['completed', 'cancelled'].includes(wo.status));

      setStats({
        totalUnits: units.length,
        occupiedUnits: units.filter((u: any) => u.status === 'occupied').length,
        vacantUnits: units.filter((u: any) => u.status === 'vacant').length,
        activeTenants: (tenantsData.data || []).length,
        activeLeases: (leasesData.data || []).length,
        openWorkOrders: openWO.length,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  }

  const modules = [
    {
      title: 'Units',
      description: 'Manage property units, apartments, and spaces',
      href: '/properties/units',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      stats: [
        { label: 'Total', value: stats.totalUnits },
        { label: 'Occupied', value: stats.occupiedUnits, color: 'text-green-600' },
        { label: 'Vacant', value: stats.vacantUnits, color: 'text-amber-600' },
      ],
      color: 'blue',
    },
    {
      title: 'Tenants',
      description: 'Manage tenant information and contacts',
      href: '/properties/tenants',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      stats: [{ label: 'Active Tenants', value: stats.activeTenants }],
      color: 'green',
    },
    {
      title: 'Leases',
      description: 'Track lease agreements and renewals',
      href: '/properties/leases',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      stats: [{ label: 'Active Leases', value: stats.activeLeases }],
      color: 'purple',
    },
    {
      title: 'Work Orders',
      description: 'Manage maintenance requests and repairs',
      href: '/properties/work-orders',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      stats: [{ label: 'Open', value: stats.openWorkOrders, color: stats.openWorkOrders > 0 ? 'text-red-600' : 'text-green-600' }],
      color: 'orange',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
          <p className="text-gray-600 mt-1">Manage units, tenants, leases, and maintenance</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((module) => {
              const colors = colorClasses[module.color];
              return (
                <Link
                  key={module.title}
                  href={module.href}
                  className={`block bg-white rounded-xl shadow-sm border ${colors.border} p-6 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${colors.bg} ${colors.text}`}>
                      {module.icon}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900">{module.title}</h2>
                      <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                      <div className="flex gap-4 mt-4">
                        {module.stats.map((stat) => (
                          <div key={stat.label}>
                            <span className={`text-2xl font-bold ${stat.color || 'text-gray-900'}`}>
                              {stat.value}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">{stat.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
