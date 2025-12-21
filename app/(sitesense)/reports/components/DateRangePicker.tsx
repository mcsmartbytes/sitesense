'use client';

import { DateRange } from '../types';

type DateRangePickerProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const presets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'This year', days: 'ytd' as const },
  ];

  function applyPreset(days: number | 'ytd') {
    const end = new Date();
    let start: Date;

    if (days === 'ytd') {
      start = new Date(end.getFullYear(), 0, 1);
    } else {
      start = new Date(end);
      start.setDate(start.getDate() - days);
    }

    onChange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">From:</label>
        <input
          type="date"
          value={value.start}
          onChange={(e) => onChange({ ...value, start: e.target.value })}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">To:</label>
        <input
          type="date"
          value={value.end}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="flex gap-1">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => applyPreset(preset.days)}
            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
