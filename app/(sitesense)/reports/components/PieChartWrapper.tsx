'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CATEGORY_COLORS } from '../types';

type PieChartWrapperProps = {
  data: {
    name: string;
    value: number;
    color?: string;
  }[];
  height?: number;
  formatValue?: (value: number) => string;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
};

export default function PieChartWrapper({
  data,
  height = 300,
  formatValue,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 100,
}: PieChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) =>
            (percent ?? 0) > 0.05 ? `${name}: ${((percent ?? 0) * 100).toFixed(0)}%` : ''
          }
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value) => [formatValue ? formatValue(Number(value)) : value]}
        />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
