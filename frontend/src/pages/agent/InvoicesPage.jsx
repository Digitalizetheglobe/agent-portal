import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { FilePlus, FileText, CheckCircle2, Clock, XCircle, MoreVertical, Download, Search } from 'lucide-react';
import { format } from 'date-fns';

const InvoicesPage = () => {
  const { students, invoices, createInvoice, loading } = useData();
  const { user } = useAuth();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [commissionRate, setCommissionRate] = useState(10); // Default 10%
  const [remarks, setRemarks] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const filteredInvoices = invoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Filter students who are "Converted" and not yet in any invoice
  const uninvoicedStudents = students.filter(student =>
    student.status === 'Converted' &&
    !invoices.some(inv => inv.studentIds.some(sid =>
      (typeof sid === 'string' ? sid === student.id : (sid.id === student.id || sid._id === student.id))
    ))
  );

  const handleToggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleRaiseInvoice = async () => {
    if (selectedStudents.length === 0) return;

    // In a real app, you might have specific amounts per student
    // For this demo, we'll just use a placeholder amount calculation
    const amount = selectedStudents.length * 1000; // $1000 per student

    try {
      await createInvoice({
        studentIds: selectedStudents,
        amount,
        commissionRate,
        remarks
      });
      setIsDialogOpen(false);
      setSelectedStudents([]);
      setRemarks('');
    } catch (error) {
      console.error('Failed to raise invoice:', error);
    }
  };

  const InvoiceList = ({ list }) => (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider w-[150px]">Invoice #</TableHead>
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
              <TableCell colSpan={6} className="text-center py-20 text-[#6B7280]">
                <div className="flex flex-col items-center gap-3">
                  <FileText className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-medium">
                    No financial records found in your current view.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            list.map((invoice) => (
              <TableRow
                key={invoice.id}
                className="hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-0"
              >
                <TableCell className="px-6 py-4 font-bold text-[#111827]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    {invoice.invoiceNumber}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-xs font-medium text-[#4B5563] text-center">
                  {invoice.studentIds?.length || 0} Students
                </TableCell>
                <TableCell className="px-6 py-4 font-bold text-[#111827] text-center">
                  ₹{invoice.amount?.toLocaleString()}
                </TableCell>
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
                <TableCell className="px-6 py-4 text-xs text-[#6B7280] text-center">
                  {format(new Date(invoice.raisedAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
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
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Financial Settlement</h1>
          <p className="text-sm font-medium text-[#6B7280] mt-0.5">Manage your agency commissions and track settlement cycles.</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-[#042C53] hover:bg-[#0C447C] text-white font-bold text-xs uppercase tracking-widest px-6 h-10 rounded-xl shadow-lg shadow-[#042C53]/10 transition-all active:scale-95"
          >
            <FilePlus className="w-4 h-4 mr-2" /> Raise New Invoice
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', val: stats.total, sub: 'All submissions', color: '#0C447C' },
          { label: 'Pending Payout', val: `₹${(stats.pendingAmount / 1000).toFixed(1)}k`, sub: `${stats.pendingCount} items pending`, color: '#633806' },
          { label: 'Total Earned', val: `₹${(stats.paidAmount / 1000).toFixed(1)}k`, sub: 'Successfully settled', color: '#27500A' },
          { label: 'Rejected', val: stats.rejectedCount, sub: 'Needs attention', color: '#791F1F' }
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
            placeholder="Search by invoice # or remarks..."
            className="pl-9 h-10 border-[#E5E7EB] text-sm focus-visible:ring-[#042C53]/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-12 border-b border-[#E5E7EB] w-full justify-start rounded-none">
          {['all', 'pending', 'paid', 'rejected'].map(tab => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#042C53] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 text-sm font-semibold text-[#6B7280] data-[state=active]:text-[#042C53] transition-all capitalize"
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

      {/* Raise Invoice Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Raise New Invoice</DialogTitle>
            <DialogDescription>
              Select converted students to include in this invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uninvoicedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                        No students eligible for invoicing.
                      </TableCell>
                    </TableRow>
                  ) : (
                    uninvoicedStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={() => handleToggleStudent(student.id)}
                          />
                        </TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{student.email}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commission">Commission Rate (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Estimated Amount</Label>
                <div className="h-10 flex items-center font-bold text-lg px-3 bg-accent/50 rounded-md">
                  ₹{(selectedStudents.length * 1000).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="Any additional notes for the finance team..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRaiseInvoice}
              disabled={selectedStudents.length === 0 || loading}
            >
              Raise Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                        <div className="pt-2">
                          <Badge className={
                            selectedInvoice.status === 'Paid' ? "bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] text-[10px] font-bold uppercase" :
                              selectedInvoice.status === 'Pending' ? "bg-[#FAEEDA] text-[#633806] border-[#FAC775] text-[10px] font-bold uppercase" :
                                "bg-[#FCEBEB] text-[#791F1F] border-[#F7C1C1] text-[10px] font-bold uppercase"
                          }>
                            {selectedInvoice.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Billed To (Agent)</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-bold text-[#111827]">{selectedInvoice.agentId?.name || user?.name}</p>
                        <p className="text-xs text-[#4B5563] font-semibold">{selectedInvoice.agentId?.agencyName || user?.agencyName}</p>
                        <p className="text-xs text-[#6B7280]">{selectedInvoice.agentId?.email || user?.email}</p>
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
                        {(selectedInvoice.studentIds || []).map((student, idx) => (
                          <TableRow key={idx} className="border-b border-[#F3F4F6] last:border-0">
                            <TableCell className="px-6 py-4 text-sm font-bold text-[#111827]">{typeof student === 'string' ? 'Student ID: ' + student : student.name}</TableCell>
                            <TableCell className="px-6 py-4 text-sm text-[#4B5563]">{typeof student === 'string' ? '' : student.email}</TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <Badge variant="outline" className="text-[10px] font-bold bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]">{typeof student === 'string' ? 'Converted' : student.status}</Badge>
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

export default InvoicesPage;
