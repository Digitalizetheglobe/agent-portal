import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { cn } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  MessageSquarePlus,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  Send,
  Search,
  UserPlus,
  Calendar,
  FileText,
  User,
  ChevronDown,
  ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';

const SupportPage = () => {
  const { tickets, createTicket, addTicketResponse, loading } = useData();

  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'Technical Issue',
    priority: 'Medium'
  });

  const faqs = [
    {
      id: 'q1',
      category: 'Student Registration',
      question: 'How do I register a student for an event?',
      answer: 'Go to Events from your dashboard and select the event you want to register for. Click Register Student, fill in all required fields — full name (as per ID), email, phone, preferred country, course interest, and current city — then submit.'
    },
    {
      id: 'q1.5',
      category: 'Student Registration',
      question: 'What if a student doesn\'t have a passport yet?',
      answer: 'Students can initially register with any government-issued ID. However, for Event Entry and Visa Processing, a valid passport is mandatory. They can update their passport details in the portal later once they receive it.'
    },
    {
      id: 'q2',
      category: 'Student Registration',
      question: 'What documents does a student need to upload?',
      answer: 'Required documents vary by event, but typically include: Passport (mandatory), Academic transcripts, and IELTS/TOEFL score card. Upload documents via the student\'s profile page.'
    },
    {
      id: 'q3',
      category: 'Events & Seats',
      question: 'How do I check seat availability?',
      answer: 'Seat availability is shown in real-time on the Event Listings page. Each event card shows a seat count badge — green for open, amber when limited.'
    },
    {
      id: 'q3.5',
      category: 'Events & Seats',
      question: 'How can I filter events by country?',
      answer: 'On the Events Dashboard, use the "Filter" button at the top right. You can filter events by Country, Date Range, and Institution type. This helps you find the most relevant opportunities for your students.'
    },
    {
      id: 'q4',
      category: 'Invoices & Payments',
      question: 'How do I raise an invoice?',
      answer: 'Go to Invoices from your sidebar and click New invoice. Select the event, and the system will automatically pull the number of confirmed students. Review and submit.'
    },
    {
      id: 'q5',
      category: 'Invoices & Payments',
      question: 'Where can I see my commission structure?',
      answer: 'Your commission structure is available under Profile > Agency Details > Commission Plan. Payouts are typically processed within 15 working days after successful student conversion.'
    },
    {
      id: 'q6',
      category: 'Account & Profile',
      question: 'How do I update my agency or contact details?',
      answer: 'Go to Settings > Profile and update your name, agency name, or contact info. Some fields may require re-verification by the admin team.'
    },
    {
      id: 'q7',
      category: 'Account & Profile',
      question: 'My account shows "Pending Verification" — what does that mean?',
      answer: 'This means our admin team is reviewing your agency documents. This usually takes 1-2 business days. You can browse events but cannot register students until verified.'
    }
  ];

  const handleCreateTicket = async () => {
    if (!formData.subject || !formData.description) return;

    try {
      await createTicket(formData);
      setIsNewTicketOpen(false);
      setFormData({ subject: '', description: '', category: 'Technical Issue', priority: 'Medium' });
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      await addTicketResponse(selectedTicket.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 uppercase text-[10px] font-bold tracking-wider px-2 py-0.5">Open</Badge>;
      case 'In Progress':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 uppercase text-[10px] font-bold tracking-wider px-2 py-0.5">Progress</Badge>;
      case 'Resolved':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 uppercase text-[10px] font-bold tracking-wider px-2 py-0.5">Resolved</Badge>;
      default:
        return <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-12 bg-[#F9FAFB] min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-[#042C53] rounded-3xl mx-4 md:mx-8 mt-8 p-12 md:p-16 text-center shadow-2xl shadow-[#042C53]/20">
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <h1 className="text-2xl font-semibold text-[#B5D4F4] font-['Outfit'] tracking-tight">
            Agent Support Centre
          </h1>
          <p className="text-[#85B7EB] text-sm md:text-base font-medium max-w-lg mx-auto leading-relaxed">
            How can we help you today? Search our knowledge base or reach out to our institutional support team.
          </p>
          <div className="relative max-w-xl mx-auto group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#042C53] transition-colors" />
            <input
              type="text"
              placeholder="Search for articles, guides, and troubleshooting..."
              className="w-full bg-white border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-[#B5D4F4]/30 shadow-xl transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {/* Abstract shapes for premium look */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-3xl" />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-8">
        {[
          { label: 'Student Registration', icon: UserPlus, color: '#E6F1FB', iconColor: '#0C447C' },
          { label: 'Events & Seats', icon: Calendar, color: '#EAF3DE', iconColor: '#27500A' },
          { label: 'Invoices & Payments', icon: FileText, color: '#FAEEDA', iconColor: '#633806' },
          { label: 'Account & Profile', icon: User, color: '#EEEDFE', iconColor: '#3C3489' },
        ].map((item, idx) => {
          const count = faqs.filter(f => f.category === item.label).length;
          return (
            <button
              key={idx}
              className="flex flex-col items-center p-6 bg-white border border-gray-100 rounded-2xl hover:border-[#042C53] hover:shadow-lg transition-all group"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                style={{ backgroundColor: item.color }}
              >
                <item.icon className="w-6 h-6" style={{ color: item.iconColor }} />
              </div>
              <span className="text-sm font-bold text-[#111827]">{item.label}</span>
              <span className="text-[11px] text-gray-500 mt-1 font-medium">{count} articles</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 md:px-8">
        {/* FAQ Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#111827] font-['Outfit'] flex items-center gap-2">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-8">
            {[...new Set(faqs.map(f => f.category))].map((cat) => {
              const categoryFaqs = faqs.filter(f => f.category === cat);
              if (categoryFaqs.length === 0) return null;

              return (
                <div key={cat} className="space-y-4">
                  <div className="flex items-center gap-3 px-1">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{cat}</span>
                    <div className="h-[1px] w-full bg-gray-100" />
                  </div>
                  <div className="space-y-3">
                    {categoryFaqs.map((faq) => (
                      <div
                        key={faq.id}
                        className="bg-white border border-gray-100 rounded-2xl overflow-hidden transition-all hover:shadow-sm"
                      >
                        <button
                          onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                          className="w-full flex items-center justify-between p-5 text-left group"
                        >
                          <span className="text-sm font-semibold text-[#111827] group-hover:text-[#042C53] transition-colors">{faq.question}</span>
                          <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform", openFaq === faq.id && "rotate-180")} />
                        </button>
                        {openFaq === faq.id && (
                          <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-200">
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tickets Section */}
        <div className="lg:sticky lg:top-24 lg:h-fit space-y-6">
          {/* Action Card */}
          <Card className="border-none shadow-xl shadow-gray-200/50 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-[#042C53] text-white p-8">
              <CardTitle className="text-xl font-bold font-['Outfit']">Raise a Support Ticket</CardTitle>
              <CardDescription className="text-[#85B7EB] text-xs font-medium">
                Can't find your answer? Our team typically responds within 6 hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <Button
                onClick={() => setIsNewTicketOpen(true)}
                className="w-full h-12 bg-[#042C53] hover:bg-[#0C447C] text-white font-bold rounded-xl shadow-lg shadow-[#042C53]/20"
              >
                <MessageSquarePlus className="w-4 h-4 mr-2" />
                Submit New Ticket
              </Button>
            </CardContent>
          </Card>

          {/* Ticket List */}
          <Card className="border-none shadow-xl shadow-gray-200/50 bg-white rounded-3xl overflow-hidden">
            <CardHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold font-['Outfit']">My Tickets</CardTitle>
              <button className="text-[#042C53] text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:underline">
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {tickets.length === 0 ? (
                <div className="p-12 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No active tickets</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={cn(
                        "p-5 cursor-pointer transition-all hover:bg-gray-50 flex items-start gap-4",
                        selectedTicket?.id === ticket.id && "bg-blue-50/50 border-l-4 border-l-[#042C53]"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        ticket.status === 'Open' ? "bg-red-500" : ticket.status === 'In Progress' ? "bg-amber-500" : "bg-emerald-500"
                      )} />
                      <div className="flex-1 min-width-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-bold text-[#111827] truncate">{ticket.subject}</h4>
                          {getStatusBadge(ticket.status)}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 font-medium">
                          {ticket.category || 'General'} · {format(new Date(ticket.createdAt), 'MMM dd')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
          {selectedTicket && (
            <div className="flex flex-col h-[80vh]">
              <div className="p-8 bg-[#042C53] text-white">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-bold font-['Outfit']">{selectedTicket.subject}</h2>
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                    <p className="text-[#85B7EB] text-xs font-medium">
                      Ticket #{selectedTicket.id.slice(-6).toUpperCase()} · Created {format(new Date(selectedTicket.createdAt), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mt-6">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#85B7EB]">Category</span>
                    <p className="text-sm font-semibold">{selectedTicket.category || 'Technical Issue'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#85B7EB]">Priority</span>
                    <p className="text-sm font-semibold">{selectedTicket.priority}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/50">
                {/* Initial Description */}
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 p-6 rounded-2xl rounded-tl-none shadow-sm max-w-[90%]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#042C53] mb-2 block opacity-50">Initial Inquiry</span>
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">{selectedTicket.description}</p>
                  </div>
                </div>

                {/* Chat Responses */}
                {selectedTicket.responses?.map((resp, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col max-w-[85%] p-5 rounded-2xl shadow-sm",
                      resp.senderId.role === 'admin'
                        ? "self-start bg-white border border-gray-100 rounded-tl-none"
                        : "self-end bg-[#042C53] text-white rounded-tr-none ml-auto"
                    )}
                  >
                    <div className="flex justify-between items-center mb-2 gap-6">
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-widest",
                        resp.senderId.role === 'admin' ? 'text-[#042C53]' : 'text-[#B5D4F4]'
                      )}>
                        {resp.senderId.role === 'admin' ? 'Institutional Support' : 'Agency Representative'}
                      </span>
                      <span className="text-[9px] font-bold opacity-50">
                        {format(new Date(resp.timestamp), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{resp.message}</p>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-white border-t border-gray-100">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder="Type your response here..."
                      className="min-h-[100px] bg-gray-50 border-gray-200 rounded-2xl focus:ring-[#042C53]/10 focus:border-[#042C53] text-sm font-medium p-4"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                  </div>
                  <Button
                    size="icon"
                    className="h-14 w-14 rounded-2xl bg-[#042C53] hover:bg-[#0C447C] shadow-lg shadow-[#042C53]/20 shrink-0"
                    disabled={!newMessage.trim() || loading || selectedTicket.status === 'Closed'}
                    onClick={handleSendMessage}
                  >
                    <Send className="w-5 h-5 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Ticket Dialog */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-['Outfit'] text-[#042C53]">Raise Support Ticket</DialogTitle>
            <DialogDescription className="font-medium">
              Provide details about your issue and our team will get back to you shortly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-bold uppercase tracking-widest text-gray-500">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="rounded-xl bg-gray-50 border-gray-100 font-semibold h-11">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical Issue">Technical Issue</SelectItem>
                    <SelectItem value="Student-Related">Student-Related</SelectItem>
                    <SelectItem value="Payment / Invoice">Payment / Invoice</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-xs font-bold uppercase tracking-widest text-gray-500">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => setFormData({ ...formData, priority: val })}
                >
                  <SelectTrigger className="rounded-xl bg-gray-50 border-gray-100 font-semibold h-11">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-widest text-gray-500">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief description of the issue"
                className="rounded-xl bg-gray-50 border-gray-100 font-semibold h-11"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-gray-500">Message</Label>
              <Textarea
                id="description"
                placeholder="Describe your issue in detail..."
                className="min-h-[150px] rounded-xl bg-gray-50 border-gray-100 font-medium p-4"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" onClick={() => setIsNewTicketOpen(false)} className="rounded-xl font-bold px-6">Cancel</Button>
            <Button
              onClick={handleCreateTicket}
              disabled={!formData.subject || !formData.description || loading}
              className="bg-[#042C53] hover:bg-[#0C447C] text-white rounded-xl font-bold px-8"
            >
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportPage;
