import React, { useMemo, useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Mail,
  Phone,
  FileText,
  Eye,
  Check,
  X,
  GraduationCap,
  Compass,
  UserCheck,
  Building2,
  Globe,
  Search,
  ExternalLink,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Clock,
  ArrowUpRight,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { cn } from "../../lib/utils";
import AgentApplicationDetails from "../../components/agent/AgentApplicationDetails";
import AgentReviewDialog from "../../components/modals/AgentReviewDialog";
import ReviewActionButtons from "../../components/agent/ReviewActionButtons";
import AgentContractPanel from "../../components/agent/AgentContractPanel";
import UniversityAccessPanel, { getAccessLabel } from "../../components/agent/UniversityAccessPanel";
import {
  getOnboardingStatus,
  canReviewDocuments,
  getDocChecklist,
  hasSufficientDocs,
  HISTORY_LABELS,
  IN_REVIEW_STATUSES,
  getWaitingFor
} from "../../utils/onboarding";
import {
  getStudentStageInfo,
  getFunnelLabel,
  hasFeesPaid,
  isBeyondApplication,
  STUDENT_JOURNEY
} from "../../utils/studentProgress";
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_HEADINGS,
  DISPLAY_STAGE_INFO
} from "../../utils/pipeline";
const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014";
const formatCurrency = (amount) => {
  if (amount === null || amount === void 0) return "\u2014";
  return `$${Number(amount).toLocaleString("en-US")}`;
};
const docBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (["approved", "verified"].includes(s)) return "bg-[#EAF3DE] text-[#27500A]";
  if (s === "rejected") return "bg-[#FCEBEB] text-[#791F1F]";
  if (["pending", "submitted"].includes(s)) return "bg-[#FAEEDA] text-[#633806]";
  return "bg-[#F3F4F6] text-[#4B5563]";
};
const SectionHeader = ({ title, hint }) => /* @__PURE__ */ React.createElement("div", { className: "bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2" }, /* @__PURE__ */ React.createElement("h3", { className: "text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider" }, title), hint && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-[#9CA3AF] mt-0.5" }, hint));
const getStudentName = (s) => {
  if (!s) return "N/A";
  if (s.name && s.name !== "N/A") return s.name;
  const cf = s.customFields || {};
  if (cf.name) return cf.name;
  const entries = cf instanceof Map ? Array.from(cf.entries()) : Object.entries(cf);
  for (const [k, v] of entries) {
    if (typeof v === "string" && k.toLowerCase().includes("name")) return v;
  }
  return "Student";
};
const AgentDetailPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    agents,
    fetchAgents,
    students,
    fetchStudents,
    invoices,
    fetchInvoices,
    viewAgentDocument,
    verifyAgent,
    reviewAgentOnboarding
  } = useData();
  const { user } = useAuth();
  const canReviewDocs = canReviewDocuments(user);
  const [reviewAction, setReviewAction] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [visaStageFilter, setVisaStageFilter] = useState("all");
  useEffect(() => {
    fetchAgents();
    fetchStudents?.();
    fetchInvoices?.();
  }, [fetchAgents, fetchStudents, fetchInvoices]);
  const agent = useMemo(() => agents.find((a) => a.id === agentId), [agents, agentId]);
  const activeTab = searchParams.get("tab") || (agent?.status === "active" ? "students" : "profile");
  const setTab = (tabName) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tabName);
      return next;
    });
  };
  const agentStudents = useMemo(() => {
    if (!agent) return [];
    return students.filter((s) => (s.agentId?.id || s.agentId?._id || s.agentId) === agent.id);
  }, [students, agent]);
  const agentInvoices = useMemo(() => {
    if (!agent) return [];
    return invoices.filter((inv) => (inv.agentId?.id || inv.agentId?._id || inv.agentId) === agent.id);
  }, [invoices, agent]);
  const displayedStudents = useMemo(() => {
    return agentStudents.filter((s) => {
      const q = studentSearch.toLowerCase().trim();
      const sName = getStudentName(s).toLowerCase();
      const sEmail = (s.email || "").toLowerCase();
      const sUniv = (s.university || s.universityName || "").toLowerCase();
      const matchesSearch = !q || sName.includes(q) || sEmail.includes(q) || sUniv.includes(q);
      const sStage = s.pipelineStage || "Application";
      const matchesStage = stageFilter === "all" || sStage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [agentStudents, studentSearch, stageFilter]);
  const visaCounts = useMemo(() => {
    const counts = {};
    PIPELINE_STAGES.forEach((st) => {
      counts[st] = 0;
    });
    agentStudents.forEach((s) => {
      const st = s.pipelineStage || "Application";
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [agentStudents]);
  const visaStudents = useMemo(() => {
    if (visaStageFilter === "all") return agentStudents;
    return agentStudents.filter((s) => (s.pipelineStage || "Application") === visaStageFilter);
  }, [agentStudents, visaStageFilter]);
  const invoiceMetrics = useMemo(() => {
    const total = agentInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    const paid = agentInvoices.filter((inv) => (inv.status || "").toLowerCase() === "paid").reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    const pending = total - paid;
    return { total, paid, pending, count: agentInvoices.length };
  }, [agentInvoices]);
  if (!agent) {
    return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center min-h-[60vh] gap-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-gray-500 font-medium" }, "Agent not found or data still loading..."), /* @__PURE__ */ React.createElement(Button, { onClick: () => navigate("/admin/agents") }, "Back to Agents"));
  }
  const isVerified = agent.isVerified || agent.verificationStatus === "approved";
  const docs = agent.verificationDocuments || [];
  const status = getOnboardingStatus(agent);
  const inReview = IN_REVIEW_STATUSES.includes(agent.onboardingStatus);
  const missing = getDocChecklist(agent).filter((c) => !c.doc);
  const reviewDocument = async (doc, documentStatus) => {
    let remarks;
    if (documentStatus === "rejected") {
      remarks = window.prompt("Reason for rejecting this document:");
      if (!remarks) return;
    }
    try {
      await verifyAgent(agent.id, { documentId: doc.id || doc._id, documentStatus, remarks });
      toast.success(`Document ${documentStatus}`, { description: doc.docType });
    } catch {
    }
  };
  const profile = [
    ["Agency Name", agent.agencyName || agent.name],
    ["Registration #", agent.businessRegistrationNumber || "\u2014"],
    ["Country", agent.country || "Not specified"],
    ["Region", agent.region || "Not specified"],
    ["Account Manager", agent.accountManager?.name || "Unassigned"],
    ["Joined Date", agent.createdAt ? formatDate(agent.createdAt) : null],
    ["Address", agent.fullAddress || "\u2014"]
  ];
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 sm:p-6 bg-[#F9FAFB] min-h-screen font-['Inter']" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => navigate("/admin/agents"),
      className: "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#042C53] hover:underline mb-4"
    },
    /* @__PURE__ */ React.createElement(ArrowLeft, { className: "w-4 h-4" }),
    " Back to Agents"
  ), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-3" }, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight" }, agent.name), agent.agentCode && /* @__PURE__ */ React.createElement("span", { className: "text-xs font-mono font-semibold text-[#0C447C] bg-[#E6F1FB] px-2 py-0.5 rounded border border-[#0C447C]/20" }, agent.agentCode), /* @__PURE__ */ React.createElement(Badge, { className: cn("border-none text-[10px] font-medium h-5", agent.status === "active" ? "bg-[#EAF3DE] text-[#27500A]" : "bg-[#F3F4F6] text-[#4B5563]") }, agent.status === "active" ? "Active" : "Inactive"), /* @__PURE__ */ React.createElement(Badge, { className: "border-none text-[10px] font-medium h-5 bg-[#EEEDFE] text-[#3C3489]" }, "Access: ", getAccessLabel(agent))), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#6B7280] mt-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, agent.agencyName || "Independent agent"), agent.country && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "\xB7"), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1 font-medium text-slate-700" }, /* @__PURE__ */ React.createElement(Globe, { className: "w-3.5 h-3.5 text-slate-400" }), " ", agent.country)), agent.accountManager && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, "\xB7"), /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-purple-50 text-purple-700 font-medium px-2 py-0.5 rounded" }, "AM: ", agent.accountManager.name))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-xs text-[#111827]" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1.5 break-all" }, /* @__PURE__ */ React.createElement(Mail, { className: "w-3.5 h-3.5 text-[#9CA3AF] shrink-0" }), " ", agent.email), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Phone, { className: "w-3.5 h-3.5 text-[#9CA3AF] shrink-0" }), " ", agent.phone || "No phone"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    Button,
    {
      variant: "outline",
      onClick: () => navigate(`/admin/agents/${agent.id}/report`),
      className: "h-9 px-3.5 text-xs font-semibold border-slate-200 bg-white"
    },
    /* @__PURE__ */ React.createElement(BarChart3, { className: "w-4 h-4 mr-1.5" }),
    " Performance Report"
  ))), (!isVerified || inReview) && /* @__PURE__ */ React.createElement(Card, { className: "border-[#E5E7EB] shadow-none bg-white mb-5 p-4 space-y-3", "data-testid": "onboarding-review-card" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(Badge, { className: cn("border-none text-xs font-medium h-6", status.style) }, isVerified ? "Verified" : status.label), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#4B5563]" }, getWaitingFor(agent))), /* @__PURE__ */ React.createElement(ReviewActionButtons, { agent, onOpenDialog: setReviewAction })), ["rejected", "correction_required"].includes(agent.onboardingStatus) && agent.verificationRemarks && /* @__PURE__ */ React.createElement("div", { className: cn("text-sm border p-3 rounded-lg", agent.onboardingStatus === "rejected" ? "bg-red-50 border-red-100 text-red-800" : "bg-orange-50 border-orange-100 text-orange-900") }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, agent.onboardingStatus === "rejected" ? "Reason for rejection: " : "Changes requested: "), agent.verificationRemarks)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 border-b border-[#E5E7EB] mb-6 overflow-x-auto" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setTab("students"),
      className: cn(
        "flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
        activeTab === "students" ? "border-[#0C447C] text-[#0C447C] bg-white rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
      )
    },
    /* @__PURE__ */ React.createElement(GraduationCap, { className: "w-4 h-4" }),
    /* @__PURE__ */ React.createElement("span", null, "Students"),
    /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-slate-100 text-slate-700 font-semibold" }, agentStudents.length)
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setTab("invoices"),
      className: cn(
        "flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
        activeTab === "invoices" ? "border-[#0C447C] text-[#0C447C] bg-white rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
      )
    },
    /* @__PURE__ */ React.createElement(FileText, { className: "w-4 h-4" }),
    /* @__PURE__ */ React.createElement("span", null, "Invoices"),
    /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-slate-100 text-slate-700 font-semibold" }, agentInvoices.length)
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setTab("visa"),
      className: cn(
        "flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
        activeTab === "visa" ? "border-[#0C447C] text-[#0C447C] bg-white rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
      )
    },
    /* @__PURE__ */ React.createElement(Compass, { className: "w-4 h-4" }),
    /* @__PURE__ */ React.createElement("span", null, "Visa Tracking"),
    /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-indigo-50 text-indigo-700 font-semibold" }, agentStudents.filter(isBeyondApplication).length)
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setTab("profile"),
      className: cn(
        "flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
        activeTab === "profile" ? "border-[#0C447C] text-[#0C447C] bg-white rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
      )
    },
    /* @__PURE__ */ React.createElement(UserCheck, { className: "w-4 h-4" }),
    /* @__PURE__ */ React.createElement("span", null, "Profile & Verification"),
    docs.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-emerald-50 text-emerald-700 font-semibold" }, docs.length, " docs")
  )), activeTab === "students" && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-400 uppercase tracking-wider" }, "Total Registered"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-slate-900 mt-1 font-['Outfit']" }, agentStudents.length), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 mt-0.5" }, "All student applications")), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-400 uppercase tracking-wider" }, "In Visa Process"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-[#534AB7] mt-1 font-['Outfit']" }, agentStudents.filter((s) => ["Visa15", "Visa35", "Visa70", "Arrival", "Medical", "Registration"].includes(s.pipelineStage)).length), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 mt-0.5" }, "15% through Registration")), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-400 uppercase tracking-wider" }, "Fees Paid"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-[#047857] mt-1 font-['Outfit']" }, agentStudents.filter(hasFeesPaid).length), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 mt-0.5" }, "Tuition verified")), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-400 uppercase tracking-wider" }, "Visa 100%"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-[#0C447C] mt-1 font-['Outfit']" }, agentStudents.filter((s) => s.pipelineStage === "Visa100").length), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 mt-0.5" }, "Commission eligible"))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E7EB] shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1" }, /* @__PURE__ */ React.createElement(Search, { className: "w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Search students by name, email, or university...",
      value: studentSearch,
      onChange: (e) => setStudentSearch(e.target.value),
      className: "w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#0C447C]"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: stageFilter,
      onChange: (e) => setStageFilter(e.target.value),
      className: "text-xs rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 focus:outline-none focus:border-[#0C447C]"
    },
    /* @__PURE__ */ React.createElement("option", { value: "all" }, "All Visa Stages"),
    PIPELINE_STAGES.map((stage) => /* @__PURE__ */ React.createElement("option", { key: stage, value: stage }, PIPELINE_STAGE_LABELS[stage] || stage, " (", visaCounts[stage] || 0, ")"))
  ), (studentSearch || stageFilter !== "all") && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setStudentSearch("");
        setStageFilter("all");
      },
      className: "text-xs text-slate-500 hover:text-slate-800 underline px-2"
    },
    "Clear"
  ))), /* @__PURE__ */ React.createElement(Card, { className: "border-[#E5E7EB] shadow-sm bg-white overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement(Table, null, /* @__PURE__ */ React.createElement(TableHeader, null, /* @__PURE__ */ React.createElement(TableRow, { className: "bg-[#F9FAFB] border-b border-[#E5E7EB]" }, /* @__PURE__ */ React.createElement(TableHead, { className: "text-[11px] font-bold text-slate-500 uppercase py-3" }, "Student Name"), /* @__PURE__ */ React.createElement(TableHead, { className: "text-[11px] font-bold text-slate-500 uppercase py-3" }, "University & Course"), /* @__PURE__ */ React.createElement(TableHead, { className: "text-[11px] font-bold text-slate-500 uppercase py-3" }, "Visa Stage"), /* @__PURE__ */ React.createElement(TableHead, { className: "text-[11px] font-bold text-slate-500 uppercase py-3" }, "Fees Paid"), /* @__PURE__ */ React.createElement(TableHead, { className: "text-[11px] font-bold text-slate-500 uppercase py-3" }, "Applied Date"), /* @__PURE__ */ React.createElement(TableHead, { className: "text-[11px] font-bold text-slate-500 uppercase py-3 text-right" }, "Action"))), /* @__PURE__ */ React.createElement(TableBody, null, displayedStudents.length === 0 ? /* @__PURE__ */ React.createElement(TableRow, null, /* @__PURE__ */ React.createElement(TableCell, { colSpan: 6, className: "text-center py-12 text-slate-400" }, /* @__PURE__ */ React.createElement(GraduationCap, { className: "w-10 h-10 mx-auto mb-2 opacity-30" }), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-slate-700" }, "No students found"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 mt-0.5" }, agentStudents.length === 0 ? "This agent has not registered any students yet." : "No students match your search criteria."))) : displayedStudents.map((st) => {
    const stageInfo = getStudentStageInfo(st);
    const sName = getStudentName(st);
    return /* @__PURE__ */ React.createElement(TableRow, { key: st.id || st._id, className: "hover:bg-slate-50/80 transition-colors" }, /* @__PURE__ */ React.createElement(TableCell, { className: "py-3" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-xs text-slate-900" }, sName), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-400 truncate max-w-xs" }, st.email || "No email provided")), /* @__PURE__ */ React.createElement(TableCell, { className: "py-3" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-xs text-slate-800" }, st.university || st.universityName || "\u2014"), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-slate-500" }, st.course || st.courseInterested || "\u2014")), /* @__PURE__ */ React.createElement(TableCell, { className: "py-3" }, /* @__PURE__ */ React.createElement(Badge, { className: cn("border-none text-[10px] h-5 font-semibold", stageInfo.style) }, stageInfo.label)), /* @__PURE__ */ React.createElement(TableCell, { className: "py-3" }, hasFeesPaid(st) ? /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 text-[11px] font-semibold text-[#047857]" }, /* @__PURE__ */ React.createElement(CheckCircle2, { className: "w-3.5 h-3.5" }), " Paid") : /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-400" }, "Pending")), /* @__PURE__ */ React.createElement(TableCell, { className: "py-3 text-xs text-slate-600" }, formatDate(st.createdAt || st.submittedAt)), /* @__PURE__ */ React.createElement(TableCell, { className: "py-3 text-right" }, /* @__PURE__ */ React.createElement(
      Link,
      {
        to: `/admin/students/${st.id || st._id}`,
        className: "inline-flex items-center gap-1 text-xs font-semibold text-[#0C447C] hover:underline"
      },
      "View ",
      /* @__PURE__ */ React.createElement(ArrowUpRight, { className: "w-3.5 h-3.5" })
    )));
  })))))), activeTab === "invoices" && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-[#E6F1FB]/60 border border-[#B5D4F4] rounded-xl p-4" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-bold text-[#0C447C] uppercase tracking-wider mb-2" }, "Invoice Progression Pipeline"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 text-xs text-[#0C447C]" }, /* @__PURE__ */ React.createElement("span", { className: "px-2.5 py-1 rounded bg-white font-semibold shadow-sm border border-slate-200" }, "1. Invoice Submitted"), /* @__PURE__ */ React.createElement("span", null, "\u2794"), /* @__PURE__ */ React.createElement("span", { className: "px-2.5 py-1 rounded bg-white font-semibold shadow-sm border border-slate-200" }, "2. University Payment In"), /* @__PURE__ */ React.createElement("span", null, "\u2794"), /* @__PURE__ */ React.createElement("span", { className: "px-2.5 py-1 rounded bg-[#EAF3DE] text-[#27500A] font-semibold shadow-sm border border-emerald-200" }, "3. Payment Released to Agent (Slip Uploaded)"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-400 uppercase tracking-wider" }, "Total Invoiced"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-slate-900 mt-1 font-['Outfit']" }, formatCurrency(invoiceMetrics.total)), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 mt-0.5" }, invoiceMetrics.count, " invoices submitted")), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-400 uppercase tracking-wider" }, "Released to Agent"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-[#047857] mt-1 font-['Outfit']" }, formatCurrency(invoiceMetrics.paid)), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 mt-0.5" }, "Settled commission payout")), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-slate-400 uppercase tracking-wider" }, "Pending / Due"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-[#92400E] mt-1 font-['Outfit']" }, formatCurrency(invoiceMetrics.pending)), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500 mt-0.5" }, "Awaiting university payment"))), /* @__PURE__ */ React.createElement(Card, { className: "border-[#E5E7EB] shadow-sm bg-white overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement(Table, null, /* @__PURE__ */ React.createElement(TableHeader, null, /* @__PURE__ */ React.createElement(TableRow, { className: "bg-[#F9FAFB] border-b border-[#E5E7EB]" }, /* @__PURE__ */ React.createElement(TableHead, { className: "text-[11px] font-bold text-slate-500 uppercase py-3" }, "Invoice #"), /* @__PURE__ */ React.createElement(TableHead, { className: "text-[11px] font-bold text-slate-500 uppercase py-3" }, "Amount"), /* @__PURE__ */ React.createElement(TableHead, { className: "text-[11px] font-bold text-slate-500 uppercase py-3" }, "Submitted Date"), /* @__PURE__ */ React.createElement(TableHead, { className: "text-[11px] font-bold text-slate-500 uppercase py-3" }, "University Payment"), /* @__PURE__ */ React.createElement(TableHead, { className: "text-[11px] font-bold text-slate-500 uppercase py-3" }, "Payout Status"), /* @__PURE__ */ React.createElement(TableHead, { className: "text-[11px] font-bold text-slate-500 uppercase py-3 text-right" }, "Payment Slip"))), /* @__PURE__ */ React.createElement(TableBody, null, agentInvoices.length === 0 ? /* @__PURE__ */ React.createElement(TableRow, null, /* @__PURE__ */ React.createElement(TableCell, { colSpan: 6, className: "text-center py-12 text-slate-400" }, /* @__PURE__ */ React.createElement(FileText, { className: "w-10 h-10 mx-auto mb-2 opacity-30" }), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-slate-700" }, "No invoices submitted"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 mt-0.5" }, "Agent can submit invoices once student visas reach 100% and tuition fees are verified."))) : agentInvoices.map((inv) => {
    const isPaid = (inv.status || "").toLowerCase() === "paid";
    return /* @__PURE__ */ React.createElement(TableRow, { key: inv.id || inv._id, className: "hover:bg-slate-50/80 transition-colors" }, /* @__PURE__ */ React.createElement(TableCell, { className: "py-3 font-semibold text-xs text-slate-900 font-mono" }, inv.invoiceNumber || `INV-${inv.id?.slice(0, 8)}`), /* @__PURE__ */ React.createElement(TableCell, { className: "py-3 text-xs font-bold text-slate-900" }, formatCurrency(inv.amount)), /* @__PURE__ */ React.createElement(TableCell, { className: "py-3 text-xs text-slate-600" }, formatDate(inv.submissionDate || inv.createdAt)), /* @__PURE__ */ React.createElement(TableCell, { className: "py-3" }, inv.universityPaid || inv.universityPaymentReceivedAt ? /* @__PURE__ */ React.createElement(Badge, { className: "bg-emerald-50 text-emerald-700 border-none text-[10px] font-semibold" }, "Received ", inv.universityPaymentReceivedAt ? formatDate(inv.universityPaymentReceivedAt) : "") : /* @__PURE__ */ React.createElement(Badge, { className: "bg-amber-50 text-amber-700 border-none text-[10px] font-semibold" }, "Awaiting University")), /* @__PURE__ */ React.createElement(TableCell, { className: "py-3" }, /* @__PURE__ */ React.createElement(Badge, { className: cn(
      "border-none text-[10px] font-semibold capitalize",
      isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
    ) }, inv.status || "Submitted")), /* @__PURE__ */ React.createElement(TableCell, { className: "py-3 text-right" }, inv.paymentSlipUrl || inv.receiptUrl ? /* @__PURE__ */ React.createElement(
      "a",
      {
        href: inv.paymentSlipUrl || inv.receiptUrl,
        target: "_blank",
        rel: "noreferrer",
        className: "inline-flex items-center gap-1 text-xs font-semibold text-[#047857] hover:underline"
      },
      "View Slip ",
      /* @__PURE__ */ React.createElement(ExternalLink, { className: "w-3.5 h-3.5" })
    ) : /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-400" }, "\u2014")));
  })))))), activeTab === "visa" && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(Card, { className: "p-5 bg-white border-[#E5E7EB] shadow-sm" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider mb-4" }, "EMGS Visa Progression Funnel (Vijay Sequential Stages)"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2" }, PIPELINE_STAGES.map((stage, idx) => {
    const count = visaCounts[stage] || 0;
    const isSelected = visaStageFilter === stage;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: stage,
        onClick: () => setVisaStageFilter(isSelected ? "all" : stage),
        className: cn(
          "p-3 rounded-xl border text-left transition-all",
          isSelected ? "border-[#0C447C] bg-[#E6F1FB]/60 shadow-sm ring-1 ring-[#0C447C]" : "border-slate-200 bg-slate-50 hover:border-slate-300"
        )
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold text-slate-400" }, "Step ", idx + 1), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold font-mono text-slate-800 bg-white px-1.5 py-0.2 rounded border border-slate-200" }, count)),
      /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold text-slate-900 truncate" }, PIPELINE_STAGE_LABELS[stage] || stage),
      /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500 mt-0.5 truncate" }, PIPELINE_STAGE_HEADINGS[stage])
    );
  }))), visaStageFilter !== "all" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-600 font-medium" }, "Filtering by: ", /* @__PURE__ */ React.createElement("strong", null, PIPELINE_STAGE_LABELS[visaStageFilter] || visaStageFilter), " (", visaStudents.length, " students)"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setVisaStageFilter("all"),
      className: "text-xs font-semibold text-[#0C447C] hover:underline"
    },
    "Show all stages"
  )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" }, visaStudents.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400" }, /* @__PURE__ */ React.createElement(Compass, { className: "w-10 h-10 mx-auto mb-2 opacity-30" }), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-slate-700" }, "No students currently in this stage"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 mt-0.5" }, "Students advance through each step sequentially.")) : visaStudents.map((st) => {
    const sName = getStudentName(st);
    const stageInfo = getStudentStageInfo(st);
    return /* @__PURE__ */ React.createElement("div", { key: st.id || st._id, className: "bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement(Badge, { className: cn("border-none text-[10px] font-semibold", stageInfo.style) }, stageInfo.label), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-400" }, formatDate(st.createdAt))), /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-sm text-slate-900" }, sName), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 mt-0.5" }, st.university || st.universityName || "University unassigned"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, st.course || st.courseInterested || "Course pending"), st.pipelineStage === "Arrival" && st.flightDetails && /* @__PURE__ */ React.createElement("div", { className: "mt-2.5 p-2 bg-emerald-50 rounded-lg text-[11px] text-emerald-800" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, "Flight Logistics:"), /* @__PURE__ */ React.createElement("p", null, st.flightDetails.flightNumber, " \xB7 ", st.flightDetails.airport, " \xB7 ", formatDate(st.flightDetails.arrivalDate))), st.pipelineStage === "Medical" && /* @__PURE__ */ React.createElement("div", { className: "mt-2.5 p-2 bg-blue-50 rounded-lg text-[11px] text-blue-800" }, "Post-arrival medical check within 7 days of landing.")), /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-3 border-t border-slate-100 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-medium text-slate-500" }, hasFeesPaid(st) ? "\u2713 Tuition Paid" : "Tuition Pending"), /* @__PURE__ */ React.createElement(
      Link,
      {
        to: `/admin/students/${st.id || st._id}`,
        className: "text-xs font-semibold text-[#0C447C] hover:underline flex items-center gap-1"
      },
      "Manage ",
      /* @__PURE__ */ React.createElement(ArrowUpRight, { className: "w-3.5 h-3.5" })
    )));
  }))), activeTab === "profile" && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" }, /* @__PURE__ */ React.createElement("div", { className: "lg:col-span-2 space-y-6" }, /* @__PURE__ */ React.createElement(Card, { className: "border-[#E5E7EB] shadow-none overflow-hidden bg-white" }, /* @__PURE__ */ React.createElement("div", { className: "bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider" }, "Verification Documents"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-[#9CA3AF]" }, "Official legal documents uploaded by the agent")), hasSufficientDocs(agent) ? /* @__PURE__ */ React.createElement(Badge, { className: "border-none text-[10px] bg-emerald-50 text-emerald-700 font-medium" }, "\u2713 Policy Met (1+ Doc Provided)") : /* @__PURE__ */ React.createElement(Badge, { className: "border-none text-[10px] bg-amber-50 text-amber-700 font-medium" }, "Awaiting 1 Required Document")), /* @__PURE__ */ React.createElement("div", { className: "px-4 py-2 bg-slate-50/60 border-b border-slate-100 text-[11px] text-slate-500" }, /* @__PURE__ */ React.createElement("strong", null, "QStudy Policy:"), " Uploading ", /* @__PURE__ */ React.createElement("strong", null, "ANY ONE"), " of Company Profile, Business Registration, or Director Passport is sufficient for approval."), docs.length === 0 && missing.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center gap-3 py-10" }, /* @__PURE__ */ React.createElement(FileText, { className: "w-10 h-10 text-gray-200" }), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#6B7280] font-medium" }, "No documents uploaded yet.")) : /* @__PURE__ */ React.createElement("div", { className: "divide-y divide-[#F3F4F6]" }, docs.map((doc, i) => /* @__PURE__ */ React.createElement("div", { key: doc.id || doc._id || i, className: "px-4 py-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-[13px] font-medium text-[#111827]" }, doc.docType), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-[#6B7280] truncate" }, doc.fileName, doc.uploadedAt ? ` \xB7 ${formatDate(doc.uploadedAt)}` : "")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 shrink-0" }, /* @__PURE__ */ React.createElement(Badge, { className: cn("border-none text-[10px] font-medium h-5 capitalize", docBadge(doc.status)) }, doc.status), /* @__PURE__ */ React.createElement(Button, { variant: "outline", size: "sm", className: "h-7 text-xs", onClick: () => viewAgentDocument(agent.id, doc.id || doc._id) }, /* @__PURE__ */ React.createElement(Eye, { className: "w-3.5 h-3.5 mr-1.5" }), " View"))), canReviewDocs && inReview && doc.status === "pending" && /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mt-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "outline", size: "sm", className: "flex-1 h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50", onClick: () => reviewDocument(doc, "approved") }, /* @__PURE__ */ React.createElement(Check, { className: "w-3.5 h-3.5 mr-1" }), " Approve"), /* @__PURE__ */ React.createElement(Button, { variant: "outline", size: "sm", className: "flex-1 h-7 text-xs border-red-200 text-red-600 hover:bg-red-50", onClick: () => reviewDocument(doc, "rejected") }, /* @__PURE__ */ React.createElement(X, { className: "w-3.5 h-3.5 mr-1" }), " Reject")), doc.remarks && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-[#6B7280] bg-[#F9FAFB] rounded p-2 mt-2" }, /* @__PURE__ */ React.createElement("strong", null, "Remarks:"), " ", doc.remarks))), missing.map(({ type }) => /* @__PURE__ */ React.createElement("div", { key: type, className: "px-4 py-3 flex items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[13px] font-medium text-[#111827]" }, type), /* @__PURE__ */ React.createElement(Badge, { className: cn(
    "border-none text-[10px] h-5",
    hasSufficientDocs(agent) ? "bg-[#F3F4F6] text-[#6B7280]" : "bg-amber-50 text-amber-700 font-semibold"
  ) }, hasSufficientDocs(agent) ? "Not Uploaded (Optional)" : "Pending Upload (Any 1)"))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-semibold text-[#111827] mb-3" }, "Application Details"), /* @__PURE__ */ React.createElement(AgentApplicationDetails, { agent, className: "grid grid-cols-1 xl:grid-cols-2 gap-6 space-y-0" }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement(AgentContractPanel, { agent }), /* @__PURE__ */ React.createElement(UniversityAccessPanel, { agent }), /* @__PURE__ */ React.createElement(Card, { className: "border-[#E5E7EB] shadow-none overflow-hidden bg-white" }, /* @__PURE__ */ React.createElement(SectionHeader, { title: "Profile Particulars" }), /* @__PURE__ */ React.createElement("dl", { className: "p-4 space-y-2.5" }, profile.map(([label, val]) => /* @__PURE__ */ React.createElement("div", { key: label, className: "flex justify-between gap-4 text-sm" }, /* @__PURE__ */ React.createElement("dt", { className: "text-[#6B7280] shrink-0 text-xs" }, label), /* @__PURE__ */ React.createElement("dd", { className: "text-[#111827] font-medium text-xs text-right break-words min-w-0" }, val || /* @__PURE__ */ React.createElement("span", { className: "text-[#9CA3AF] font-normal" }, "Not provided")))))), (agent.onboardingHistory || []).length > 0 && /* @__PURE__ */ React.createElement(Card, { className: "border-[#E5E7EB] shadow-none overflow-hidden bg-white" }, /* @__PURE__ */ React.createElement(SectionHeader, { title: "Review Trail" }), /* @__PURE__ */ React.createElement("ol", { className: "divide-y divide-[#F3F4F6] px-4" }, [...agent.onboardingHistory].reverse().map((h, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: "py-2.5 text-xs" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-[#111827]" }, HISTORY_LABELS[h.action] || h.action), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-[#6B7280] mt-0.5" }, h.byName || "Staff", " \xB7 ", new Date(h.at).toLocaleString()), h.remarks && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-[#4B5563] mt-1 bg-slate-50 p-1.5 rounded" }, '"', h.remarks, '"'))))))), /* @__PURE__ */ React.createElement(AgentReviewDialog, { agent, action: reviewAction, onClose: () => setReviewAction(null) }));
};
export default AgentDetailPage;
