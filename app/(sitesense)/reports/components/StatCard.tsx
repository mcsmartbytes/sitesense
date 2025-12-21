'use client';

type StatCardProps = {
  label: string;
  value: string | number;
  color?: 'default' | 'blue' | 'green' | 'yellow' | 'red';
  subtext?: string;
};

const colorClasses = {
  default: 'text-gray-900',
  blue: 'text-blue-600',
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
};

export default function StatCard({ label, value, color = 'default', subtext }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}
