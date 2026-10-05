import React, { useState, useEffect } from 'react';
import { FileText, DollarSign, Percent, Link2, Check, AlertCircle, Building2, User, GraduationCap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { invoiceAPI, formatApiError } from '../../utils/api';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

/**
 * InvoiceModal allows agents (and admins) to raise commission invoices
 * for enrolled, invoice-eligible applications.
 */
const InvoiceModal = ({
  open,
  onOpenChange,
  preselectedApplication,
  onSuccess
}) => {
  const { fetchInvoices } = useData();
  const { user, isAdmin } = useAuth();

  const [eligibleApplications, setEligibleApplications] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [amount, setAmount] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Load eligible applications or set preselected
  useEffect(() => {
    if (!open) {
      setFormError('');
      return;
    }

    if (preselectedApplication) {
      const appId = preselectedApplication.id || preselectedApplication._id;
      setSelectedAppIds([appId]);
      setEligibleApplications([preselectedApplication]);
      const tuition = parseFloat(preselectedApplication.tuitionFee);
      if (isAdmin) {
        const rate = parseFloat(commissionRate);
        if (!isNaN(rate) && rate > 0 && !isNaN(tuition) && tuition > 0) {
          setAmount((tuition * (rate / 100)).toFixed(2));
        } else {
          setAmount('');
        }
      } else {
        setCommissionRate('');
        setAmount('Pending Review');
      }
      setRemarks(`Commission invoice for ${preselectedApplication.applicationNumber || 'application'}`);
      setInvoiceUrl('');
    } else {
      loadEligible();
    }
  }, [open, preselectedApplication, isAdmin]);

  const loadEligible = async () => {
    setLoadingEligible(true);
    setFormError('');
    try {
      const res = await invoiceAPI.getEligibleApplications({ limit: 50 });
      const apps = Array.isArray(res.data) ? res.data : (res.data?.applications || []);
      setEligibleApplications(apps);
      if (apps.length > 0) {
        setSelectedAppIds([apps[0].id]);
        const tuition = parseFloat(apps[0].tuitionFee);
        if (isAdmin) {
          const rate = parseFloat(commissionRate);
          if (!isNaN(rate) && rate > 0 && !isNaN(tuition) && tuition > 0) {
            setAmount((tuition * (rate / 100)).toFixed(2));
          } else {
            setAmount('');
          }
        } else {
          setAmount('Pending Review');
        }
        setRemarks(`Commission invoice for ${apps[0].applicationNumber || apps[0].courseName}`);
      } else {
        setSelectedAppIds([]);
        setAmount('');
      }
    } catch (err) {
      console.error('Failed to load eligible applications:', err);
      setFormError('Could not load eligible applications. ' + formatApiError(err));
    } finally {
      setLoadingEligible(false);
    }
  };

  const applySelection = (nextIds) => {
    setSelectedAppIds(nextIds);

    const selectedApps = eligibleApplications.filter((app) => nextIds.includes(app.id));
    const hasInvalidTuition = selectedApps.some((app) => {
      const tuition = parseFloat(app.tuitionFee);
      return !app.tuitionFee || isNaN(tuition) || tuition <= 0;
    });

    if (hasInvalidTuition || nextIds.length === 0) {
      setAmount('');
      return;
    }

    const totalTuition = selectedApps.reduce((sum, app) => sum + parseFloat(app.tuitionFee), 0);
    if (isAdmin) {
      const rateNum = parseFloat(commissionRate) || 0;
      setAmount((totalTuition * (rateNum / 100)).toFixed(2));
    } else {
      setAmount('Pending Review');
    }
  };

  const handleToggleApp = (appId) => {
    if (preselectedApplication) return;

    const next = selectedAppIds.includes(appId)
      ? selectedAppIds.filter((id) => id !== appId)
      : [...selectedAppIds, appId];
    applySelection(next);
  };

  const handleCommissionRateChange = (newRate) => {
    setCommissionRate(newRate);
    const selectedApps = eligibleApplications.filter(a => selectedAppIds.includes(a.id));
    const hasInvalidTuition = selectedApps.some(a => !a.tuitionFee || isNaN(parseFloat(a.tuitionFee)) || parseFloat(a.tuitionFee) <= 0);
    if (hasInvalidTuition || selectedAppIds.length === 0) {
      setAmount('');
    } else {
      const totalTuition = selectedApps.reduce((sum, a) => sum + parseFloat(a.tuitionFee), 0);
      const estCommission = totalTuition * (Number(newRate || 0) / 100);
      setAmount(estCommission.toFixed(2));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (selectedAppIds.length === 0) {
      setFormError('Please select at least one eligible application to invoice.');
      return;
    }

    if (isAdmin) {
      const numRate = parseFloat(commissionRate);
      if (isNaN(numRate) || numRate < 0 || numRate > 100) {
        setFormError('Please provide a valid commission rate between 0 and 100%.');
        return;
      }
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setFormError('Please provide a valid non-negative invoice amount.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        applicationIds: selectedAppIds,
        remarks: remarks.trim() || undefined,
        invoiceUrl: invoiceUrl.trim() || undefined
      };

      // Only authorized Admins can establish commissionRate upon creation
      if (isAdmin) {
        payload.commissionRate = parseFloat(commissionRate);
      }

      const res = await invoiceAPI.create(payload);
      toast.success('Invoice raised successfully', {
        description: `Invoice ${res.data?.invoiceNumber || ''} submitted to finance review queue.`
      });

      if (fetchInvoices) {
        await fetchInvoices();
      }

      onOpenChange(false);
      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (err) {
      console.error('Invoice creation error:', err);
      const msg = formatApiError(err);
      setFormError(msg);
      toast.error('Failed to raise invoice', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E6F1FB] flex items-center justify-center text-[#042C53]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                Raise Commission Invoice
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">
                Submit an invoice for enrolled and verified student applications.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 bg-[#F9FAFB] max-h-[72vh] overflow-y-auto space-y-5">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Application Selection Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">
                  Select Eligible Applications <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-[#6B7280]">
                  {selectedAppIds.length} of {eligibleApplications.length} selected
                </span>
              </div>

              {loadingEligible ? (
                <div className="p-6 text-center text-xs text-gray-500 bg-white rounded-xl border border-gray-200">
                  Loading eligible applications...
                </div>
              ) : eligibleApplications.length === 0 ? (
                <div className="p-6 text-center bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                  <p className="text-xs font-semibold text-amber-800">No Eligible Applications Found</p>
                  <p className="text-[11px] text-amber-700">
                    Only applications with status <strong>Enrolled</strong>, marked eligible, and not yet invoiced can be selected.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {eligibleApplications.map((app) => {
                    const isSelected = selectedAppIds.includes(app.id);
                    return (
                      <div
                        key={app.id}
                        onClick={() => handleToggleApp(app.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-[#042C53] bg-white ring-1 ring-[#042C53]'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            role="checkbox"
                            aria-checked={isSelected}
                            aria-disabled={Boolean(preselectedApplication)}
                            className={`h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center ${
                              isSelected ? 'bg-[#042C53] border-[#042C53] text-white' : 'border-gray-300 bg-white'
                            } ${preselectedApplication ? 'opacity-50' : ''}`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#111827]">
                                {app.applicationNumber}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                                Enrolled
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-600 mt-0.5">
                              <span className="flex items-center gap-1 font-medium">
                                <User className="w-3 h-3 text-gray-400" /> {app.student?.name || 'Student'}
                              </span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1 truncate max-w-[200px]">
                                <Building2 className="w-3 h-3 text-gray-400" /> {app.university?.name || app.courseName}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-[#111827]">
                            {app.tuitionFee ? `${app.currency || 'USD'} ${Number(app.tuitionFee).toLocaleString()}` : 'Unknown'}
                          </span>
                          <span className="text-[10px] text-gray-400 block">Tuition Fee</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Financial Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Commission Rate (%) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="commissionRate" className="text-xs font-semibold text-gray-700">
                    Commission Rate (%) {isAdmin && <span className="text-red-500">*</span>}
                  </Label>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {isAdmin ? 'Admin Controlled' : 'Admin Authority'}
                  </span>
                </div>
                <div className="relative">
                  <Percent className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                  {isAdmin ? (
                    <Input
                      id="commissionRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="e.g. 15.0"
                      value={commissionRate}
                      onChange={(e) => handleCommissionRateChange(e.target.value)}
                      className="text-xs h-9 pl-9 bg-white text-gray-800 font-medium border-gray-300"
                    />
                  ) : (
                    <Input
                      id="commissionRate"
                      type="text"
                      value="Admin-Controlled (Set in Finance Review)"
                      disabled
                      readOnly
                      className="text-xs h-9 pl-9 bg-gray-50 text-gray-500 font-medium cursor-not-allowed"
                    />
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount" className="text-xs font-semibold text-gray-700">
                    Total Invoice Amount (USD) {isAdmin && <span className="text-red-500">*</span>}
                  </Label>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {isAdmin ? 'Authoritative Calculation' : 'Calculated on Approval'}
                  </span>
                </div>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="amount"
                    type="text"
                    placeholder="0.00"
                    value={isAdmin ? (amount ? `$${amount}` : '0.00') : 'Calculated upon Finance Review'}
                    readOnly
                    className="text-xs h-9 pl-9 bg-gray-50 text-gray-800 font-semibold cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Document URL */}
            <div className="space-y-1.5">
              <Label htmlFor="invoiceUrl" className="text-xs font-semibold text-gray-700">
                Invoice File / PDF Link
              </Label>
              <div className="relative">
                <Link2 className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="invoiceUrl"
                  type="url"
                  placeholder="https://storage.qstudy.com/invoices/inv-2026.pdf"
                  value={invoiceUrl}
                  onChange={(e) => setInvoiceUrl(e.target.value)}
                  className="text-xs h-9 pl-9 bg-white"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label htmlFor="remarks" className="text-xs font-semibold text-gray-700">
                Remarks / Payment Instructions
              </Label>
              <Textarea
                id="remarks"
                rows={2}
                placeholder="Include agency bank details, batch reference, or special payment terms..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="text-xs bg-white resize-none"
              />
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-gray-100 bg-white flex flex-row items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || selectedAppIds.length === 0}
              className="text-xs h-9 px-5 bg-[#042C53] hover:bg-[#03213F] text-white font-semibold"
            >
              {submitting ? 'Submitting Invoice...' : 'Raise Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
