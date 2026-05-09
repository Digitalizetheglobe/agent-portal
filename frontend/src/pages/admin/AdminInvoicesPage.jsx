import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { FileText, CheckCircle2, XCircle, Clock, Search, Filter, ArrowUpRight, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

const AdminInvoicesPage = () => {
  const { invoices, updateInvoiceStatus, loading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const filteredInvoices = invoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.agentId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.agentId?.agencyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateInvoiceStatus(id, { status });
    } catch (error) {
      console.error('Failed to update status:', error);
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

  const InvoiceList = ({ list }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Invoice #</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Agent / Agency</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Students</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Amount</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Raised At</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-center uppercase tracking-wider">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-16 text-[#6B7280]">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p>No invoices found matching your criteria.</p>
              </TableCell>
            </TableRow>
          ) : (
            list.map((invoice) => (
              <TableRow key={invoice.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                <TableCell className="px-6 py-4 font-bold text-[#111827]">{invoice.invoiceNumber}</TableCell>
                <TableCell className="px-6 py-4">
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-[#111827] text-center truncate">{invoice.agentId?.name}</span>
                    <span className="text-[11px] text-[#6B7280] text-center truncate">{invoice.agentId?.agencyName}</span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-xs font-medium text-[#4B5563] text-center">{invoice.studentIds?.length || 0} Students</TableCell>
                <TableCell className="px-6 py-4 font-bold text-[#111827] text-center">₹{invoice.amount?.toLocaleString()}</TableCell>
                <TableCell className="px-6 py-4 text-center">
                  {invoice.status === 'Paid' ? (
                    <Badge variant="outline" className="text-[10px] font-bold bg-[#EAF3DE] text-[#27500A] border-[#C0DD97]">
                      {invoice.status}
                    </Badge>
                  ) : invoice.status === 'Pending' ? (
                    <Badge variant="outline" className="text-[10px] font-bold bg-[#FAEEDA] text-[#633806] border-[#FAC775]">
                      {invoice.status}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold bg-[#FCEBEB] text-[#791F1F] border-[#F7C1C1]">
                      {invoice.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="px-6 py-4 text-xs text-[#6B7280] text-center">{format(new Date(invoice.raisedAt), 'MMM dd, yyyy')}</TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <div className="flex justify-center gap-2">
                    {invoice.status === 'Pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] font-bold text-[#27500A] bg-[#EAF3DE] border-[#C0DD97] hover:text-[#27500A] hover:bg-[#DCEFC0]"
                          onClick={() => handleUpdateStatus(invoice.id, 'Paid')}
                          disabled={loading}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] font-bold text-[#791F1F] bg-[#FCEBEB] border-[#F7C1C1] hover:text-[#791F1F] hover:bg-[#FADADA]"
                          onClick={() => handleUpdateStatus(invoice.id, 'Rejected')}
                          disabled={loading}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px] font-bold text-[#0C447C] bg-[#F0F7FF] border-[#C7D2FE] hover:bg-[#E0F0FF] hover:text-[#042C53]"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setIsViewOpen(true);
                      }}
                    >
                      <FileText className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Financial Overview</h1>
          <p className="text-sm font-medium text-[#6B7280] mt-0.5">Review and process agent commission invoices.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="inline-flex items-center text-xs font-semibold h-10 px-4 border-[#E5E7EB] hover:bg-white hover:text-[#042C53] transition-all">
            <Download size={14} className="mr-2" /> Export Report
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', val: stats.total, sub: 'All time volume', color: '#0C447C' },
          { label: 'Pending Payout', val: `₹${(stats.pendingAmount / 1000).toFixed(1)}k`, sub: `${stats.pendingCount} items pending`, color: '#633806' },
          { label: 'Total Settled', val: `₹${(stats.paidAmount / 1000).toFixed(1)}k`, sub: 'Successfully paid', color: '#27500A' },
          { label: 'Rejected', val: stats.rejectedCount, sub: 'Needs investigation', color: '#791F1F' }
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

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Search by invoice # or agent name..."
            className="pl-9 h-10 border-[#E5E7EB] text-sm focus-visible:ring-[#042C53]/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* <div className="flex bg-white border border-[#E5E7EB] rounded-lg p-1 gap-1">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-2 border-none hover:bg-gray-50 hover:text-[#042C53]">
            <Filter className="w-3.5 h-3.5" /> More Filters
          </Button>
        </div> */}
      </div>

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
              {/* Background Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none overflow-hidden">
                <img
                  src="/assets/QStudylogo(blue).png"
                  alt="Watermark"
                  className="w-[500px] h-[500px] object-contain rotate-[-15deg]"
                />
              </div>

              {/* Invoice Content */}
              <div className="relative z-10 flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-[#042C53] p-8 text-white flex justify-between items-start">
                  <div className="space-y-4">
                    <div className="bg-white p-3 rounded-xl inline-block">
                      <img src="/assets/QStudylogo(blue).png" alt="QStudy" className="h-8 object-contain" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold font-['Outfit']">COMMISSION INVOICE</h2>
                      <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mt-1">Institutional Settlement</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-bold">QStudy International</p>
                    <p className="text-[11px] text-blue-100">123 Education Hub, Knowledge Park</p>
                    <p className="text-[11px] text-blue-100">contact@qstudy.edu</p>
                    <p className="text-[11px] text-blue-100">+1 (555) 000-1234</p>
                  </div>
                </div>

                <div className="p-8 space-y-8 flex-1">
                  {/* Meta Info */}
                  <div className="grid grid-cols-3 gap-8">
                    <div>
                      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Invoice Details</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-bold text-[#111827]">{selectedInvoice.invoiceNumber}</p>
                        <p className="text-xs text-[#6B7280]">{format(new Date(selectedInvoice.raisedAt), 'MMMM dd, yyyy')}</p>
                        <div className="pt-2">{getStatusBadge(selectedInvoice.status)}</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Billed To (Agent)</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-bold text-[#111827]">{selectedInvoice.agentId?.name}</p>
                        <p className="text-xs text-[#4B5563] font-semibold">{selectedInvoice.agentId?.agencyName}</p>
                        <p className="text-xs text-[#6B7280]">{selectedInvoice.agentId?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Settlement Amount</p>
                      <div className="mt-2">
                        <p className="text-3xl font-bold text-[#042C53] font-['Outfit']">₹{selectedInvoice.amount?.toLocaleString()}</p>
                        <p className="text-[10px] font-semibold text-[#6B7280] mt-1">Incl. {selectedInvoice.commissionRate}% Commission</p>
                      </div>
                    </div>
                  </div>

                  {/* Student Table */}
                  <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-[#F9FAFB]">
                        <TableRow>
                          <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">Student Name</TableHead>
                          <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3">Email Address</TableHead>
                          <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase px-6 py-3 text-right">Application Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.studentIds?.map((student, idx) => (
                          <TableRow key={idx} className="border-b border-[#F3F4F6] last:border-0">
                            <TableCell className="px-6 py-4 text-sm font-bold text-[#111827]">{student.name}</TableCell>
                            <TableCell className="px-6 py-4 text-sm text-[#4B5563]">{student.email}</TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <Badge variant="outline" className="text-[10px] font-bold bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]">{student.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {selectedInvoice.remarks && (
                    <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">Agent Remarks</p>
                      <p className="text-sm text-[#4B5563] italic">"{selectedInvoice.remarks}"</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-between items-center">
                  <div className="text-[10px] text-[#9CA3AF] font-medium max-w-xs">
                    This is an electronically generated document. No signature is required. QStudy International Settlement System.
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9 px-4 text-xs font-bold border-[#D1D5DB] hover:bg-white transition-all hover:text-[#042C53]">
                      <Download size={14} className="mr-2" /> Download PDF
                    </Button>
                    <Button size="sm" onClick={() => setIsViewOpen(false)} className="h-9 px-6 text-xs font-bold bg-[#042C53] hover:bg-[#0C447C] text-white transition-all hover:text-[#ffffff]">
                      Close View
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInvoicesPage;
