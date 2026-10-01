import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  FilePlus,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Search,
  ExternalLink,
  Building2,
  User,
  History,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '../../components/ui/input';
import InvoiceModal from '../../components/modals/InvoiceModal';
import { invoiceReviewAPI } from '../../utils/api';

const InvoicesPage = () => {
  const { invoices, fetchInvoices, loading } = useData();
  const { user } = useAuth();

  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (fetchInvoices) {
      fetchInvoices();
    }
  }, [fetchInvoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv =>
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  const stats = useMemo(() => {
    const total = invoices.length;
    const pending = invoices.filter(i => i.status === 'Pending');
    const paid = invoices.filter(i => i.status === 'Paid');
    const rejected = invoices.filter(i => i.status === 'Rejected');

    const pendingAmount = pending.reduce((sum, i) => sum + (i.amount || 0), 0);
    const paidAmount = paid.reduce((sum, i) => sum + (i.amount || 0), 0);

    return {
      total,
      pendingCount: pending.length,
      pendingAmount,
      paidAmount,
      rejectedCount: rejected.length
    };
  }, [invoices]);

  const handleOpenView = async (invoice) => {
    setSelectedInvoice(invoice);
    setIsViewOpen(true);
    setReviewHistory([]);
    if (invoice.id) {
      setLoadingHistory(true);
      try {
        const res = await invoiceReviewAPI.getHistory(invoice.id);
        const data = Array.isArray(res.data) ? res.data : (res.data?.history || []);
        setReviewHistory(data);
      } catch (err) {
        console.error('Failed to load review history:', err);
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return <Badge className="bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>;
      case 'Pending':
        return <Badge className="bg-[#FAEEDA] text-[#633806] border-[#FAC775] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'Rejected':
        return <Badge className="bg-[#FCEBEB] text-[#791F1F] border-[#F7C1C1] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">{status}</Badge>;
    }
  };

  const getReviewBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'UnderReview':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"><Clock className="w-3 h-3 mr-1" /> Under Review</Badge>;
      case 'Rejected':
        return <Badge className="bg-[#FCEBEB] text-[#791F1F] border-[#F7C1C1] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'PendingReview':
      default:
        return <Badge className="bg-[#FAEEDA] text-[#633806] border-[#FAC775] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"><Clock className="w-3 h-3 mr-1" /> Pending Review</Badge>;
    }
  };

  const InvoiceList = ({ list }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Invoice #</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Applications</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Amount</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Finance Review</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Payment Status</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Raised At</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-20 text-[#6B7280]">
                <div className="flex flex-col items-center gap-3">
                  <FileText className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-medium">No invoices found in this view.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            list.map((invoice) => {
              const appCount = invoice.applications?.length || invoice.studentIds?.length || 0;
              return (
                <TableRow key={invoice.id} className="hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0">
                  <TableCell className="px-6 py-4 font-bold text-[#111827]">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold text-[#4B5563] text-center">
                    {appCount} {appCount === 1 ? 'Application' : 'Applications'}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-[#111827] text-center">
                    {invoice.amount > 0 ? `$${Number(invoice.amount).toLocaleString()}` : <span className="text-xs text-amber-600 font-medium">Pending Review</span>}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {getReviewBadge(invoice.financeReviewStatus || 'PendingReview')}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    {getStatusBadge(invoice.status || 'Pending')}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs text-[#6B7280] text-center">
                    {invoice.raisedAt ? format(new Date(invoice.raisedAt), 'MMM dd, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px] font-bold text-[#042C53] bg-[#E6F1FB]/60 border-[#C7D2FE] hover:bg-[#E6F1FB]"
                      onClick={() => handleOpenView(invoice)}
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" /> View Invoice
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Invoice Management</h1>
          <p className="text-sm font-medium text-[#6B7280] mt-0.5">Track your commission invoices, review statuses, and payout milestones.</p>
        </div>
        <div className="flex gap-3">
          <Button
            size="sm"
            onClick={() => setIsRaiseModalOpen(true)}
            className="inline-flex items-center text-xs font-semibold h-10 px-4 bg-[#042C53] hover:bg-[#03213F] text-white"
          >
            <FilePlus size={16} className="mr-2" /> Raise New Invoice
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', val: stats.total, sub: 'All time volume', color: '#0C447C' },
          { label: 'Pending Settlement', val: `$${(stats.pendingAmount / 1000).toFixed(1)}k`, sub: `${stats.pendingCount} unpaid`, color: '#633806' },
          { label: 'Total Settled', val: `$${(stats.paidAmount / 1000).toFixed(1)}k`, sub: 'Received payouts', color: '#27500A' },
          { label: 'Action Required', val: stats.rejectedCount, sub: 'Rejected / Needs update', color: '#791F1F' }
        ].map((kpi, i) => (
          <Card key={i} className="border-[#E5E7EB] bg-white shadow-none">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-[#111827] mt-1 font-['Outfit']">{kpi.val}</p>
              <p className="text-[10px] font-semibold mt-1" style={{ color: kpi.color }}>{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
        <Input
          placeholder="Search by invoice # or remarks..."
          className="pl-9 h-10 border-[#E5E7EB] text-sm focus-visible:ring-[#042C53]/10 bg-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-6 border-b border-[#E5E7EB] w-full justify-start rounded-none">
          {['all', 'pending', 'paid', 'rejected'].map(tab => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
            >
              {tab} Invoices
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <InvoiceList list={filteredInvoices} />
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => i.status === 'Pending')} />
        </TabsContent>

        <TabsContent value="paid" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => i.status === 'Paid')} />
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <InvoiceList list={filteredInvoices.filter(i => i.status === 'Rejected')} />
        </TabsContent>
      </Tabs>

      {/* Invoice View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white rounded-2xl border-none shadow-2xl">
          {selectedInvoice && (
            <div className="relative min-h-[600px] flex flex-col">
              {/* Header */}
              <div className="bg-[#042C53] p-8 text-white flex justify-between items-start">
                <div className="space-y-4">
                  <div className="bg-white p-3 rounded-xl inline-block">
                    <img src="/assets/QStudylogo(blue).png" alt="QStudy" className="h-8 object-contain" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-['Outfit']">COMMISSION INVOICE</h2>
                    <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mt-1">Agency Settlement</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-bold">QStudy International</p>
                  <p className="text-[11px] text-blue-100">Partner Operations</p>
                  <p className="text-[11px] text-blue-100">finance@qstudy.edu</p>
                </div>
              </div>

              <div className="p-8 space-y-6 flex-1 max-h-[70vh] overflow-y-auto">
                {/* Rejection Alert if rejected */}
                {selectedInvoice.financeReviewStatus === 'Rejected' && selectedInvoice.financeRejectionReason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600" /> Finance Review Rejection
                    </span>
                    <p className="text-xs text-red-700">{selectedInvoice.financeRejectionReason}</p>
                    {selectedInvoice.financeReviewNotes && (
                      <p className="text-[11px] text-red-600 mt-1 italic">{selectedInvoice.financeReviewNotes}</p>
                    )}
                  </div>
                )}

                {/* Meta Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Invoice Details</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-bold text-[#111827]">{selectedInvoice.invoiceNumber}</p>
                      <p className="text-xs text-[#6B7280]">
                        {selectedInvoice.raisedAt ? format(new Date(selectedInvoice.raisedAt), 'MMMM dd, yyyy') : 'N/A'}
                      </p>
                      <div className="pt-2 flex flex-wrap gap-2">
                        {getStatusBadge(selectedInvoice.status)}
                        {getReviewBadge(selectedInvoice.financeReviewStatus)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Payee Agency</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-bold text-[#111827]">{user?.name || selectedInvoice.agentId?.name}</p>
                      <p className="text-xs text-[#4B5563] font-semibold">{user?.agencyName || selectedInvoice.agentId?.agencyName}</p>
                      <p className="text-xs text-[#6B7280]">{user?.email || selectedInvoice.agentId?.email}</p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Total Settlement</p>
                    <div className="mt-2">
                      <p className="text-3xl font-bold text-[#042C53] font-['Outfit']">
                        {selectedInvoice.amount > 0 ? `$${Number(selectedInvoice.amount).toLocaleString()}` : '$0.00 (Pending)'}
                      </p>
                      <p className="text-[10px] font-semibold text-[#6B7280] mt-1">
                        Commission: {selectedInvoice.commissionRate > 0 ? `${selectedInvoice.commissionRate}%` : 'Admin Review Pending'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Applications Breakdown */}
                <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#F9FAFB]">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">Application #</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">Student Name</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">University & Course</TableHead>
                        <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3 text-right">Tuition</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.applications && selectedInvoice.applications.length > 0 ? (
                        selectedInvoice.applications.map((app, idx) => (
                          <TableRow key={idx} className="border-b border-[#F3F4F6] last:border-0">
                            <TableCell className="px-6 py-4 text-xs font-bold text-[#111827]">
                              {app.applicationNumber}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-xs text-[#4B5563]">
                              <span className="font-semibold text-gray-900 block">{app.student?.name || 'Student'}</span>
                              <span className="text-[11px] text-gray-500">{app.student?.email}</span>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-xs text-[#4B5563]">
                              <span className="font-medium text-gray-900 block">{app.university?.name || 'University'}</span>
                              <span className="text-[11px] text-gray-500">{app.courseName}</span>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right text-xs font-bold text-gray-900">
                              {app.tuitionFee ? `$${Number(app.tuitionFee).toLocaleString()}` : 'Unknown'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        selectedInvoice.studentIds?.map((student, idx) => (
                          <TableRow key={idx} className="border-b border-[#F3F4F6] last:border-0">
                            <TableCell className="px-6 py-4 text-sm font-bold text-[#111827]">LEGACY-APP</TableCell>
                            <TableCell className="px-6 py-4 text-sm text-[#4B5563]">{student.name || 'Student'}</TableCell>
                            <TableCell className="px-6 py-4 text-sm text-[#4B5563]">{student.email}</TableCell>
                            <TableCell className="px-6 py-4 text-right text-sm font-bold text-gray-900">N/A</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Remarks & Document Link */}
                {selectedInvoice.remarks && (
                  <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Remarks</p>
                    <p className="text-xs text-[#4B5563] whitespace-pre-wrap">{selectedInvoice.remarks}</p>
                  </div>
                )}

                {selectedInvoice.invoiceUrl && (
                  <div className="flex items-center justify-between p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                    <span className="text-xs font-semibold text-[#042C53]">Attached Invoice Document</span>
                    <a
                      href={selectedInvoice.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#042C53] font-bold hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Uploaded Document
                    </a>
                  </div>
                )}

                {/* Review Audit History */}
                {reviewHistory.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-gray-500" /> Review Timeline
                    </span>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2 text-xs">
                      {reviewHistory.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between border-b border-gray-200/60 pb-2 last:border-0 last:pb-0">
                          <div>
                            <span className="font-bold text-gray-900">{item.action}</span>
                            {item.notes && <p className="text-[11px] text-gray-600 mt-0.5">{item.notes}</p>}
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {item.changedAt ? new Date(item.changedAt).toLocaleString() : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-between items-center">
                <div className="text-[10px] text-[#9CA3AF] font-medium max-w-xs">
                  Institutional Settlement &bull; QStudy International Portal
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsViewOpen(false)}
                  className="h-9 px-6 text-xs font-bold bg-[#042C53] hover:bg-[#0C447C] text-white"
                >
                  Close View
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Raise Invoice Modal */}
      <InvoiceModal
        open={isRaiseModalOpen}
        onOpenChange={setIsRaiseModalOpen}
        onSuccess={fetchInvoices}
      />
    </div>
  );
};

export default InvoicesPage;
