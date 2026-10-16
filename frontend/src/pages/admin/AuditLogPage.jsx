import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ScrollText, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auditAPI, formatApiError } from '../../utils/api';
import { hasStaffRole, STAFF_ROLE_LABELS } from '../../utils/staffRoles';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';

const ACTION_STYLE = {
  create: 'bg-[#EAF3DE] text-[#27500A]',
  update: 'bg-[#E6F1FB] text-[#0C447C]',
  delete: 'bg-[#FCEBEB] text-[#791F1F]',
};

const ROLE_LABELS = { ...STAFF_ROLE_LABELS, super_admin: 'Super Admin', agent: 'Agent', system: 'System' };

const formatWhen = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

const showValue = (value) => (value === null || value === undefined ? 'empty' : String(value));

const selectClass = 'h-9 rounded-md border border-input bg-background px-3 text-sm';

const PAGE_SIZE = 25;

/**
 * Central audit log: every record created, changed or deleted in the portal, with who did it and when.
 * Visible to the Head of Admission and super admin only (the server enforces it too).
 */
const AuditLogPage = () => {
  const { user } = useAuth();
  const allowed = hasStaffRole(user, 'head_admission');

  const [filters, setFilters] = useState({ search: '', entityType: '', action: '', from: '', to: '' });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ logs: [], total: 0, totalPages: 1, entityTypes: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      Object.entries(applied).forEach(([key, value]) => { if (value) params[key] = value; });
      const res = await auditAPI.getAll(params);
      setData(res.data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  if (!allowed) {
    return (
      <div className="p-6">
        <p className="text-sm text-[#6B7280]">The audit log is available to the Head of Admission and super admin.</p>
      </div>
    );
  }

  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });
  const apply = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied(filters);
  };
  const reset = () => {
    const empty = { search: '', entityType: '', action: '', from: '', to: '' };
    setFilters(empty);
    setApplied(empty);
    setPage(1);
  };

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6" data-testid="audit-log-page">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-[#042C53]" /> Audit log
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Every change made in the portal, with who did it and when. {data.total.toLocaleString()} entries.
        </p>
      </div>

      <Card className="border-[#E5E7EB] shadow-none bg-white p-4">
        <form onSubmit={apply} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2 space-y-1">
            <label htmlFor="audit-search" className="text-[11px] font-semibold text-[#6B7280] uppercase">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF]" />
              <Input id="audit-search" className="pl-9" placeholder="Name, number or what changed" value={filters.search} onChange={set('search')} />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="audit-type" className="text-[11px] font-semibold text-[#6B7280] uppercase">Record</label>
            <select id="audit-type" className={cn(selectClass, 'w-full')} value={filters.entityType} onChange={set('entityType')}>
              <option value="">All records</option>
              {data.entityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="audit-action" className="text-[11px] font-semibold text-[#6B7280] uppercase">Action</label>
            <select id="audit-action" className={cn(selectClass, 'w-full')} value={filters.action} onChange={set('action')}>
              <option value="">All actions</option>
              <option value="create">Created</option>
              <option value="update">Changed</option>
              <option value="delete">Deleted</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="audit-from" className="text-[11px] font-semibold text-[#6B7280] uppercase">From</label>
            <Input id="audit-from" type="date" value={filters.from} onChange={set('from')} />
          </div>
          <div className="space-y-1">
            <label htmlFor="audit-to" className="text-[11px] font-semibold text-[#6B7280] uppercase">To</label>
            <Input id="audit-to" type="date" value={filters.to} onChange={set('to')} />
          </div>
          <div className="md:col-span-6 flex gap-2">
            <Button type="submit" size="sm" className="bg-[#042C53] hover:bg-[#0C447C] text-white">Apply filters</Button>
            <Button type="button" size="sm" variant="outline" onClick={reset}>Clear</Button>
          </div>
        </form>
      </Card>

      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}

      <Card className="border-[#E5E7EB] shadow-none bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB]">
              <TableHead className="w-8" />
              <TableHead className="text-[10px] uppercase tracking-wider font-bold text-[#6B7280]">When</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold text-[#6B7280]">Who</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold text-[#6B7280]">Action</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold text-[#6B7280]">Record</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold text-[#6B7280]">What happened</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && data.logs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-sm text-[#6B7280]">Loading...</TableCell></TableRow>
            ) : data.logs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-sm text-[#6B7280]">No entries match these filters.</TableCell></TableRow>
            ) : data.logs.map((log) => {
              const open = expanded === log.id;
              const changes = log.changes ? Object.entries(log.changes) : [];
              return (
                <React.Fragment key={log.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-[#F9FAFB]"
                    onClick={() => setExpanded(open ? null : log.id)}
                    data-testid="audit-row"
                  >
                    <TableCell className="text-[#9CA3AF]">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</TableCell>
                    <TableCell className="text-xs text-[#374151] whitespace-nowrap tabular-nums">{formatWhen(log.at)}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-semibold text-[#111827] block">{log.actorName}</span>
                      <span className="text-[11px] text-[#6B7280]">{ROLE_LABELS[log.actorRole] || log.actorRole}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border-none text-[10px] font-semibold capitalize', ACTION_STYLE[log.action])}>
                        {log.action === 'update' ? 'Changed' : log.action === 'create' ? 'Created' : 'Deleted'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-semibold text-[#111827] block">{log.entityType}</span>
                      <span className="text-[11px] text-[#6B7280]">{log.entityLabel}</span>
                    </TableCell>
                    <TableCell className="text-xs text-[#374151] max-w-md">{log.summary}</TableCell>
                  </TableRow>
                  {open && (
                    <TableRow className="bg-[#F9FAFB]">
                      <TableCell />
                      <TableCell colSpan={5} className="py-3">
                        {changes.length > 0 ? (
                          <ul className="space-y-1 text-xs">
                            {changes.map(([field, change]) => (
                              <li key={field} className="flex flex-wrap gap-x-2">
                                <span className="font-semibold text-[#111827] w-44 shrink-0">{field}</span>
                                <span className="text-[#6B7280]">{showValue(change.from)}</span>
                                <span className="text-[#9CA3AF]">→</span>
                                <span className="text-[#111827]">{showValue(change.to)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-[#6B7280]">No field details for this entry.</p>
                        )}
                        <p className="text-[11px] text-[#9CA3AF] mt-2">
                          {log.endpoint ? `${log.endpoint} · ` : ''}{log.ip ? `IP ${log.ip} · ` : ''}Record ID {log.entityId}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between text-xs text-[#6B7280]">
        <span>Page {page} of {data.totalPages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button size="sm" variant="outline" disabled={page >= data.totalPages || loading} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
