import React, { useState, useEffect } from 'react';
import { FileText, DollarSign, Link2, Check, AlertCircle, Building2, User, GraduationCap } from 'lucide-react';
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
import { toast } from 'sonner';

/**
 * InvoiceModal allows agents (and admins) to raise commission invoices
 * for applications whose student reached Visa 100% with the fees confirmed.
 */
const InvoiceModal = ({
  open,
  onOpenChange,
  preselectedApplication,
  onSuccess
}) => {
  const { fetchInvoices } = useData();

  const [eligibleApplications, setEligibleApplications] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Commission is set per university by the Head of Admission. The server calculates the real
  // amount; this preview just multiplies each selected application's tuition by its university rate.
  const selectedApps = eligibleApplications.filter((app) => selectedAppIds.includes(app.id));
  const rateOf = (app) => parseFloat(app.university?.commissionRate);
  // null = the university has no rate yet; undefined = rate not loaded (e.g. opened from an application page)
  const missingRateNames = [...new Set(
    selectedApps
      .filter((app) => app.university && app.university.commissionRate === null)
      .map((app) => app.university.name)
  )];
  const allRatesKnown = selectedApps.length > 0 && selectedApps.every((app) => rateOf(app) > 0);
  const estimatedCommission = selectedApps.reduce((sum, app) => {
    const tuition = parseFloat(app.tuitionFee);
    return rateOf(app) > 0 && tuition > 0 ? sum + tuition * (rateOf(app) / 100) : sum;
  }, 0);

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
      setRemarks(`Commission invoice for ${preselectedApplication.applicationNumber || 'application'}`);
      setInvoiceUrl('');
    } else {
      loadEligible();
    }
  }, [open, preselectedApplication]);

  const loadEligible = async () => {
    setLoadingEligible(true);
    setFormError('');
    try {
      const res = await invoiceAPI.getEligibleApplications({ limit: 50 });
      const apps = Array.isArray(res.data) ? res.data : (res.data?.applications || []);
      setEligibleApplications(apps);
      if (apps.length > 0) {
        setSelectedAppIds([apps[0].id]);
        setRemarks(`Commission invoice for ${apps[0].applicationNumber || apps[0].courseName}`);
      } else {
        setSelectedAppIds([]);
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
  };

  // One university and one currency per invoice: each university pays QStudy separately, in its own currency
  const universityOf = (app) => String(app.universityId || app.university?.id || '');
  const currencyOf = (app) => String(app.currency || 'USD').toUpperCase();
  const fitsSelection = (app) =>
    selectedApps.length === 0 ||
    (universityOf(app) === universityOf(selectedApps[0]) && currencyOf(app) === currencyOf(selectedApps[0]));

  const handleToggleApp = (appId) => {
    if (preselectedApplication) return;

    const app = eligibleApplications.find((a) => a.id === appId);
    if (app && !selectedAppIds.includes(appId) && !fitsSelection(app)) {
      toast.error('An invoice can only include one university and one currency', {
        description: 'Raise a separate invoice for the other applications.'
      });
      return;
    }

    const next = selectedAppIds.includes(appId)
      ? selectedAppIds.filter((id) => id !== appId)
      : [...selectedAppIds, appId];
    applySelection(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (selectedAppIds.length === 0) {
      setFormError('Please select at least one eligible application to invoice.');
      return;
    }

    if (missingRateNames.length > 0) {
      setFormError(`Commission is not set for ${missingRateNames.join(', ')}. Ask the Head of Admission to set it on the university.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        applicationIds: selectedAppIds,
        remarks: remarks.trim() || undefined,
        invoiceUrl: invoiceUrl.trim() || undefined
      };

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
      <DialogContent className="max-w-[620px] p-0 overflow-y-auto border-none shadow-2xl">
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
                Submit an invoice for students whose fees are confirmed (Visa 100%).
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
                    Only students who reached <strong>Visa 100%</strong> with their <strong>fees confirmed</strong> by QStudy, and who are not yet invoiced, can be selected. Upload the proof of fee payment on the application to move it on.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {eligibleApplications.map((app) => {
                    const isSelected = selectedAppIds.includes(app.id);
                    const otherUniversity = !isSelected && !fitsSelection(app);
                    return (
                      <div
                        key={app.id}
                        onClick={() => handleToggleApp(app.id)}
                        title={otherUniversity ? 'A different university or currency: raise a separate invoice' : undefined}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${otherUniversity ? 'opacity-50' : ''} ${
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
                                Fees Paid
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

            {/* Commission (set per university; the server calculates the final amount) */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">Commission</Label>
                <span className="text-[10px] text-gray-500 font-medium">Set per university</span>
              </div>
              {selectedApps.length === 0 ? (
                <p className="text-xs text-gray-500">Select an application to see the commission.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {selectedApps.map((app) => (
                    <li key={app.id} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                      <span className="truncate text-gray-700">{app.university?.name || app.courseName}</span>
                      {rateOf(app) > 0
                        ? <span className="tabular-nums text-gray-700">{rateOf(app)}%</span>
                        : app.university && app.university.commissionRate === null
                          ? <span className="text-red-600 font-semibold">Not set</span>
                          : <span className="text-gray-400">Set on approval</span>}
                    </li>
                  ))}
                </ul>
              )}
              {missingRateNames.length > 0 && (
                <p className="text-[11px] text-red-700 font-semibold">
                  Commission is not set for {missingRateNames.join(', ')}. An invoice cannot be raised until the Head of Admission sets it.
                </p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-gray-400" /> Estimated commission
                </span>
                <span className="text-sm font-bold text-[#042C53] tabular-nums">
                  {allRatesKnown ? estimatedCommission.toFixed(2) : 'Calculated on submission'}
                </span>
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
