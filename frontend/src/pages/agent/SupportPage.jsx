import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  Newspaper,
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
  const location = useLocation();
  
  useEffect(() => {
    if (location.state?.openNewTicket) {
      setIsNewTicketOpen(true);
      if (location.state?.prefill) {
        setFormData(prev => ({
          ...prev,
          ...location.state.prefill
        }));
      }
    }
  }, [location]);
  const faqs = [
    // Account & Activation
    {
      id: 'a1',
      category: 'Account & Activation',
      question: 'How does my agent account get approved?',
      answer: 'Complete your agent application, upload the required documents and confirm the declaration that your information is true, then submit it for review. Your Account Manager recommends it, the Head of Recruitment verifies it and the Head of Admission gives the final approval. You are notified at each step. If something needs fixing, the status changes to "Changes requested" and you can update and resubmit.'
    },
    {
      id: 'a2',
      category: 'Account & Activation',
      question: 'My application is "Submitted" or "Under review" — can I edit it?',
      answer: 'No. While your application is with the QStudy team (Submitted, Under review, Recommended or Verified) your details and documents are locked. If a reviewer asks for changes, it unlocks so you can update it and resubmit.'
    },
    {
      id: 'a3',
      category: 'Account & Activation',
      question: 'My application is approved. When can I submit students?',
      answer: 'After approval, the Head of Admission issues your Agent Contract in the portal. Download it, sign it and upload the signed copy from your dashboard. QStudy then uploads your E-Certificate and your account becomes Active. You can submit students only once your account is active. Registration is one time only; the contract is renewable.'
    },
    {
      id: 'a4',
      category: 'Account & Activation',
      question: 'How do I update my profile, agency details or password?',
      answer: 'Go to Settings. Use Profile & Agency to update your contact details, Password & Security to change your password, and Payment Details for the bank details used for your payouts.'
    },
    // Students & Applications
    {
      id: 's1',
      category: 'Students & Applications',
      question: 'How do I register a student and submit an application?',
      answer: 'Go to Students and click Register Student, fill in the student\'s details and save. Then upload their documents in the student\'s profile and create an application under Applications > New Application. Documents are uploaded through the portal — please do not send them by email. Once submitted, the application goes to the QStudy team and the student enters the pipeline at the "Application" stage.'
    },
    {
      id: 's2',
      category: 'Students & Applications',
      question: 'What documents does a student need?',
      answer: 'A valid Passport, Academic Transcripts and an English Proficiency result (IELTS/TOEFL or equivalent). Upload them from the student\'s profile. The QStudy team reviews each document and may mark it "More Information Required" — re-upload it if so. Missing documents delay the application.'
    },
    {
      id: 's3',
      category: 'Students & Applications',
      question: 'What if a student doesn\'t have a passport yet?',
      answer: 'You can register the student first, but the passport is needed to progress the application and the visa. Upload it to the student\'s profile as soon as it is available.'
    },
    {
      id: 's4',
      category: 'Students & Applications',
      question: 'Can I edit a student or move them to the next stage?',
      answer: 'No. Agents can view information and upload documents. The Head of Admission moves students through the stages, and you are notified every time a student\'s stage or payment status changes.'
    },
    {
      id: 's5',
      category: 'Students & Applications',
      question: 'What are the student stages?',
      answer: 'Application → Visa 15% → Visa 35% → Visa 70% → Arrival → Medical Examination → Registration → Fees Paid → Visa 100%. A student is in only one stage at a time, so the counts on your dashboard never double-count. When the student reaches Arrival, the team records who is arriving, the flight details and the arrival date, and you can upload the flight ticket. Visa 100% unlocks your commission invoice.'
    },
    {
      id: 's6',
      category: 'Students & Applications',
      question: 'The student reached Visa 100% — what do I do next?',
      answer: 'Upload the student\'s proof of fee payment on the application page when the student is at Registration. The Head of Admission checks that the payment was received and accepts or rejects the proof. If it is rejected, the reason is shown and you can upload a new proof. Once accepted, the student moves to Fees Paid, and after Visa 100% is reached you can raise a commission invoice.'
    },
    // Invoices & Payments
    {
      id: 'i1',
      category: 'Invoices & Payments',
      question: 'When can I raise a commission invoice?',
      answer: 'When the student has reached Visa 100% and the fees are confirmed as paid. The visa milestones (15%, 35%, 70%) do not earn commission. Go to Invoices > Raise New Invoice and select the eligible applications. An invoice can include only one university and one currency, so raise a separate invoice for each.'
    },
    {
      id: 'i2',
      category: 'Invoices & Payments',
      question: 'What happens after I submit an invoice?',
      answer: 'Submitted → the Head of Admission verifies and approves it → Processing (waiting for the university to pay QStudy) → Accounts pays you and uploads the payment slip → Paid. If changes are needed the invoice shows "Action Required"; correct it and resubmit.'
    },
    {
      id: 'i3',
      category: 'Invoices & Payments',
      question: 'When will I be paid?',
      answer: 'You are paid after the university has paid QStudy and that payment is recorded in the portal; Accounts then pays you by bank transfer, in the same currency the university paid in (USD or RM). The portal only keeps the records — no money moves through it. Track each payment under Payoffs, where you can also view the payment slip.'
    },
    {
      id: 'i4',
      category: 'Invoices & Payments',
      question: 'How is my commission calculated?',
      answer: 'Commission is set per university (for example University 1 = 10%, University 2 = 8%), not per agent. Open Universities to see the commission and fees for each university.'
    },
    // Universities & Updates
    {
      id: 'u1',
      category: 'Universities & Updates',
      question: 'Where do I find university fees, commission and brochures?',
      answer: 'Open Universities from the sidebar. You can search and view university details, fee structures, commission, brochures and scholarship updates. This information is managed by QStudy and cannot be edited by agents.'
    },
    {
      id: 'u2',
      category: 'Universities & Updates',
      question: 'How will I know about announcements and updates?',
      answer: 'QStudy publishes announcements under News & Updates and you are notified when something new is posted, a university\'s information changes, a student\'s stage changes, or a payment is made. All alerts are also listed in Notifications.'
    },
    {
      id: 'u3',
      category: 'Universities & Updates',
      question: 'How do I contact QStudy?',
      answer: 'Use Live Chat to message the QStudy team directly (there is a WhatsApp link in the chat), or raise a support ticket from this page for anything that needs tracking.'
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
          { label: 'Account & Activation', icon: User, color: '#EEEDFE', iconColor: '#3C3489' },
          { label: 'Students & Applications', icon: UserPlus, color: '#E6F1FB', iconColor: '#0C447C' },
          { label: 'Invoices & Payments', icon: FileText, color: '#FAEEDA', iconColor: '#633806' },
          { label: 'Universities & Updates', icon: Newspaper, color: '#EAF3DE', iconColor: '#27500A' },
        ].map((item, idx) => {
          const count = faqs.filter(f => f.category === item.label).length;
          return (
            <button
              key={idx}
              onClick={() => {
                const first = faqs.find(f => f.category === item.label);
                if (first) setOpenFaq(first.id);
                document
                  .getElementById(`faq-${item.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
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
                <div key={cat} id={`faq-${cat.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`} className="space-y-4 scroll-mt-24">
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
