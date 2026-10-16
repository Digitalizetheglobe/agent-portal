import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Check,
  X,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { agentAPI } from '../../utils/api';
import { getOnboardingStatus } from '../../utils/onboarding';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Textarea } from '../ui/textarea';
import PhoneInput from '../forms/specialized/PhoneInput';

const agentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  // Both are optional here: agents who registered through an invite link have no User ID, and
  // an existing password is never sent back. onSubmit requires them when creating an agent.
  userId: z.string().nullish().refine(
    (v) => !v || (v.length >= 3 && /^[a-zA-Z0-9._]+$/.test(v)),
    'User ID must be at least 3 characters (letters, numbers, dots and underscores only)'
  ),
  password: z.string().nullish().refine(
    (v) => !v || (v.length >= 10 && /[A-Za-z]/.test(v) && /\d/.test(v)),
    'Password must be at least 10 characters and include a letter and a number'
  ),
  phone: z.string().min(10, 'Phone number must be at least 10 characters').regex(/^\+?[0-9]+$/, 'Phone number can only contain digits'),
  status: z.enum(['active', 'inactive']),
  agencyName: z.string().optional(),
  businessRegistrationNumber: z.string().optional(),
  fullAddress: z.string().optional(),
  region: z.string().optional(),
  accountManagerId: z.string().optional()
});

