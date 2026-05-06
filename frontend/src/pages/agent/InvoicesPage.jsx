import React, { useState } from 'react';
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
import { FilePlus, FileText, CheckCircle2, Clock, XCircle, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';

const InvoicesPage = () => {
  const { students, invoices, createInvoice, loading } = useData();
  const { user } = useAuth();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [commissionRate, setCommissionRate] = useState(10); // Default 10%
  const [remarks, setRemarks] = useState('');

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="success" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>;
      case 'Pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'Rejected':
        return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 bg-[#F9FAFB] min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
            Financial Settlement
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Manage your agency commissions and track institutional invoice cycles.
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#042C53] hover:bg-[#0C447C] text-white font-bold text-xs uppercase tracking-widest px-6 py-6 rounded-xl shadow-lg shadow-[#042C53]/20 transition-all active:scale-95"
        >
          <FilePlus className="w-4 h-4 mr-2" />
          Raise New Invoice
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl h-auto gap-1 mb-8">
          <TabsTrigger value="all" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-white data-[state=active]:text-[#042C53] data-[state=active]:shadow-sm text-xs font-bold uppercase tracking-wider transition-all">All Invoices</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-white data-[state=active]:text-[#042C53] data-[state=active]:shadow-sm text-xs font-bold uppercase tracking-wider transition-all">Pending Settlement</TabsTrigger>
          <TabsTrigger value="paid" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-white data-[state=active]:text-[#042C53] data-[state=active]:shadow-sm text-xs font-bold uppercase tracking-wider transition-all">Paid Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0 outline-none">
          <Card className="border border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 px-7 pt-7 border-b border-gray-100">
              <CardTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                Settlement History
              </CardTitle>
              <CardDescription className="text-sm font-medium mt-1">Audit log of all financial claims submitted to the institution.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F9FAFB] border-b border-gray-100">
                      <TableHead className="py-4 px-7 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-[150px]">Voucher #</TableHead>
                      <TableHead className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Batch Size</TableHead>
                      <TableHead className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Claim Value</TableHead>
                      <TableHead className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Settlement</TableHead>
                      <TableHead className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Submission Date</TableHead>
                      <TableHead className="py-4 px-7 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-20">
                          <div className="flex flex-col items-center gap-3">
                            <FileText className="w-10 h-10 text-muted-foreground/20" />
                            <p className="text-sm font-medium text-muted-foreground">
                              No financial records found in your current view.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((invoice) => (
                        <TableRow
                          key={invoice.id}
                          className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <TableCell className="py-5 px-7">
                            <span className="text-sm font-bold text-[#111827] flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              {invoice.invoiceNumber}
                            </span>
                          </TableCell>
                          <TableCell className="py-5 px-6 text-center">
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                              {invoice.studentIds?.length || 0} Students
                            </div>
                          </TableCell>
                          <TableCell className="py-5 px-6">
                            <span className="text-sm font-bold text-[#111827]">
                              ₹{invoice.amount?.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="py-5 px-6">
                            {getStatusBadge(invoice.status)}
                          </TableCell>
                          <TableCell className="py-5 px-6 text-xs font-semibold text-muted-foreground">
                            {format(new Date(invoice.raisedAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="py-5 px-7 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:text-[#042C53] hover:bg-[#F0F7FF] rounded-lg"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
};

export default InvoicesPage;
