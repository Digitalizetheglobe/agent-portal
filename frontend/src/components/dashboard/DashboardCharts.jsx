import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BarChart3 } from 'lucide-react';

export const CHART_COLORS = ['#042C53', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'];

const tooltipStyle = { borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 };
const tick = { fontSize: 11, fill: '#9CA3AF' };

/** Last `n` calendar months (oldest first) as { key, label } */
export const lastMonths = (n = 6) => {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'short' }),
    };
  });
};

export const monthKey = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Buckets items into the last `n` months.
 * series: [{ key, filter?(item), value?(item) }]  — value defaults to 1 (a count)
 */
export const bucketByMonth = (items, getDate, series, n = 6) => {
  const months = lastMonths(n);
  const rows = months.map(m => ({ month: m.label, _key: m.key, ...Object.fromEntries(series.map(s => [s.key, 0])) }));
  items.forEach(item => {
    const k = monthKey(getDate(item));
    const row = rows.find(r => r._key === k);
    if (!row) return;
    series.forEach(s => {
      if (!s.filter || s.filter(item)) row[s.key] += s.value ? s.value(item) : 1;
    });
  });
  return rows;
};

/** Counts items per label, returns [{ name, value }] sorted high → low */
export const countBy = (items, getLabel) => {
  const map = items.reduce((acc, it) => {
    const label = getLabel(it) || 'Unknown';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

export const prettyStatus = (s) =>
  (s || 'Unknown').toString().replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase());

/** White card with a title, a one-line explanation, and the chart body */
export const ChartCard = ({ title, hint, height = 240, className = '', children }) => (
  <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden ${className}`}>
    <div className="px-6 py-4 border-b border-slate-100">
      <h3 className="text-base font-semibold text-[#111827] font-['Outfit']">{title}</h3>
      {hint && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{hint}</p>}
    </div>
    <div className="p-4" style={{ height }}>{children}</div>
  </div>
);

export const EmptyChart = ({ text = 'Not enough data yet' }) => (
  <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
    <BarChart3 className="w-8 h-8 text-slate-200" />
    <p className="text-sm text-slate-400 font-medium">{text}</p>
  </div>
);

/** Line or bar chart over time. series: [{ key, name, color }] */
export const TrendChart = ({ data, series, type = 'line', stacked = false, money = false }) => {
  const total = data.reduce((t, r) => t + series.reduce((s, x) => s + (r[x.key] || 0), 0), 0);
  if (!data.length || total === 0) return <EmptyChart />;
  const fmt = money ? (v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${v / 1000}k` : v}` : undefined;
  const tipFmt = money ? (v) => `₹${Number(v).toLocaleString('en-IN')}` : undefined;
  const Chart = type === 'bar' ? BarChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <Chart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={tick} dy={6} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={tick} tickFormatter={fmt} />
        <Tooltip contentStyle={tooltipStyle} formatter={tipFmt} cursor={type === 'bar' ? { fill: '#F9FAFB' } : undefined} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {series.map(s => type === 'bar' ? (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId={stacked ? 'a' : undefined} radius={stacked ? 0 : [4, 4, 0, 0]} barSize={22} />
        ) : (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5}
            dot={{ r: 3.5, fill: s.color, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5.5, strokeWidth: 0 }} />
        ))}
      </Chart>
    </ResponsiveContainer>
  );
};

/** Donut with a readable legend next to it */
export const DonutChart = ({ data }) => {
  if (!data.length) return <EmptyChart />;
  const total = data.reduce((t, d) => t + d.value, 0);
  return (
    <div className="h-full grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
      <div className="h-full min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" paddingAngle={3}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5 overflow-y-auto max-h-full pr-1">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 text-slate-600 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="font-semibold text-slate-900 whitespace-nowrap">
              {d.value} <span className="text-slate-400 font-normal">({Math.round((d.value / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Horizontal ranked bars */
export const HBarChart = ({ data, color = '#0EA5E9', name = 'Count', labelWidth = 110 }) => {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={tick} />
        <YAxis type="category" dataKey="name" width={labelWidth} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4B5563' }} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F9FAFB' }} />
        <Bar dataKey="value" name={name} fill={color} radius={[0, 6, 6, 0]} barSize={18} label={{ position: 'right', fontSize: 11, fill: '#111827' }} />
      </BarChart>
    </ResponsiveContainer>
  );
};
