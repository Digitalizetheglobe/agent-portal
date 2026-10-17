import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ChartCard, TrendChart } from './DashboardCharts';

export const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const dayLabel = (date) => {
  const today = startOfDay(new Date());
  const diff = Math.round((today - startOfDay(date)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
};

const timeLabel = (date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/**
 * Dashboard "Today's work": big counters for what happened today plus what needs action.
 * tiles: [{ label, value, hint, icon, color, bg, to }]
 * actions: [{ icon, iconBg, iconColor, count, label, link }]
 */
export const TodayPanel = ({ tiles, actions, events }) => {
  const todayEvents = events.filter((e) => isSameDay(e.time, new Date()));
  const actionTotal = actions.reduce((s, a) => s + a.count, 0);

  return (
    <div className="mb-8" data-testid="today-panel">
      <SectionLabel>Today's work</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          const body = (
            <div className="bg-white border border-slate-200 rounded-xl p-4 h-full hover:shadow-md hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.label}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: t.bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: t.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 font-['Outfit']">{t.value}</div>
              <div className="text-[11px] mt-1 font-medium text-slate-500">{t.hint}</div>
            </div>
          );
          return t.to ? <Link key={t.label} to={t.to} className="block">{body}</Link> : <div key={t.label}>{body}</div>;
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-base font-semibold text-[#111827] font-['Outfit']">Needs your action</h3>
            {actionTotal > 0 && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{actionTotal}</span>
            )}
          </div>
          {actions.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {actions.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.label} to={item.link} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 transition-colors group">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: item.iconBg }}>
                      <Icon className="w-4 h-4" style={{ color: item.iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-lg font-bold text-[#111827] font-['Outfit']">{item.count}</span>
                      <span className="text-sm text-slate-600 font-medium">{item.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#042C53] transition-colors shrink-0" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">All clear — nothing is waiting on you</p>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-[#111827] font-['Outfit']">Happened today</h3>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {todayEvents.length} update{todayEvents.length === 1 ? '' : 's'}
            </span>
          </div>
          {todayEvents.length > 0 ? (
            <div className="divide-y divide-slate-50 max-h-[320px] overflow-y-auto">
              {todayEvents.slice(0, 12).map((e) => <EventRow key={e.id} event={e} />)}
            </div>
          ) : (
            <div className="p-10 text-center">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">Nothing has happened yet today</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'student', label: 'Students' },
  { key: 'application', label: 'Applications' },
  { key: 'invoice', label: 'Invoices' },
  { key: 'payoff', label: 'Payoffs' },
  { key: 'agent', label: 'Agents' },
];

/** Work history: last 14 days chart + a day-by-day timeline with type filters. */
export const HistoryPanel = ({ events, filters = FILTERS }) => {
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(25);

  const dailyData = useMemo(() => {
    const today = startOfDay(new Date());
    const rows = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - i));
      return { month: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), _t: d.getTime(), updates: 0 };
    });
    events.forEach((e) => {
      const row = rows.find((r) => r._t === startOfDay(e.time).getTime());
      if (row) row.updates += 1;
    });
    return rows;
  }, [events]);

  const filtered = useMemo(() => events.filter((e) => filter === 'all' || e.type === filter), [events, filter]);
  const visible = filtered.slice(0, limit);

  const groups = [];
  visible.forEach((e) => {
    const label = dayLabel(e.time);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  });

  return (
    <div className="mb-8" data-testid="history-panel">
      <SectionLabel>Work history</SectionLabel>
      <ChartCard className="mb-4" title="Activity, last 14 days" hint="Students, applications, invoices, payoffs and agents updated each day" height={200}>
        <TrendChart type="bar" data={dailyData} series={[{ key: 'updates', name: 'Updates', color: '#042C53' }]} />
      </ChartCard>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-[#111827] font-['Outfit']">Timeline</h3>
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setLimit(25); }}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                  filter === f.key
                    ? 'bg-[#042C53] text-white border-[#042C53]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {groups.length > 0 ? (
          <div>
            {groups.map((g) => (
              <div key={g.label}>
                <div className="px-6 py-2 bg-slate-50 border-y border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {g.label} <span className="text-slate-400 font-medium normal-case">· {g.items.length}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {g.items.map((e) => <EventRow key={e.id} event={e} />)}
                </div>
              </div>
            ))}
            {filtered.length > limit && (
              <button
                onClick={() => setLimit((l) => l + 25)}
                className="w-full py-3 text-xs font-semibold text-[#042C53] hover:bg-slate-50 border-t border-slate-100"
              >
                Show more ({filtered.length - limit} older)
              </button>
            )}
          </div>
        ) : (
          <div className="p-10 text-center">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">No history to show</p>
          </div>
        )}
      </div>
    </div>
  );
};

const EventRow = ({ event: e }) => {
  const Icon = e.icon;
  const row = (
    <div className="flex items-start gap-3.5 px-6 py-3 hover:bg-slate-50/50">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: e.iconBg }}>
        <Icon className="w-3.5 h-3.5" style={{ color: e.iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#111827] font-medium leading-snug">
          <span className="font-bold">{e.title}</span>
          <span className="text-slate-500 ml-1.5">·</span>
          <span className="text-slate-600 ml-1.5">{e.detail}</span>
        </p>
        {e.by && <p className="text-[11px] text-slate-400 mt-0.5 truncate">by {e.by}</p>}
      </div>
      <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap mt-1">{timeLabel(e.time)}</span>
    </div>
  );
  return e.to ? <Link to={e.to} className="block">{row}</Link> : row;
};

const SectionLabel = ({ children }) => (
  <div className="mb-2">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{children}</span>
  </div>
);
