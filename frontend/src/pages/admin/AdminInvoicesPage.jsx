import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { FileText, CheckCircle2, XCircle, Clock, Search, Filter, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '../../components/ui/input';

const AdminInvoicesPage = () => {
  const { invoices, updateInvoiceStatus, loading } = useData();
  const [searchTerm, setSearchTerm] = useState('');

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
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Agent / Agency</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Students</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Amount</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-left uppercase tracking-wider">Raised At</TableHead>
            <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 text-right uppercase tracking-wider">Action</TableHead>
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
                    <span className="font-semibold text-[#111827] truncate">{invoice.agentId?.name}</span>
                    <span className="text-[11px] text-[#6B7280] truncate">{invoice.agentId?.agencyName}</span>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-xs font-medium text-[#4B5563]">{invoice.studentIds?.length || 0} Students</TableCell>
                <TableCell className="px-6 py-4 font-bold text-[#111827]">₹{invoice.amount?.toLocaleString()}</TableCell>
                <TableCell className="px-6 py-4">{getStatusBadge(invoice.status)}</TableCell>
                <TableCell className="px-6 py-4 text-xs text-[#6B7280]">{format(new Date(invoice.raisedAt), 'MMM dd, yyyy')}</TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {invoice.status === 'Pending' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-[11px] font-bold text-[#27500A] bg-[#EAF3DE] border-[#C0DD97] hover:bg-[#DCEFC0]"
                          onClick={() => handleUpdateStatus(invoice.id, 'Paid')}
                          disabled={loading}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Paid
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-[11px] font-bold text-[#791F1F] bg-[#FCEBEB] border-[#F7C1C1] hover:bg-[#FADADA]"
                          onClick={() => handleUpdateStatus(invoice.id, 'Rejected')}
                          disabled={loading}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280] hover:text-[#111827] hover:bg-gray-100">
                      <FileText className="w-4 h-4" />
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
          <Button variant="outline" size="sm" className="inline-flex items-center text-xs font-semibold h-10 px-4 border-[#E5E7EB] hover:bg-white transition-all">
            Export Report <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
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
        <div className="flex bg-white border border-[#E5E7EB] rounded-lg p-1 gap-1">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-2 border-none hover:bg-gray-50">
            <Filter className="w-3.5 h-3.5" /> More Filters
          </Button>
        </div>
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
    </div>
  );
};

export default AdminInvoicesPage;
