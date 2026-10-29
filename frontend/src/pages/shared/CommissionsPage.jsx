import React, { useMemo, useState } from 'react';
import { Pencil, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { useAuth } from '../../context/AuthContext';
import useAllUniversities from '../../hooks/useAllUniversities';
import { universityAPI, formatApiError } from '../../utils/api';
import { canManagePipeline } from '../../utils/pipeline';
import { cn } from '../../lib/utils';

// How a university's commission is paid: a percentage of the tuition, or a fixed amount per student
const TYPES = [
  { value: 'percentage', title: 'Percentage', hint: 'A % of the tuition fee' },
  { value: 'fixed', title: 'Fixed amount', hint: 'The same amount for each student' },
];

const money = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

// What the agent earns, in words: "5% of tuition", "500 per student", or null when not set
const describeCommission = (u) => {
  if (u.commissionType === 'fixed') {
    return u.commissionFixedAmount != null ? `${money(u.commissionFixedAmount)} per student` : null;
  }
  return u.commissionRate != null ? `${u.commissionRate}% of tuition` : null;
};

// Commission lives on its own page, apart from university, program and fee information.
// Agents only view it; the super admin and Head of Admission edit it.
const CommissionsPage = () => {
  const { user } = useAuth();
  const canEdit = canManagePipeline(user);
  const { universities: loaded, loading } = useAllUniversities();
  // Changes saved on this page, applied over the loaded list
  const [saved, setSaved] = useState({});
  const universities = useMemo(
    () => loaded.map((u) => (u.id in saved ? { ...u, ...saved[u.id] } : u)),
    [loaded, saved]
  );
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [type, setType] = useState('percentage');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return universities
      .filter((u) => !term || (u.name || '').toLowerCase().includes(term))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [universities, search]);

  const openEdit = (u) => {
    const t = u.commissionType === 'fixed' ? 'fixed' : 'percentage';
    setEditing(u);
    setType(t);
    setValue(String(t === 'fixed' ? (u.commissionFixedAmount ?? '') : (u.commissionRate ?? '')));
  };

  const save = async () => {
    const amount = value === '' ? null : parseFloat(value);
    if (amount !== null && !(amount > 0)) {
      toast.error('Enter an amount greater than 0');
      return;
    }
    if (type === 'percentage' && amount !== null && amount > 100) {
      toast.error('A percentage cannot be more than 100');
      return;
    }
    setSaving(true);
    try {
      const body = type === 'fixed'
        ? { commissionType: 'fixed', commissionFixedAmount: amount }
        : { commissionType: 'percentage', commissionRate: amount };
      const { data } = await universityAPI.update(editing.id, body);
      setSaved((prev) => ({
        ...prev,
        [editing.id]: {
          commissionType: data.commissionType,
          commissionRate: data.commissionRate,
          commissionFixedAmount: data.commissionFixedAmount,
        },
      }));
      toast.success('Commission updated', { description: editing.name });
      setEditing(null);
    } catch (error) {
      toast.error('Could not update the commission', { description: formatApiError(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-6xl space-y-6" data-testid="commissions-page">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Commission</h1>
        <p className="text-sm text-[#6B7280] mt-1.5">
          {canEdit
            ? 'What each university pays agents: a percentage of the tuition, or a fixed amount per student.'
            : 'What you earn for each student, by university.'}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Search university"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-white"
        />
      </div>

      <Card className="border-[#E5E7EB] shadow-none bg-white overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">University</TableHead>
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Country</TableHead>
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Commission</TableHead>
                {canEdit && <TableHead className="px-6 py-4 w-20"><span className="sr-only">Edit</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-[#6B7280] py-10">Loading...</TableCell></TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-[#6B7280] py-10">No universities found</TableCell></TableRow>
              )}
              {rows.map((u) => {
                const text = describeCommission(u);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="px-6 py-4 font-medium text-[#111827]">{u.name}</TableCell>
                    <TableCell className="px-6 py-4 text-[#4B5563]">{u.country || '-'}</TableCell>
                    <TableCell className="px-6 py-4">
                      {text ? (
                        <span className="inline-flex items-center rounded-full bg-[#EAF3DE] px-3 py-1 text-xs font-semibold text-[#27500A]">{text}</span>
                      ) : (
                        <span className="text-sm text-[#9CA3AF]">{canEdit ? 'Not set' : 'On request'}</span>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="px-6 py-4 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)} aria-label={`Edit commission for ${u.name}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Outfit']">Commission</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-3">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setType(t.value); setValue(''); }}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-colors',
                    type === t.value ? 'border-[#042C53] bg-[#E6F1FB]/60 ring-1 ring-[#042C53]' : 'border-[#E5E7EB] hover:border-[#9CA3AF]'
                  )}
                >
                  <p className="text-sm font-semibold text-[#111827]">{t.title}</p>
                  <p className="text-xs text-[#6B7280] mt-1">{t.hint}</p>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="commissionValue">{type === 'fixed' ? 'Amount per student' : 'Percentage of tuition'}</Label>
              <div className="relative">
                <Input
                  id="commissionValue"
                  type="number"
                  min="0"
                  max={type === 'percentage' ? 100 : undefined}
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === 'fixed' ? 'e.g. 500' : 'e.g. 10'}
                  className="h-11 pr-10"
                  autoFocus
                />
                {type === 'percentage' && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">%</span>}
              </div>
              <p className="text-xs text-[#6B7280]">
                {type === 'fixed'
                  ? 'Paid in the currency of the invoice. Leave empty to clear it.'
                  : 'Leave empty to clear it.'}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-[#042C53] hover:bg-[#0C447C] text-white">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommissionsPage;
