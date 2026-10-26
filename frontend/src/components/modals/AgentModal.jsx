import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { agentAPI } from '../../utils/api';
import { getOnboardingStatus } from '../../utils/onboarding';
import { APPLICATION_GROUPS, applicationStateFromUser, isFieldRequired } from '../../utils/agentApplication';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Textarea } from '../ui/textarea';
import PhoneInput from '../forms/specialized/PhoneInput';
import { COUNTRIES } from '../../utils/countries';

// Same field spec as the agent registration page, one small topic per step
const STEPS = [
  { id: 1, title: 'Agency', groups: ['applicant'] },
  { id: 2, title: 'Contacts', groups: ['contacts'] },
  { id: 3, title: 'Bank', groups: ['relative', 'bank'] },
  { id: 4, title: 'Login', groups: [] },
];
const LAST = STEPS.length;
// Hidden until asked for, so the first step stays short
const OPTIONAL_KEYS = ['website', 'fax'];

const emptyAccount = { name: '', email: '', phone: '', userId: '', password: '', status: 'active', accountManagerId: 'none' };

// A field is shown unless it only applies to the other agent type
const isVisible = (field, agentType) =>
  !['company', 'individual'].includes(field.required) || field.required === agentType;

const labelClass = 'text-xs font-semibold text-slate-700';

