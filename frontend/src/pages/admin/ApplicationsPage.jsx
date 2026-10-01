import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  Plus,
  Search,
  Building2,
  User,
  GraduationCap,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../../components/ui/alert-dialog';
import ApplicationModal from '../../components/modals/ApplicationModal';
import { applicationAPI, formatApiError } from '../../utils/api';
import {
  APPLICATION_STATUS,
  APPLICATION_STATUS_LIST,
  APPLICATION_STATUS_LABELS
} from '../../constants/status';
import { toast } from 'sonner';

export const getStatusBadgeStyle = (status) => {
  switch (status) {
    case APPLICATION_STATUS.DRAFT:
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case APPLICATION_STATUS.SUBMITTED:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case APPLICATION_STATUS.UNDER_REVIEW:
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case APPLICATION_STATUS.VISIT_SCHEDULED:
    case APPLICATION_STATUS.VISIT_COMPLETED:
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case APPLICATION_STATUS.OFFER_RECEIVED:
    case APPLICATION_STATUS.CONDITIONAL_OFFER:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case APPLICATION_STATUS.ADMISSION_CONFIRMED:
      return 'bg-teal-50 text-teal-800 border-teal-200 font-bold';
    case APPLICATION_STATUS.ENROLLED:
      return 'bg-green-100 text-green-900 border-green-300 font-bold';
    case APPLICATION_STATUS.REJECTED:
      return 'bg-red-50 text-red-700 border-red-200';
    case APPLICATION_STATUS.WITHDRAWN:
      return 'bg-slate-100 text-slate-600 border-slate-300';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const ApplicationsPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { universities, agents, deleteApplication } = useData();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(15);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  // Modals & Dialogs
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch applications from backend
  const loadApplications = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        envelope: 'true'
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (universityFilter && universityFilter !== 'all') params.universityId = universityFilter;
      if (isAdmin() && agentFilter && agentFilter !== 'all') params.agentId = agentFilter;

      const response = await applicationAPI.getAll(params);
      const data = response.data;

      if (data && Array.isArray(data.applications)) {
        setApplications(data.applications);
        setTotalCount(data.total || data.applications.length);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.page || page);
      } else if (Array.isArray(data)) {
        setApplications(data);
        setTotalCount(data.length);
        setTotalPages(1);
        setCurrentPage(1);
      } else {
        setApplications([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Error loading applications:', err);
      toast.error('Failed to load applications', { description: formatApiError(err) });
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [limit, searchQuery, statusFilter, universityFilter, agentFilter, isAdmin]);

  useEffect(() => {
    loadApplications(1);
  }, [statusFilter, universityFilter, agentFilter, loadApplications]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadApplications(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setUniversityFilter('all');
    setAgentFilter('all');
    loadApplications(1);
  };

  const handleOpenAdd = () => {
    setSelectedApplication(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (app) => {
    setSelectedApplication(app);
    setModalOpen(true);
  };

  const handleOpenDelete = (app) => {
    setApplicationToDelete(app);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!applicationToDelete) return;
    setIsDeleting(true);
    try {
      await deleteApplication(applicationToDelete.id || applicationToDelete._id);
      loadApplications(currentPage);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setApplicationToDelete(null);
    }
  };

  // KPI calculations
  const stats = useMemo(() => {
    return {
      underReview: applications.filter(a =>
        [APPLICATION_STATUS.UNDER_REVIEW, APPLICATION_STATUS.SUBMITTED, APPLICATION_STATUS.VISIT_SCHEDULED, APPLICATION_STATUS.VISIT_COMPLETED].includes(a.status)
      ).length,
      offersAndAdmission: applications.filter(a =>
        [APPLICATION_STATUS.OFFER_RECEIVED, APPLICATION_STATUS.CONDITIONAL_OFFER, APPLICATION_STATUS.ADMISSION_CONFIRMED].includes(a.status)
      ).length,
      enrolled: applications.filter(a => a.status === APPLICATION_STATUS.ENROLLED).length
    };
  }, [applications]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 font-['Inter']">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] font-['Outfit'] flex items-center gap-2.5">
            <FileCheck className="w-6 h-6 text-[#042C53]" />
            Application Management
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Review, track, and manage all student university applications across the portal
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold h-10 px-5 rounded-lg shadow-sm gap-2"
        >
          <Plus className="w-4 h-4" /> New Application
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Total Applications</p>
            <p className="text-2xl font-semibold text-[#111827] mt-1">{totalCount}</p>
            <p className="text-[10px] font-medium text-blue-600 mt-1">Across partner universities</p>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">In Review & Visits</p>
            <p className="text-2xl font-semibold text-amber-700 mt-1">{stats.underReview}</p>
            <p className="text-[10px] font-medium text-amber-600 mt-1">Active evaluation stage</p>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Offers & Confirmed</p>
            <p className="text-2xl font-semibold text-emerald-700 mt-1">{stats.offersAndAdmission}</p>
            <p className="text-[10px] font-medium text-emerald-600 mt-1">Offers or admissions received</p>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Enrolled Students</p>
            <p className="text-2xl font-semibold text-[#042C53] mt-1">{stats.enrolled}</p>
            <p className="text-[10px] font-medium text-purple-600 mt-1">Finalized university enrollments</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <Card className="border-[#E5E7EB] bg-white shadow-none">
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by application #, student, university, course..."
                className="pl-9 text-xs bg-[#F9FAFB] border-gray-200"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] text-xs bg-[#F9FAFB] border-gray-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All Statuses</SelectItem>
                  {APPLICATION_STATUS_LIST.map((st) => (
                    <SelectItem key={st} value={st}>
                      {APPLICATION_STATUS_LABELS[st] || st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* University Filter */}
              <Select value={universityFilter} onValueChange={setUniversityFilter}>
                <SelectTrigger className="w-[170px] text-xs bg-[#F9FAFB] border-gray-200">
                  <SelectValue placeholder="University" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All Universities</SelectItem>
                  {universities?.map((u) => (
                    <SelectItem key={u.id || u._id} value={String(u.id || u._id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Agent Filter (Admin only) */}
              {isAdmin() && (
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger className="w-[150px] text-xs bg-[#F9FAFB] border-gray-200">
                    <SelectValue placeholder="Agent" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents?.map((a) => (
                      <SelectItem key={a.id || a._id} value={String(a.id || a._id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button type="submit" size="sm" className="bg-[#042C53] hover:bg-[#0C447C] text-xs h-9 px-4">
                Filter
              </Button>
              {(searchQuery || statusFilter !== 'all' || universityFilter !== 'all' || agentFilter !== 'all') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-xs text-gray-500 hover:text-gray-900 h-9"
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card className="border-[#E5E7EB] bg-white shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <TableRow>
                <TableHead className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3.5">
                  Application #
                </TableHead>
                <TableHead className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3.5">
                  Student
                </TableHead>
                <TableHead className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3.5">
                  University
                </TableHead>
                <TableHead className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3.5">
                  Course & Level
                </TableHead>
                <TableHead className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3.5">
                  Intake
                </TableHead>
                {isAdmin() && (
                  <TableHead className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3.5">
                    Agent
                  </TableHead>
                )}
                <TableHead className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3.5">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3.5">
                  Invoice
                </TableHead>
                <TableHead className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3.5">
                  Created
                </TableHead>
                <TableHead className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-3.5 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin() ? 10 : 9} className="h-48 text-center text-xs text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#042C53] border-t-transparent rounded-full animate-spin" />
                      <span>Loading applications...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin() ? 10 : 9} className="h-48 text-center text-xs text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileCheck className="w-8 h-8 text-gray-300" />
                      <span className="font-semibold text-gray-700">No applications found</span>
                      <span className="text-gray-400 text-[11px]">
                        Try adjusting your filters or click "New Application" to submit one.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id || app._id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Application # */}
                    <TableCell className="py-3.5">
                      <button
                        onClick={() => navigate(isAdmin() ? `/admin/applications/${app.id}` : `/agent/applications/${app.id}`)}
                        className="text-xs font-bold text-[#042C53] hover:underline text-left"
                      >
                        {app.applicationNumber || app.id?.slice(-8).toUpperCase()}
                      </button>
                    </TableCell>

                    {/* Student */}
                    <TableCell className="py-3.5">
                      <div className="flex flex-col">
                        <button
                          onClick={() => navigate(isAdmin() ? `/admin/students/${app.studentId || app.student?.id}` : `/agent/students/${app.studentId || app.student?.id}`)}
                          className="text-xs font-semibold text-gray-900 hover:text-[#042C53] hover:underline text-left truncate max-w-[150px]"
                        >
                          {app.student?.name || 'Student'}
                        </button>
                        {app.student?.email && (
                          <span className="text-[10px] text-gray-400 truncate max-w-[150px]">
                            {app.student.email}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* University */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#042C53] shrink-0" />
                        <button
                          onClick={() => navigate(isAdmin() ? `/admin/universities/${app.universityId || app.university?.id}` : `/agent/universities/${app.universityId || app.university?.id}`)}
                          className="text-xs font-medium text-gray-900 hover:text-[#042C53] hover:underline text-left truncate max-w-[160px]"
                          title={app.university?.name}
                        >
                          {app.university?.name || 'University'}
                        </button>
                      </div>
                    </TableCell>

                    {/* Course & Level */}
                    <TableCell className="py-3.5">
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-xs font-medium text-gray-900 truncate max-w-[180px]" title={app.courseName}>
                          {app.courseName}
                        </span>
                        {app.courseLevel && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal border-gray-200 text-gray-600 bg-gray-50">
                            {app.courseLevel}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Intake */}
                    <TableCell className="py-3.5 text-xs text-gray-600">
                      {app.intakeTerm || 'N/A'}
                    </TableCell>

                    {/* Agent (Admin only) */}
                    {isAdmin() && (
                      <TableCell className="py-3.5">
                        <span className="text-xs text-gray-700 truncate max-w-[130px] block" title={app.agent?.name}>
                          {app.agent?.agencyName || app.agent?.name || 'N/A'}
                        </span>
                      </TableCell>
                    )}

                    {/* Status */}
                    <TableCell className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeStyle(app.status)}`}>
                        {APPLICATION_STATUS_LABELS[app.status] || app.status}
                      </span>
                    </TableCell>

                    {/* Invoice Status */}
                    <TableCell className="py-3.5">
                      {app.isInvoiced ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Invoiced
                        </span>
                      ) : app.isInvoiceEligible ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          Eligible
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">
                          Pending
                        </span>
                      )}
                    </TableCell>

                    {/* Created */}
                    <TableCell className="py-3.5 text-[11px] text-gray-500 whitespace-nowrap">
                      {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(isAdmin() ? `/admin/applications/${app.id}` : `/agent/applications/${app.id}`)}
                          title="View Application Details"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(app)}
                          title="Edit Application"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                        </Button>
                        {/* Delete button: Only if not invoiced, and agents only if Draft */}
                        {(!app.isInvoiced && (isAdmin() || app.status === 'Draft')) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDelete(app)}
                            title="Delete Application"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E7EB] bg-white">
            <span className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-gray-900">
                {Math.min(currentPage * limit, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-gray-900">{totalCount}</span> applications
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadApplications(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="text-xs h-8 px-3 border-gray-200"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <span className="text-xs text-gray-600 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadApplications(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="text-xs h-8 px-3 border-gray-200"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <ApplicationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        application={selectedApplication}
        onSuccess={() => loadApplications(currentPage)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-900">
              Delete Application
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              Are you sure you want to delete application{' '}
              <span className="font-semibold text-gray-900">
                "{applicationToDelete?.applicationNumber || applicationToDelete?.id}"
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-xs h-9">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-9"
            >
              {isDeleting ? 'Deleting...' : 'Delete Application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApplicationsPage;
