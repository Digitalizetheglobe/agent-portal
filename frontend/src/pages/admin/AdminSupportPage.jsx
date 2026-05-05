import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  MessageSquare, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Send, 
  Search, 
  Filter, 
  User, 
  Plus, 
  FileText,
  BarChart3,
  TrendingUp,
  MoreVertical,
  Reply,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const AdminSupportPage = () => {
  const { tickets, addTicketResponse, updateTicketStatus, loading } = useData();
  
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = (
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.agentId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.agentId?.agencyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    
    try {
      await addTicketResponse(selectedTicket.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedTicket) return;
    try {
      await updateTicketStatus(selectedTicket.id, status);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const stats = [
    { label: 'Total Tickets', value: tickets.length, sub: 'This month', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Open', value: tickets.filter(t => t.status === 'Open').length, sub: 'Needs action', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Avg Response', value: '4.8h', sub: 'Target: 6h', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Resolved', value: tickets.filter(t => t.status === 'Resolved').length, sub: 'All time', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 uppercase text-[10px] font-bold tracking-wider">Open</Badge>;
      case 'In Progress':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 uppercase text-[10px] font-bold tracking-wider">Progress</Badge>;
      case 'Resolved':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 uppercase text-[10px] font-bold tracking-wider">Resolved</Badge>;
      default:
        return <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-wider">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-[#F9FAFB] min-h-screen font-['Inter']">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">Support Management</h1>
          <p className="text-sm text-[#6B7280] mt-0.5 font-medium">Respond to agent inquiries and manage help centre content.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="text-xs font-semibold h-10 px-4 border-[#E5E7EB] hover:bg-slate-50 transition-all gap-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Performance report
          </Button>
          <Button size="sm" className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold h-10 px-5 rounded-lg shadow-lg shadow-[#042C53]/10 transition-all active:scale-95 gap-2">
            <Plus className="w-4 h-4" />
            Export data
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-[#E5E7EB] bg-white shadow-none rounded-xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">{stat.label}</p>
                <div className={cn("p-1.5 rounded-lg", stat.bg)}>
                  <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-[#111827] mt-1">{stat.value}</h3>
              <p className="text-[10px] font-medium text-[#6B7280] mt-1 uppercase tracking-wider">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List Section */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="h-full border-[#E5E7EB] shadow-none bg-white rounded-xl overflow-hidden flex flex-col min-h-[600px]">
            <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Active tickets · {filteredTickets.length}</h3>
              <Badge className="bg-[#E6F1FB] text-[#0C447C] border-none text-[10px] h-5">{filteredTickets.length}</Badge>
            </div>
            <CardHeader className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                <Input 
                  placeholder="Search agents or issues..." 
                  className="pl-9 h-9 border-[#E5E7EB] bg-white text-xs placeholder:text-[#9CA3AF] focus-visible:ring-[#042C53]/10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full h-9 border-[#E5E7EB] bg-white text-xs text-[#6B7280]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  <SelectItem value="Technical Issue">Technical</SelectItem>
                  <SelectItem value="Payment / Invoice">Payment</SelectItem>
                  <SelectItem value="Student-Related">Student</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="p-12 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2 opacity-50" />
                  <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">No tickets found</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {filteredTickets.map((ticket) => (
                    <div 
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={cn(
                        "p-4 cursor-pointer transition-all hover:bg-[#F9FAFB] relative group",
                        selectedTicket?.id === ticket.id && "bg-[#E6F1FB]/40"
                      )}
                    >
                      {selectedTicket?.id === ticket.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#042C53]" />
                      )}
                      <div className="flex justify-between items-start mb-1.5">
                        <h4 className="text-[13px] font-medium text-[#111827] truncate pr-2">{ticket.subject}</h4>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-[#042C53]">
                          {ticket.agentId?.name?.[0] || 'A'}
                        </div>
                        <span className="text-[11px] font-medium text-[#6B7280] truncate">
                          {ticket.agentId?.name} · {ticket.agentId?.agencyName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                          {format(new Date(ticket.createdAt), 'MMM dd, HH:mm')}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-semibold uppercase border-[#E5E7EB] text-[#6B7280] tracking-wider h-5">{ticket.category || 'General'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat & FAQ Management Section */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTicket ? (
            <Card className="border-[#E5E7EB] shadow-none bg-white rounded-xl overflow-hidden flex flex-col min-h-[600px]">
              <CardHeader className="bg-[#042C53] text-white p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <CardTitle className="text-base font-semibold font-['Outfit']">{selectedTicket.subject}</CardTitle>
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                    <div className="flex items-center gap-2 text-[#B5D4F4] text-[11px] font-medium">
                      <User className="w-3.5 h-3.5" />
                      <span>{selectedTicket.agentId?.name} ({selectedTicket.agentId?.agencyName})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedTicket.status} onValueChange={handleUpdateStatus}>
                      <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg h-8">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Mark Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 rounded-lg">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F9FAFB]">
                {/* Initial Request */}
                <div className="flex justify-start">
                  <div className="bg-white border border-[#E5E7EB] p-5 rounded-xl rounded-tl-none shadow-sm max-w-[90%]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#042C53] opacity-60">Agent request</span>
                      <span className="text-[10px] font-medium text-[#9CA3AF]">{format(new Date(selectedTicket.createdAt), 'MMM dd, HH:mm')}</span>
                    </div>
                    <p className="text-[13px] font-medium text-gray-700 leading-relaxed">{selectedTicket.description}</p>
                  </div>
                </div>

                {/* Responses */}
                {selectedTicket.responses?.map((resp, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "flex flex-col max-w-[85%] p-4 rounded-xl shadow-sm",
                      resp.senderId.role === 'admin' 
                        ? "self-end bg-[#042C53] text-white rounded-tr-none ml-auto" 
                        : "self-start bg-white border border-[#E5E7EB] rounded-tl-none"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1.5 gap-6">
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider",
                        resp.senderId.role === 'admin' ? 'text-[#B5D4F4]' : 'text-[#042C53]'
                      )}>
                        {resp.senderId.role === 'admin' ? 'Support admin' : (resp.senderId.name || 'Agent')}
                      </span>
                      <span className="text-[9px] font-medium opacity-50">
                        {format(new Date(resp.timestamp), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-[13px] font-medium leading-relaxed">{resp.message}</p>
                  </div>
                ))}
              </CardContent>
              <div className="p-6 bg-white border-t border-[#E5E7EB]">
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <Textarea 
                      placeholder="Type your official response..." 
                      className="min-h-[100px] bg-[#F9FAFB] border-[#E5E7EB] rounded-xl p-4 text-[13px] font-medium focus:ring-[#042C53]/10 transition-all resize-none"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      className="bg-[#042C53] hover:bg-[#0C447C] text-white rounded-xl h-12 w-12 shadow-lg shadow-[#042C53]/10"
                      disabled={!newMessage.trim() || loading || selectedTicket.status === 'Closed'}
                      onClick={handleSendMessage}
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="rounded-xl h-12 w-12 border-[#E5E7EB] text-[#1D9E75] hover:bg-emerald-50 hover:border-[#1D9E75]"
                      onClick={() => handleUpdateStatus('Resolved')}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="h-[350px] flex items-center justify-center border-[#E5E7EB] shadow-none bg-white rounded-xl border-dashed">
                <div className="text-center space-y-3 max-w-xs px-6">
                  <div className="w-16 h-16 bg-[#F9FAFB] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-[#042C53] opacity-20" />
                  </div>
                  <h3 className="text-base font-semibold text-[#111827] font-['Outfit']">Select a support ticket</h3>
                  <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider leading-relaxed">
                    Pick a conversation from the active list to start assisting our agent partners.
                  </p>
                </div>
              </Card>

              {/* FAQ Management Mini-Section */}
              <Card className="border-[#E5E7EB] shadow-none bg-white rounded-xl overflow-hidden">
                <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-[#042C53]" />
                    <h3 className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Help centre management</h3>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[#042C53] font-bold text-[9px] uppercase tracking-wider hover:bg-[#042C53]/5 h-7">
                    View all FAQ
                  </Button>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex flex-col items-center p-3 rounded-xl border border-dashed border-[#E5E7EB] hover:border-[#042C53] hover:bg-[#E6F1FB]/30 transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-[#E6F1FB] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Plus className="w-4 h-4 text-[#042C53]" />
                      </div>
                      <span className="text-[11px] font-bold text-[#111827]">New FAQ Article</span>
                    </button>
                    <button className="flex flex-col items-center p-3 rounded-xl border border-dashed border-[#E5E7EB] hover:border-[#042C53] hover:bg-[#EAF3DE]/30 transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-[#EAF3DE] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Reply className="w-4 h-4 text-[#27500A]" />
                      </div>
                      <span className="text-[11px] font-bold text-[#111827]">Manage Responses</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportPage;