const AgentModal = ({ open, onOpenChange, agent, viewMode = false }) => {
  const { createAgent, updateAgent, agents, verifyAgent, viewAgentDocument } = useData();
  const { user } = useAuth();
  const isEditing = !!agent;
  // Account Managers own what they create; only other admins pick the manager
  const canAssignManager = user?.staffRole !== 'account_manager';
  const [accountManagers, setAccountManagers] = useState([]);
  const [step, setStep] = useState(1);
  const [account, setAccount] = useState(emptyAccount);
  const [app, setApp] = useState(applicationStateFromUser({ agentType: 'company' }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Bank details are withheld by the API from staff without a payout role
  const bankHidden = isEditing && !('bankName' in agent);
  const groups = useMemo(
    () => APPLICATION_GROUPS.filter(g => !(g.id === 'bank' && bankHidden)),
    [bankHidden]
  );

  useEffect(() => {
    if (!open || !canAssignManager) return;
    agentAPI.getAccountManagers()
      .then(res => setAccountManagers(res.data))
      .catch(() => setAccountManagers([]));
  }, [open, canAssignManager]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setErrors({});
    setShowMore(false);
    if (agent) {
      setAccount({
        name: agent.name || '',
        email: agent.email || '',
        phone: agent.phone || '',
        userId: agent.userId || '',
        password: '',
        status: agent.status || 'active',
        accountManagerId: agent.accountManagerId || 'none',
      });
      setApp(applicationStateFromUser({ agentType: 'company', ...agent }));
    } else {
      setAccount(emptyAccount);
      setApp(applicationStateFromUser({ agentType: 'company' }));
    }
  }, [open, agent]);

  const setAcc = (key) => (e) => setAccount(a => ({ ...a, [key]: e.target.value }));
  const setApplication = (key, value) => setApp(a => ({ ...a, [key]: value }));
  const fieldError = (key) => errors[key] && <p className="text-xs text-red-600">{errors[key]}</p>;

  // Returns an error map for one step. New agents must complete every required field;
  // when editing, only the basics are enforced so older records are never blocked.
  const validateStep = (n) => {
    const e = {};
    if (n === 1 && app.agentType === 'individual' && account.name.trim().length < 2) e.name = 'Full name is required';
    if (n === 2) {
      if (app.agentType === 'company' && !isEditing && !app.contactPerson.trim()) e.contactPerson = 'Contact person is required';
      if (!/\S+@\S+\.\S+/.test(account.email)) e.email = 'Enter a valid email address';
      if (!/^\+?[0-9]{10,}$/.test((account.phone || '').replace(/[\s-]/g, ''))) e.phone = 'Enter a phone number with at least 10 digits';
    }
    if (n === LAST) {
      if (!isEditing && !/^[a-zA-Z0-9._]{3,}$/.test(account.userId)) {
        e.userId = 'At least 3 characters: letters, numbers, dots, underscores';
      }
      if ((!isEditing || account.password) &&
          (account.password.length < 10 || !/[A-Za-z]/.test(account.password) || !/\d/.test(account.password))) {
        e.password = 'At least 10 characters with a letter and a number';
      }
    }
    if (!isEditing) {
      for (const g of groups.filter(g => STEPS[n - 1].groups.includes(g.id))) {
        for (const f of g.fields) {
          if (!isVisible(f, app.agentType) || (f.showIf && !f.showIf(app))) continue;
          if (isFieldRequired(f, app.agentType) && !String(app[f.key] ?? '').trim()) e[f.key] = `${f.label} is required`;
        }
      }
      if (n === 3 && app.isRelativeOfEmployee && !app.relativeName.trim()) e.relativeName = 'Enter the employee name';
    }
    return e;
  };

  const goNext = () => {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep(s => s + 1);
  };

  const canJump = viewMode || isEditing;
  const goToStep = (n) => {
    if (n <= step || canJump) { setErrors({}); setStep(n); }
  };

  const onSubmit = async () => {
    // Re-check every step so nothing is skipped
    const perStep = STEPS.map(s => validateStep(s.id));
    const firstBad = perStep.findIndex(e => Object.keys(e).length);
    if (firstBad !== -1) {
      setErrors(Object.assign({}, ...perStep));
      setStep(firstBad + 1);
      return;
    }

    if (!isEditing && agents.some(a => (a.userId || '').toLowerCase() === account.userId.toLowerCase())) {
      setErrors({ userId: 'This User ID is already taken' });
      return;
    }
    if (agents.some(a => (a.email || '').toLowerCase() === account.email.toLowerCase() && (!agent || a.id !== agent.id))) {
      setErrors({ email: 'This email is already registered' });
      setStep(2);
      return;
    }

    // Blank fields are left out so they never overwrite or fail validation on older records
    const allFields = groups.flatMap(g => g.fields);
    const application = Object.fromEntries(
      Object.entries(app).filter(([k, v]) => {
        const f = allFields.find(x => x.key === k);
        if (!f || !isVisible(f, app.agentType)) return false;
        return k === 'isRelativeOfEmployee' || (typeof v === 'string' ? v.trim() !== '' : v != null);
      })
    );
    const payload = {
      ...application,
      name: app.agentType === 'company' ? (app.contactPerson || agent?.name || '').trim() : account.name.trim(),
      email: account.email.trim(),
      phone: account.phone,
      status: account.status,
    };
    if (!isEditing) payload.userId = account.userId;
    if (account.password) payload.password = account.password;
    if (canAssignManager) {
      payload.accountManagerId = account.accountManagerId !== 'none' ? account.accountManagerId : null;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await updateAgent(agent.id, payload);
        toast.success('Agent updated', { description: `${payload.name} has been updated.` });
      } else {
        await createAgent(payload);
        toast.success('Agent created', { description: `${payload.name} has been added as a new agent.` });
      }
      onOpenChange(false);
    } catch {
      // error toast already shown
    } finally {
      setSaving(false);
    }
  };

  const renderField = (f) => {
    if (!isVisible(f, app.agentType) || (f.showIf && !f.showIf(app))) return null;
    if (OPTIONAL_KEYS.includes(f.key) && !showMore && !app[f.key]) return null;
    const required = isFieldRequired(f, app.agentType) && !isEditing;
    const wide = f.wide || f.type === 'textarea' || f.type === 'agentType';

    if (f.type === 'agentType') {
      return (
        <div key={f.key} className="sm:col-span-2 space-y-2">
          <Label className={labelClass}>Agent type</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'company', title: 'Company' },
              { id: 'individual', title: 'Individual' },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                disabled={viewMode}
                onClick={() => setApplication('agentType', t.id)}
                className={cn(
                  'px-4 py-3 rounded-lg border text-sm font-medium transition-colors disabled:opacity-70',
                  app.agentType === t.id ? 'border-[#0C447C] bg-[#E6F1FB] text-[#0C447C]' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      );
    }

    let control;
    if (f.type === 'yesNo') {
      control = (
        <div className="flex gap-6 pt-1">
          {[['No', false], ['Yes', true]].map(([text, val]) => (
            <label key={text} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={f.key}
                disabled={viewMode}
                checked={!!app[f.key] === val}
                onChange={() => setApp(a => ({ ...a, [f.key]: val, ...(val ? {} : { relativeName: '' }) }))}
              />
              {text}
            </label>
          ))}
        </div>
      );
    } else if (f.type === 'country') {
      control = (
        <Select value={app[f.key] || ''} onValueChange={(v) => setApplication(f.key, v)} disabled={viewMode}>
          <SelectTrigger id={f.key}><SelectValue placeholder="Select country" /></SelectTrigger>
          <SelectContent className="max-h-60">
            {COUNTRIES.map(c => <SelectItem key={c.code} value={c.name}>{c.name} ({c.code})</SelectItem>)}
          </SelectContent>
        </Select>
      );
    } else if (f.type === 'textarea') {
      control = (
        <Textarea id={f.key} rows={2} className="resize-none" value={app[f.key] ?? ''} placeholder={f.placeholder}
          disabled={viewMode} onChange={(e) => setApplication(f.key, e.target.value)} />
      );
    } else {
      control = (
        <Input id={f.key} value={app[f.key] ?? ''} placeholder={f.placeholder}
          disabled={viewMode} onChange={(e) => setApplication(f.key, e.target.value)} />
      );
    }
    return (
      <div key={f.key} className={cn('space-y-2', wide && 'sm:col-span-2')}>
        <Label htmlFor={f.key} className={labelClass}>
          {f.label}{required && <span className="text-red-500"> *</span>}
        </Label>
        {control}
        {fieldError(f.key)}
      </div>
    );
  };

  const emailPhone = (
    <>
      <div className="space-y-2">
        <Label htmlFor="email" className={labelClass}>Email <span className="text-red-500">*</span></Label>
        <Input id="email" type="email" value={account.email} onChange={setAcc('email')} placeholder="name@company.com" disabled={viewMode} data-testid="agent-email-input" />
        {fieldError('email')}
      </div>
      <div className="space-y-2">
        <Label className={labelClass}>Phone <span className="text-red-500">*</span></Label>
        <PhoneInput value={account.phone} onChange={(v) => setAccount(a => ({ ...a, phone: v }))} placeholder="+60 12-345 6789" disabled={viewMode} />
        {fieldError('phone')}
      </div>
    </>
  );

  const renderGroup = (g) => (
    <section key={g.id} className="space-y-5">
      {g.id !== 'applicant' && g.id !== 'contacts' && (
        <h4 className="text-sm font-semibold text-slate-900">{g.title}</h4>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        {g.fields.map(renderField)}
        {g.id === 'applicant' && app.agentType === 'individual' && (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name" className={labelClass}>Full name <span className="text-red-500">*</span></Label>
            <Input id="name" value={account.name} onChange={setAcc('name')} placeholder="As on passport / NRIC" disabled={viewMode} data-testid="agent-name-input" />
            {fieldError('name')}
          </div>
        )}
        {g.id === 'applicant' && !viewMode && !showMore && (
          <button type="button" onClick={() => setShowMore(true)} className="sm:col-span-2 text-left text-xs font-medium text-[#0C447C] hover:underline">
            + Add website or fax (optional)
          </button>
        )}
      </div>
    </section>
  );

  const stepBody = () => {
    if (step === LAST) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
          <div className="space-y-2">
            <Label htmlFor="userId" className={labelClass}>User ID {!isEditing && <span className="text-red-500">*</span>}</Label>
            <Input id="userId" value={account.userId} onChange={setAcc('userId')} placeholder="john.smith" disabled={viewMode || isEditing} data-testid="agent-userid-input" />
            {fieldError('userId')}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className={labelClass}>Password {!isEditing && <span className="text-red-500">*</span>}</Label>
            <Input id="password" type={viewMode ? 'password' : 'text'} value={account.password} onChange={setAcc('password')}
              placeholder={isEditing ? 'Leave blank to keep current' : 'Min 10 characters'} disabled={viewMode} data-testid="agent-password-input" />
            {fieldError('password')}
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>Status</Label>
            <Select value={account.status} onValueChange={(v) => setAccount(a => ({ ...a, status: v }))} disabled={viewMode}>
              <SelectTrigger data-testid="agent-status-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>Account Manager</Label>
            {canAssignManager ? (
              <Select value={account.accountManagerId} onValueChange={(v) => setAccount(a => ({ ...a, accountManagerId: v }))} disabled={viewMode}>
                <SelectTrigger data-testid="agent-account-manager-select"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {accountManagers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-slate-700 border border-slate-200 rounded-md bg-slate-50 px-3 py-2">You</p>
            )}
          </div>
        </div>
      );
    }
    const wanted = STEPS[step - 1].groups;
    return (
      <div className="space-y-8">
        {groups.filter(g => wanted.includes(g.id)).map(renderGroup)}
        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">{emailPhone}</div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-8" data-testid="agent-modal">
        <DialogHeader className="pb-2">
          <DialogTitle className="font-['Outfit'] text-xl">
            {viewMode ? 'Agent details' : isEditing ? 'Edit agent' : 'New agent'}
          </DialogTitle>
          <DialogDescription>
            {viewMode ? 'Everything captured on the agent application' : 'Fields marked * are required.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="account" className="w-full flex-1 overflow-hidden flex flex-col">
          {isEditing && (
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="account">Application</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
            </TabsList>
          )}

          <div className="flex-1 overflow-y-auto px-1 -mx-1">
            <TabsContent value="account" className="mt-0 space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">
                  Step {step} of {LAST} <span className="text-slate-300 mx-1">/</span>
                  <span className="font-semibold text-slate-900">{STEPS[step - 1].title}</span>
                </p>
                <div className="flex gap-1.5">
                  {STEPS.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      aria-label={s.title}
                      onClick={() => goToStep(s.id)}
                      className={cn('h-1.5 flex-1 rounded-full transition-colors', s.id <= step ? 'bg-[#0C447C]' : 'bg-slate-200')}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 pb-4">{stepBody()}</div>
            </TabsContent>

            <TabsContent value="verification" className="space-y-4 mt-0">
              {agent && (
                <div className="space-y-6 pb-4">
                  <div className={`p-4 rounded-lg border-l-4 flex items-center justify-between ${agent.isVerified ? 'bg-emerald-50 border-l-emerald-500' : 'bg-amber-50 border-l-amber-500'}`}>
                    <div className="flex items-center gap-3">
                      {agent.isVerified ? (
                        <ShieldCheck className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="w-6 h-6 text-amber-600" />
                      )}
                      <div>
                        <p className="font-semibold text-sm">Status: {getOnboardingStatus(agent).label}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.isVerified ? 'This agent is fully compliant' : 'Pending identity/business verification'}
                        </p>
                      </div>
                    </div>
                    <Badge className={`border-none ${getOnboardingStatus(agent).style}`}>
                      {getOnboardingStatus(agent).label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-4">
                    Approve, reject or return the application from the agent details panel (Head of Recruitment).
                  </p>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Compliance Documents ({agent.verificationDocuments?.length || 0})
                    </h4>

                    {(!agent.verificationDocuments || agent.verificationDocuments.length === 0) ? (
                      <div className="text-center py-6 border rounded-lg border-dashed">
                        <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {agent.verificationDocuments.map((doc) => (
                          <Card key={doc._id || doc.id} className="overflow-hidden border-muted">
                            <CardContent className="p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{doc.docType}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <Badge
                                  variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}
                                  className={doc.status === 'approved' ? 'bg-emerald-500' : ''}
                                >
                                  {doc.status}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between bg-muted/30 p-2 rounded text-xs">
                                <span className="truncate max-w-[200px]">{doc.fileName}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-primary hover:text-primary"
                                  onClick={() => viewAgentDocument(agent.id, doc._id || doc.id)}
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </div>

                              {doc.remarks && (
                                <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded">
                                  <strong>Remarks:</strong> {doc.remarks}
                                </div>
                              )}

                              {!viewMode && doc.status === 'pending' && (
                                <div className="flex gap-2 pt-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                    onClick={() => verifyAgent(agent.id, { documentId: doc._id || doc.id, documentStatus: 'approved' })}
                                  >
                                    <Check className="w-3 h-3 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      const remarks = prompt('Enter rejection reason:');
                                      if (remarks) {
                                        verifyAgent(agent.id, { documentId: doc._id || doc.id, documentStatus: 'rejected', remarks });
                                      }
                                    }}
                                  >
                                    <X className="w-3 h-3 mr-1" /> Reject
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="pt-4 border-t sm:justify-between gap-2">
          <Button type="button" variant="outline" onClick={() => (step > 1 ? goToStep(step - 1) : onOpenChange(false))} data-testid="agent-modal-cancel">
            {step > 1 ? <><ArrowLeft className="w-4 h-4 mr-1.5" /> Back</> : (viewMode ? 'Close' : 'Cancel')}
          </Button>
          <div className="flex gap-2">
            {step < LAST && (
              <Button
                type="button"
                onClick={canJump ? () => setStep(s => s + 1) : goNext}
                variant={canJump && !viewMode ? 'outline' : 'default'}
                className={cn(!(canJump && !viewMode) && 'bg-[#0C447C] hover:bg-[#083058] text-white')}
              >
                Next <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
            {!viewMode && (step === LAST || isEditing) && (
              <Button type="button" onClick={onSubmit} disabled={saving} className="bg-[#0C447C] hover:bg-[#083058] text-white" data-testid="agent-modal-submit">
                {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Create agent'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgentModal;
