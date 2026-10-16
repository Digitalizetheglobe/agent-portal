import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { onboardingAPI, agentAPI, formatApiError } from '../../utils/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../lib/utils';

const STATE_STYLES = {
  pending: 'bg-[#FAEEDA] text-[#633806]',
  used: 'bg-[#EAF3DE] text-[#27500A]',
  expired: 'bg-slate-100 text-slate-500',
  revoked: 'bg-[#FCEBEB] text-[#A32D2D]',
};

const EMPTY_FORM = { email: '', name: '', accountManagerId: 'none', expiresInDays: '7' };

const InviteAgentDialog = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  // Account Managers own what they invite; other staff choose the owner
  const canPickManager = user?.staffRole !== 'account_manager';

  const [form, setForm] = useState(EMPTY_FORM);
  const [managers, setManagers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadInvites = useCallback(async () => {
    try {
      const res = await onboardingAPI.getInvites();
      setInvites(res.data);
    } catch {
      setInvites([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setCreated(null);
    setCopied(false);
    loadInvites();
    if (canPickManager) {
      agentAPI.getAccountManagers().then(res => setManagers(res.data)).catch(() => setManagers([]));
    }
  }, [open, canPickManager, loadInvites]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        email: form.email.trim() || undefined,
        name: form.name.trim() || undefined,
        expiresInDays: Number(form.expiresInDays),
      };
      if (canPickManager && form.accountManagerId !== 'none') {
        payload.accountManagerId = form.accountManagerId;
      }
      const res = await onboardingAPI.createInvite(payload);
      setCreated(res.data);
      toast.success(res.data.emailSent ? 'Invite created and emailed' : 'Invite link created');
      loadInvites();
    } catch (err) {
      toast.error('Could not create invite', { description: formatApiError(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(created.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed. Select the link and copy it manually.');
    }
  };

  const revoke = async (id) => {
    try {
      await onboardingAPI.revokeInvite(id);
      loadInvites();
    } catch (err) {
      toast.error('Could not revoke invite', { description: formatApiError(err) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" data-testid="invite-agent-dialog">
        <DialogHeader>
          <DialogTitle className="font-['Outfit']">Send registration link</DialogTitle>
          <DialogDescription>
            Create a personal, single-use link. The agent opens it, fills in their application and uploads their documents.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-3">
            <Label>Registration link</Label>
            <div className="flex gap-2">
              <Input readOnly value={created.link} onFocus={(e) => e.target.select()} />
              <Button type="button" variant="outline" onClick={copyLink} className="gap-2 shrink-0">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {created.emailSent ? `Also emailed to ${created.email}. ` : ''}
              Expires {new Date(created.expiresAt).toLocaleDateString()}. This link is shown only once, so copy it now.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => { setCreated(null); setForm(EMPTY_FORM); }}>
              Create another
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Agent name (optional)</Label>
                <Input id="invite-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Agent email (optional)</Label>
                <Input id="invite-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="agent@company.com" />
              </div>
              {canPickManager && (
                <div className="space-y-2">
                  <Label>Account Manager</Label>
                  <Select value={form.accountManagerId} onValueChange={v => setForm({ ...form, accountManagerId: v })}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Link valid for</Label>
                <Select value={form.expiresInDays} onValueChange={v => setForm({ ...form, expiresInDays: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['3', '7', '14', '30'].map(d => <SelectItem key={d} value={d}>{d} days</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              If you enter an email, the link is emailed and the agent can only register with that address.
            </p>
            <Button type="submit" disabled={submitting} className="bg-[#042C53] hover:bg-[#0C447C] text-white gap-2">
              <Link2 size={14} /> {submitting ? 'Creating...' : 'Create link'}
            </Button>
          </form>
        )}

        {invites.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent invites</h4>
            <ul className="divide-y">
              {invites.slice(0, 8).map(inv => (
                <li key={inv.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inv.email || inv.name || 'Open link'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString()}
                      {inv.accountManager ? ` · ${inv.accountManager.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize', STATE_STYLES[inv.state])}>
                      {inv.state}
                    </span>
                    {inv.state === 'pending' && (
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => revoke(inv.id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteAgentDialog;
