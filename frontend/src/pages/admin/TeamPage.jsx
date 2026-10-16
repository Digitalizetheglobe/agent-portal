import React, { useState, useEffect, useCallback } from 'react';
import { UsersRound, Plus, Pencil, KeyRound, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { staffAPI, agentAPI, formatApiError } from '../../utils/api';
import { STAFF_ROLE_LABELS } from '../../utils/staffRoles';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '../../components/ui/dialog';

const ROLE_BLURB = {
  account_manager: 'Looks after a set of agents and recommends their applications.',
  head_recruitment: 'Verifies agent applications.',
  head_admission: 'Final approval, contracts, visa stages, invoices, university content.',
  accounts: 'Records payments and pays agents.',
  super: 'Full access, including this page.'
};
const ROLE_ORDER = ['super', 'head_admission', 'head_recruitment', 'accounts', 'account_manager'];
const roleKey = (s) => s.staffRole || 'super';
const roleName = (s) => (s.staffRole ? STAFF_ROLE_LABELS[s.staffRole] : 'Super Admin');

// Password box with an eye button to show or hide what was typed
const PasswordInput = ({ value, onChange }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className="pr-10" autoComplete="new-password" value={value} onChange={onChange} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-700"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

const selectClass = 'h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm';
const emptyNew = { name: '', email: '', phone: '', staffRole: 'account_manager', password: '' };

const TeamPage = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);       // new staff form
  const [editing, setEditing] = useState(null);     // { member, name, phone, staffRole, status, reassignTo }
  const [needsReassign, setNeedsReassign] = useState(null); // count of agents when the server asks
  const [resetting, setResetting] = useState(null); // { member, password }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStaff((await staffAPI.list()).data);
    } catch (error) {
      toast.error('Could not load the team', { description: formatApiError(error) });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const activeManagers = (exceptId) => staff.filter((s) => s.staffRole === 'account_manager' && s.status === 'active' && s.id !== exceptId);

  const create = async () => {
    setBusy(true);
    try {
      await agentAPI.createAdmin({ ...adding, staffRole: adding.staffRole === 'super' ? undefined : adding.staffRole });
      toast.success(`Account created for ${adding.name}`);
      setAdding(null);
      load();
    } catch (error) {
      toast.error('Could not create the account', { description: formatApiError(error) });
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (member) => {
    setNeedsReassign(null);
    setEditing({ member, name: member.name, phone: member.phone || '', staffRole: member.staffRole || 'super', status: member.status, reassignTo: '' });
  };

  const saveEdit = async () => {
    const { member, name, phone, staffRole, status, reassignTo } = editing;
    const payload = { name, phone, staffRole: staffRole === 'super' ? null : staffRole, status };
    if (needsReassign) payload.reassignAgentsTo = reassignTo || null;
    setBusy(true);
    try {
      await staffAPI.update(member.id, payload);
      toast.success('Saved');
      setEditing(null);
      setNeedsReassign(null);
      load();
    } catch (error) {
      if (error.response && error.response.status === 409 && error.response.data.code === 'AGENTS_ASSIGNED') {
        setNeedsReassign(error.response.data.agentCount);
        toast.message(error.response.data.detail);
      } else {
        toast.error('Could not save', { description: formatApiError(error) });
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await staffAPI.resetPassword(resetting.member.id, resetting.password);
      toast.success(`Password changed for ${resetting.member.name}. Share it with them securely.`);
      setResetting(null);
    } catch (error) {
      toast.error('Could not change the password', { description: formatApiError(error) });
    } finally {
      setBusy(false);
    }
  };

  const grouped = ROLE_ORDER.map((key) => ({ key, members: staff.filter((s) => roleKey(s) === key) }));

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight flex items-center gap-2">
            <UsersRound size={22} className="text-[#042C53]" /> Team
          </h1>
          <p className="text-sm text-gray-500 mt-1">Your staff and what each person can do. Only the super admin sees this page.</p>
        </div>
        <Button className="gap-1" onClick={() => setAdding({ ...emptyNew })}><Plus size={16} /> Add staff</Button>
      </div>

      {/* Who does what */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {grouped.map(({ key, members }) => (
          <Card key={key} className="border-[#E5E7EB] bg-white shadow-none p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{key === 'super' ? 'Super Admin' : STAFF_ROLE_LABELS[key]}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{members.filter((m) => m.status === 'active').length}</p>
            <p className="text-xs text-gray-500 mt-1">{ROLE_BLURB[key]}</p>
          </Card>
        ))}
      </div>

      <Card className="border-[#E5E7EB] bg-white shadow-none overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.flatMap(({ members }) => members).map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}{member.id === user.id ? <span className="text-gray-400"> (you)</span> : null}</TableCell>
                  <TableCell>{roleName(member)}</TableCell>
                  <TableCell className="text-gray-600">{member.email}</TableCell>
                  <TableCell className="text-gray-600">{member.phone || '-'}</TableCell>
                  <TableCell>{member.agentCount != null ? member.agentCount : '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={member.status === 'active' ? 'border-emerald-200 text-emerald-700' : 'border-gray-200 text-gray-500'}>
                      {member.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => openEdit(member)}><Pencil size={14} /> Edit</Button>
                    {member.id !== user.id && (
                      <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => setResetting({ member, password: '' })}><KeyRound size={14} /> Password</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add staff */}
      <Dialog open={!!adding} onOpenChange={(open) => !open && setAdding(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add staff</DialogTitle></DialogHeader>
          {adding && (
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={adding.email} onChange={(e) => setAdding({ ...adding, email: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Phone (optional)</Label><Input value={adding.phone} onChange={(e) => setAdding({ ...adding, phone: e.target.value })} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <select className={selectClass} value={adding.staffRole} onChange={(e) => setAdding({ ...adding, staffRole: e.target.value })}>
                  {ROLE_ORDER.map((key) => <option key={key} value={key}>{key === 'super' ? 'Super Admin' : STAFF_ROLE_LABELS[key]}</option>)}
                </select>
                <p className="text-[11px] text-gray-500">{ROLE_BLURB[adding.staffRole]}</p>
              </div>
              <div className="space-y-1"><Label className="text-xs">Temporary password</Label><PasswordInput value={adding.password} onChange={(e) => setAdding({ ...adding, password: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(null)} disabled={busy}>Cancel</Button>
            <Button onClick={create} disabled={busy || !adding || !adding.name || !adding.email || !adding.password}>{busy ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit staff */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) { setEditing(null); setNeedsReassign(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {editing ? editing.member.name : ''}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <select className={selectClass} value={editing.staffRole} disabled={editing.member.id === user.id}
                  onChange={(e) => setEditing({ ...editing, staffRole: e.target.value })}>
                  {ROLE_ORDER.map((key) => <option key={key} value={key}>{key === 'super' ? 'Super Admin' : STAFF_ROLE_LABELS[key]}</option>)}
                </select>
                <p className="text-[11px] text-gray-500">{ROLE_BLURB[editing.staffRole]}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select className={selectClass} value={editing.status} disabled={editing.member.id === user.id}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive (cannot sign in)</option>
                </select>
              </div>
              {needsReassign ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1">
                  <Label className="text-xs">This person looks after {needsReassign} agent{needsReassign === 1 ? '' : 's'}. Who takes them over?</Label>
                  <select className={selectClass} value={editing.reassignTo} onChange={(e) => setEditing({ ...editing, reassignTo: e.target.value })}>
                    <option value="">Leave them unassigned</option>
                    {activeManagers(editing.member.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setNeedsReassign(null); }} disabled={busy}>Cancel</Button>
            <Button onClick={saveEdit} disabled={busy || !editing || !editing.name.trim()}>{busy ? 'Saving...' : needsReassign ? 'Confirm and save' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={!!resetting} onOpenChange={(open) => !open && setResetting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set a new password for {resetting ? resetting.member.name : ''}</DialogTitle></DialogHeader>
          {resetting && (
            <div className="space-y-1">
              <Label className="text-xs">New password</Label>
              <PasswordInput value={resetting.password} onChange={(e) => setResetting({ ...resetting, password: e.target.value })} />
              <p className="text-[11px] text-gray-500">Share it with them securely and ask them to change it from Settings.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetting(null)} disabled={busy}>Cancel</Button>
            <Button onClick={reset} disabled={busy || !resetting || !resetting.password}>{busy ? 'Saving...' : 'Change password'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPage;
