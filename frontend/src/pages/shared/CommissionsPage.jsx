import React, { useMemo, useState } from 'react';
import { Percent, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
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

// Commission lives on its own page, apart from university, program and fee information.
// Agents only view it; the super admin and Head of Admission edit it.
const CommissionsPage = () => {
  const { user } = useAuth();
  const canEdit = canManagePipeline(user);
  const { universities: loaded, loading } = useAllUniversities();
  // Rates saved on this page, applied over the loaded list
  const [saved, setSaved] = useState({});
  const universities = useMemo(
    () => loaded.map((u) => (u.id in saved ? { ...u, commissionRate: saved[u.id] } : u)),
    [loaded, saved]
  );
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return universities
      .filter((u) => !term || (u.name || '').toLowerCase().includes(term))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [universities, search]);

  const startEdit = (u) => {
    setEditingId(u.id);
    setDraft(u.commissionRate != null ? String(u.commissionRate) : '');
  };

  const save = async (u) => {
    const rate = draft === '' ? null : parseFloat(draft);
    if (rate !== null && (!(rate > 0) || rate > 100)) {
      toast.error('Commission must be a percentage above 0 and at most 100');
      return;
    }
    setSaving(true);
    try {
      const { data } = await universityAPI.update(u.id, { commissionRate: rate });
      setSaved((prev) => ({ ...prev, [u.id]: data.commissionRate }));
      toast.success('Commission updated', { description: u.name });
      setEditingId(null);
    } catch (error) {
      toast.error('Could not update the commission', { description: formatApiError(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="commissions-page">
      <div>
        <h1 className="text-2xl font-bold text-[#111827] font-['Outfit']">Commission</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          {canEdit
            ? 'The commission rate paid to agents for each university, as a percentage of tuition.'
            : 'The commission you earn for each university, as a percentage of tuition.'}
        </p>
      </div>

      <Input
        placeholder="Search university"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card className="border-[#E5E7EB] shadow-none bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>University</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Commission</TableHead>
                {canEdit && <TableHead className="text-right"><span className="sr-only">Edit</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-[#6B7280] py-8">Loading...</TableCell></TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-[#6B7280] py-8">No universities found</TableCell></TableRow>
              )}
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-[#111827]">{u.name}</TableCell>
                  <TableCell className="text-[#4B5563]">{u.country || '-'}</TableCell>
                  <TableCell>
                    {editingId === u.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="h-8 w-24"
                          autoFocus
                        />
                        <span className="text-sm text-[#6B7280]">%</span>
                      </div>
                    ) : u.commissionRate != null ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#27500A]">
                        <Percent className="w-3.5 h-3.5" />{u.commissionRate}%
                      </span>
                    ) : (
                      <span className="text-[#9CA3AF]">{canEdit ? 'Not set' : 'On request'}</span>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      {editingId === u.id ? (
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="outline" disabled={saving} onClick={() => save(u)} aria-label="Save"><Check className="w-4 h-4" /></Button>
                          <Button size="sm" variant="outline" disabled={saving} onClick={() => setEditingId(null)} aria-label="Cancel"><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(u)} aria-label={`Edit commission for ${u.name}`}><Pencil className="w-4 h-4" /></Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionsPage;
