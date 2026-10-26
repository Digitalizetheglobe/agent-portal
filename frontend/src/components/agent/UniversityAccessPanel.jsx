import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { universityAPI, formatApiError } from '../../utils/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

export const ACCESS_MODES = [
  { value: 'all', label: 'All (Global)', hint: 'Every university' },
  { value: 'malaysia_only', label: 'Malaysia Only', hint: 'Malaysian institutions' },
  { value: 'foreign_only', label: 'Foreign Only', hint: 'Overseas institutions' },
  { value: 'custom', label: 'Custom Matrix', hint: 'Pick universities one by one' }
];

const isMalaysian = (u) => (u.country || '').trim().toLowerCase() === 'malaysia';

// Short label for the agent header, e.g. "Malaysia Only" or "Custom (14 universities)"
export const getAccessLabel = (agent) => {
  const mode = agent?.universityAccessMode || 'all';
  if (mode === 'custom') {
    const count = (agent.allowedUniversityIds || []).length;
    return `Custom (${count} ${count === 1 ? 'university' : 'universities'})`;
  }
  return ACCESS_MODES.find((m) => m.value === mode)?.label || 'All (Global)';
};

// Loads every university (the API caps a page at 100)
const loadAllUniversities = async () => {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data } = await universityAPI.getAll({ page, limit: 100, envelope: 'true' });
    all.push(...(data.universities || []));
    totalPages = data.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return all;
};

/**
 * Super Admin controls which universities an agent can see in Info / Courses
 * and submit students to.
 */
const UniversityAccessPanel = ({ agent }) => {
  const { user } = useAuth();
  const { updateAgentUniversityAccess } = useData();
  const [mode, setMode] = useState(agent.universityAccessMode || 'all');
  const [selected, setSelected] = useState(() => new Set(agent.allowedUniversityIds || []));
  const [universities, setUniversities] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const canEdit = user?.role === 'admin' && (!user.staffRole || user.staffRole === 'super_admin');

  useEffect(() => {
    setMode(agent.universityAccessMode || 'all');
    setSelected(new Set(agent.allowedUniversityIds || []));
  }, [agent.id, agent.universityAccessMode, agent.allowedUniversityIds]);

  useEffect(() => {
    if (!canEdit || mode !== 'custom' || loaded) return;
    loadAllUniversities()
      .then((list) => {
        setUniversities(list);
        setLoaded(true);
      })
      .catch((error) => toast.error('Failed to load universities', { description: formatApiError(error) }));
  }, [canEdit, mode, loaded]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return universities.filter(
      (u) => !q || u.name.toLowerCase().includes(q) || (u.country || '').toLowerCase().includes(q) || (u.code || '').toLowerCase().includes(q)
    );
  }, [universities, search]);

  if (!canEdit) return null;

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setMany = (list, on) =>
    setSelected((prev) => {
      const next = new Set(prev);
      list.forEach((u) => (on ? next.add(u.id) : next.delete(u.id)));
      return next;
    });

  const savedIds = agent.allowedUniversityIds || [];
  const dirty =
    mode !== (agent.universityAccessMode || 'all') ||
    (mode === 'custom' && (selected.size !== savedIds.length || savedIds.some((id) => !selected.has(id))));

  const save = async () => {
    setSaving(true);
    try {
      await updateAgentUniversityAccess(agent.id, {
        universityAccessMode: mode,
        allowedUniversityIds: mode === 'custom' ? [...selected] : []
      });
      toast.success('University access saved', { description: agent.name });
    } catch {
      // error toast already shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-[#E5E7EB] shadow-none overflow-hidden bg-white">
      <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2">
        <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Institution Access</h3>
        <p className="text-[11px] text-[#9CA3AF] mt-0.5">Universities this agent can view and submit students to</p>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {ACCESS_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={cn(
                'text-left rounded-lg border px-3 py-2 transition-colors',
                mode === m.value ? 'border-[#0C447C] bg-[#E6F1FB]/60 ring-1 ring-[#0C447C]' : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <p className="text-xs font-semibold text-slate-900">{m.label}</p>
              <p className="text-[10px] text-slate-500">{m.hint}</p>
            </button>
          ))}
        </div>

        {mode === 'custom' && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search universities..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0C447C]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#0C447C]">
              <button type="button" className="hover:underline" onClick={() => setMany(visible, true)}>Select All</button>
              <button type="button" className="hover:underline" onClick={() => setMany(visible.filter(isMalaysian), true)}>Select Malaysian</button>
              <button type="button" className="hover:underline" onClick={() => setMany(universities, false)}>Deselect All</button>
              <span className="ml-auto text-slate-500 font-medium">{selected.size} selected</span>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {!loaded ? (
                <p className="p-4 text-xs text-slate-400 text-center">Loading universities...</p>
              ) : universities.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center">No universities have been added yet.</p>
              ) : visible.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center">No universities match your search.</p>
              ) : (
                visible.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} className="h-3.5 w-3.5 accent-[#0C447C]" />
                    {u.logoUrl && <img src={u.logoUrl} alt="" className="h-5 w-5 rounded object-contain" />}
                    <span className="flex-1 min-w-0 text-xs font-medium text-slate-800 truncate">{u.name}</span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', isMalaysian(u) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                      {u.country}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <Button onClick={save} disabled={!dirty || saving} className="w-full h-8 text-xs">
          {saving ? 'Saving...' : 'Save Access'}
        </Button>
      </div>
    </Card>
  );
};

export default UniversityAccessPanel;