const AgentModal = ({ open, onOpenChange, agent, viewMode = false }) => {
  const { createAgent, updateAgent, agents, verifyAgent, viewAgentDocument } = useData();
  const { user } = useAuth();
  const isEditing = !!agent;
  // Account Managers own what they create; only other admins pick the manager
  const canAssignManager = user?.staffRole !== 'account_manager';
  const [accountManagers, setAccountManagers] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    setError,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      email: '',
      userId: '',
      password: '',
      phone: '',
      status: 'active',
      region: ''
    }
  });

  const status = watch('status');
  const accountManagerId = watch('accountManagerId');

  useEffect(() => {
    if (!open || !canAssignManager) return;
    agentAPI.getAccountManagers()
      .then(res => setAccountManagers(res.data))
      .catch(() => setAccountManagers([]));
  }, [open, canAssignManager]);

  // Reset form when modal opens/closes or agent changes
  useEffect(() => {
    if (open && agent) {
      reset({
        name: agent.name,
        email: agent.email,
        userId: agent.userId || '',
        password: '',
        phone: agent.phone,
        status: agent.status,
        agencyName: agent.agencyName || '',
        businessRegistrationNumber: agent.businessRegistrationNumber || '',
        fullAddress: agent.fullAddress || '',
        region: agent.region || '',
        accountManagerId: agent.accountManagerId || 'none'
      });
    } else if (open && !agent) {
      reset({
        name: '',
        email: '',
        userId: '',
        password: '',
        phone: '',
        status: 'active',
        agencyName: '',
        businessRegistrationNumber: '',
        fullAddress: '',
        region: '',
        accountManagerId: 'none'
      });
    }
  }, [open, agent, reset]);

  const onSubmit = async (data) => {
    // A new agent needs credentials; when editing, blank means "leave unchanged"
    if (!isEditing) {
      let missing = false;
      if (!data.userId) { setError('userId', { message: 'User ID is required' }); missing = true; }
      if (!data.password) { setError('password', { message: 'Password is required' }); missing = true; }
      if (missing) return;
    }

    // Check for duplicate userId (excluding current agent if editing)
    const existingAgent = agents.find(a =>
      (a.userId || '').toLowerCase() === (data.userId || '').toLowerCase() &&
      !!data.userId &&
      (!agent || a.id !== agent.id)
    );

    if (existingAgent) {
      toast.error('User ID already exists', {
        description: 'Please choose a different user ID.'
      });
      return;
    }

    // Check for duplicate email (excluding current agent if editing)
    const existingEmail = agents.find(a =>
      (a.email || '').toLowerCase() === (data.email || '').toLowerCase() &&
      !!data.email &&
      (!agent || a.id !== agent.id)
    );

    if (existingEmail) {
      toast.error('Email already exists', {
        description: 'Please use a different email address.'
      });
      return;
    }

    if (canAssignManager) {
      data.accountManagerId = data.accountManagerId && data.accountManagerId !== 'none' ? data.accountManagerId : null;
    } else {
      delete data.accountManagerId;
    }

    if (isEditing) {
      updateAgent(agent.id, data);
      toast.success('Agent updated', {
        description: `${data.name} has been updated successfully.`
      });
    } else {
      createAgent(data);
      toast.success('Agent created', {
        description: `${data.name} has been added as a new agent.`
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="agent-modal">
        <DialogHeader className="pb-2">
          <DialogTitle className="font-['Outfit']">
            {viewMode ? 'View Agent' : isEditing ? 'Edit Agent' : 'Create New Agent'}
          </DialogTitle>
          <DialogDescription>
            {viewMode
              ? 'Agent details and information'
              : isEditing
                ? 'Update the agent information below'
                : 'Fill in the details to create a new agent'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="account" className="w-full flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="account">Account Details</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <TabsContent value="account" className="space-y-4 mt-0">
              <form
                onSubmit={handleSubmit(onSubmit)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                  }
                }}
                className="space-y-4 pb-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="John Smith"
                      disabled={viewMode}
                      data-testid="agent-name-input"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="john@example.com"
                      disabled={viewMode}
                      data-testid="agent-email-input"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      {...register('userId')}
                      placeholder="john.smith"
                      disabled={viewMode || isEditing}
                      data-testid="agent-userid-input"
                    />
                    {errors.userId && (
                      <p className="text-sm text-destructive">{errors.userId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type={viewMode ? 'password' : 'text'}
                      {...register('password')}
                      placeholder={isEditing ? 'Leave blank to keep current' : '••••••'}
                      disabled={viewMode}
                      data-testid="agent-password-input"
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Controller
                      name="phone"
                      control={control}
                      render={({ field }) => (
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="+1 234 567 8900"
                          disabled={viewMode}
                        />
                      )}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={status}
                      onValueChange={(value) => setValue('status', value)}
                      disabled={viewMode}
                    >
                      <SelectTrigger data-testid="agent-status-select">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.status && (
                      <p className="text-sm text-destructive">{errors.status.message}</p>
                    )}
                  </div>

                  {canAssignManager && (
                    <div className="space-y-2">
                      <Label htmlFor="accountManagerId">Account Manager</Label>
                      <Select
                        value={accountManagerId || 'none'}
                        onValueChange={(value) => setValue('accountManagerId', value)}
                        disabled={viewMode}
                      >
                        <SelectTrigger data-testid="agent-account-manager-select">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {accountManagers.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-2 border-t mt-4">
                  <h4 className="text-sm font-semibold text-muted-foreground">Agency Information</h4>
                  <div className="space-y-2">
                    <Label htmlFor="agencyName">Agency Name</Label>
                    <Input
                      id="agencyName"
                      {...register('agencyName')}
                      placeholder="Global Education Agency"
                      disabled={viewMode}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessRegistrationNumber">Registration #</Label>
                      <Input
                        id="businessRegistrationNumber"
                        {...register('businessRegistrationNumber')}
                        placeholder="REG123456"
                        disabled={viewMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
                      <Input
                        id="region"
                        {...register('region')}
                        placeholder="North America"
                        disabled={viewMode}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullAddress">Full Address</Label>
                    <Input
                      id="fullAddress"
                      {...register('fullAddress')}
                      placeholder="123 Education Lane, NY"
                      disabled={viewMode}
                    />
                  </div>
                </div>

                {!viewMode && (
                  <DialogFooter className="pt-4 border-t mt-6 -mx-2 px-2 sticky bottom-0 bg-background">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      data-testid="agent-modal-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      data-testid="agent-modal-submit"
                    >
                      {isSubmitting ? 'Saving...' : isEditing ? 'Update Agent' : 'Create Agent'}
                    </Button>
                  </DialogFooter>
                )}

                {viewMode && (
                  <DialogFooter className="pt-4 border-t mt-6 -mx-2 px-2 sticky bottom-0 bg-background">
                    <Button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      data-testid="agent-modal-close"
                      className="w-full sm:w-auto"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                )}
              </form>
            </TabsContent>

            <TabsContent value="verification" className="space-y-4 mt-0">
              {!agent ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="p-4 rounded-full bg-muted/50">
                    <Shield className="w-12 h-12 text-muted-foreground opacity-20" />
                  </div>
                  <div className="max-w-[280px]">
                    <p className="font-semibold text-lg font-['Outfit']">New Agent Account</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Verification documents can only be managed for existing accounts. Please save this agent first.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {/* Overall Verification Status */}
                  <div className={`p-4 rounded-lg border-l-4 flex items-center justify-between ${agent.isVerified ? 'bg-emerald-50 border-l-emerald-500 dark:bg-emerald-900/10' : 'bg-amber-50 border-l-amber-500 dark:bg-amber-900/10'}`}>
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

                  {/* Documents Section */}
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
                          <Card key={doc._id} className="overflow-hidden border-muted">
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
                                    onClick={() => verifyAgent(agent.id, { documentId: doc._id, documentStatus: 'approved' })}
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
                                        verifyAgent(agent.id, { documentId: doc._id, documentStatus: 'rejected', remarks });
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
      </DialogContent>
    </Dialog>
  );
};

export default AgentModal;
