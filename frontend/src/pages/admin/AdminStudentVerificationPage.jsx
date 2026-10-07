import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Eye,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { studentVerificationAPI, formatApiError } from '../../utils/api';
import {
  STUDENT_VERIFICATION_STATUS,
  STUDENT_VERIFICATION_STATUS_LABELS
} from '../../constants/status';

const STATUS_TABS = [
  { key: '', label: 'All', icon: Shield, color: 'text-slate-600' },
  { key: STUDENT_VERIFICATION_STATUS.PENDING, label: 'Pending', icon: AlertCircle, color: 'text-amber-600' },
  { key: STUDENT_VERIFICATION_STATUS.UNDER_REVIEW, label: 'Under Review', icon: Clock, color: 'text-blue-600' },
  { key: STUDENT_VERIFICATION_STATUS.VERIFIED, label: 'Verified', icon: CheckCircle2, color: 'text-emerald-600' },
  { key: STUDENT_VERIFICATION_STATUS.REJECTED, label: 'Rejected', icon: XCircle, color: 'text-red-600' },
];

const getVerificationBadge = (status) => {
  switch (status) {
    case STUDENT_VERIFICATION_STATUS.VERIFIED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
        </span>
      );
    case STUDENT_VERIFICATION_STATUS.UNDER_REVIEW:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          <Clock className="w-3 h-3 text-blue-600" /> Under Review
        </span>
      );
    case STUDENT_VERIFICATION_STATUS.REJECTED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
          <XCircle className="w-3 h-3 text-red-600" /> Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertCircle className="w-3 h-3 text-amber-600" /> Pending
        </span>
      );
  }
};

const AdminStudentVerificationPage = () => {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const [activeStatus, setActiveStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState({});
  const LIMIT = 15;

  const fetchQueue = useCallback(async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const qp = {
        page: params.page ?? page,
        limit: LIMIT,
        envelope: 'true'
      };
      const resolvedStatus = params.status !== undefined ? params.status : activeStatus;
      const resolvedSearch = params.search !== undefined ? params.search : search;
      if (resolvedStatus) qp.status = resolvedStatus;
      if (resolvedSearch) qp.search = resolvedSearch;

      const res = await studentVerificationAPI.getQueue(qp);
      const body = res.data;
      const list = Array.isArray(body) ? body : (body?.students || []);
      const total = parseInt(res.headers?.['x-total-count'] || body?.total || list.length, 10) || list.length;
      const pages = parseInt(res.headers?.['x-total-pages'] || body?.totalPages || 1, 10) || 1;

      setStudents(list);
      setTotalCount(total);
      setTotalPages(pages);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, activeStatus, search]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const statuses = ['Pending', 'UnderReview', 'Verified', 'Rejected'];
      const counts = {};
      await Promise.all(
        statuses.map(async (s) => {
          try {
            const res = await studentVerificationAPI.getQueue({ status: s, limit: 1, page: 1, envelope: 'true' });
            const body = res.data;
            const total = parseInt(res.headers?.['x-total-count'] || body?.total || 0, 10) || 0;
            counts[s] = total;
          } catch (_) { counts[s] = 0; }
        })
      );
      setStatusCounts(counts);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchStatusCounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (statusKey) => {
    setActiveStatus(statusKey);
    setPage(1);
    fetchQueue({ status: statusKey, page: 1, search });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setSearch(trimmed);
    setPage(1);
    fetchQueue({ search: trimmed, page: 1, status: activeStatus });
  };

  const handleSearchClear = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
    fetchQueue({ search: '', page: 1, status: activeStatus });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchQueue({ page: newPage });
  };

  const handleRefresh = () => {
    fetchQueue();
    fetchStatusCounts();
  };

  const handleInitiate = async (studentId, studentName) => {
    setActionLoading(studentId);
    try {
      await studentVerificationAPI.initiate(studentId);
      toast.success(`Verification initiated for ${studentName}`);
      fetchQueue();
      fetchStatusCounts();
    } catch (err) {
      toast.error('Failed to initiate verification', { description: formatApiError(err) });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const totalAll = useMemo(() => Object.values(statusCounts).reduce((a, b) => a + b, 0), [statusCounts]);

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6" data-testid="verification-queue-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#042C53]" />
            Student Verification
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Review and verify student identity and documentation
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={loading}
          className="h-9 border-[#E5E7EB] bg-white hover:bg-gray-50 text-xs font-semibold"
        >
          <RefreshCw className={cn('w-4 h-4 mr-1.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tab.key === '' ? totalAll : (statusCounts[tab.key] ?? null);
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              data-testid={`tab-${tab.key || 'all'}`}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border transition-all',
                isActive
                  ? 'bg-[#042C53] text-white border-[#042C53] shadow-sm'
                  : 'bg-white text-[#374151] border-[#E5E7EB] hover:bg-gray-50'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-white' : tab.color)} />
              {tab.label}
              {count !== null && count > 0 && (
                <span className={cn(
                  'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  isActive ? 'bg-white/20 text-white' : 'bg-[#F3F4F6] text-[#6B7280]'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Card className="border-[#E5E7EB] shadow-sm bg-white">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <Input
                id="verification-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email, phone, or country..."
                className="pl-9 h-9 text-sm border-[#E5E7EB] focus-visible:ring-[#042C53]/20"
              />
            </div>
            <Button type="submit" className="h-9 bg-[#042C53] hover:bg-[#0C447C] text-white font-bold text-xs px-4">
              Search
            </Button>
            {search && (
              <Button type="button" variant="outline" onClick={handleSearchClear} className="h-9 border-[#E5E7EB] text-xs font-semibold">
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold font-['Outfit'] text-[#111827]">
            {activeStatus ? `${STUDENT_VERIFICATION_STATUS_LABELS[activeStatus] || activeStatus} Students` : 'All Students'}
            {search && <span className="ml-2 text-[#9CA3AF] font-normal text-sm">&#183; "{search}"</span>}
          </CardTitle>
          <Badge variant="outline" className="text-xs font-bold bg-[#F9FAFB]">
            {totalCount} {totalCount === 1 ? 'Student' : 'Students'}
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#042C53] mx-auto" />
              <p className="text-xs text-[#6B7280] mt-3 font-medium">Loading verification queue...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-[#111827]">Failed to load queue</p>
              <p className="text-xs text-[#6B7280] mt-1">{error}</p>
              <Button onClick={handleRefresh} variant="outline" className="mt-4 text-xs font-semibold">Try Again</Button>
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center">
              <Shield className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold text-[#111827]">
                {search ? 'No students match your search' : activeStatus ? `No ${STUDENT_VERIFICATION_STATUS_LABELS[activeStatus] || activeStatus} students` : 'No students in the verification queue'}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                {search ? 'Try adjusting your search terms.' : 'Students will appear here as they are added.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="py-3 px-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Student</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Contact</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Agent</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Docs</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Submitted</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {students.map((student) => {
                    const agentInfo = typeof student.agentId === 'object' ? student.agentId : null;
                    const docCount = Array.isArray(student.documents) ? student.documents.length : 0;
                    const isActing = actionLoading === student.id;
                    const notReady = student.readyForVerification === false;
                    const canInitiate = (
                      student.verificationStatus === STUDENT_VERIFICATION_STATUS.PENDING ||
                      student.verificationStatus === STUDENT_VERIFICATION_STATUS.REJECTED
                    );
                    return (
                      <tr key={student.id} className="hover:bg-[#F9FAFB] transition-colors" data-testid={`verification-row-${student.id}`}>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#E6F1FB] flex items-center justify-center shrink-0 text-[#042C53] font-bold text-xs uppercase">
                              {(student.name || '?').charAt(0)}
                            </div>
                            <div>
                              <button onClick={() => navigate(`/admin/students/${student.id}`)} className="font-bold text-[#042C53] hover:underline text-xs text-left">
                                {student.name || 'Unknown'}
                              </button>
                              <p className="text-[10px] text-[#9CA3AF] font-medium mt-0.5 uppercase tracking-wider">
                                ID: {student.id?.slice(-8).toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-[#374151] truncate max-w-[160px]">{student.email || 'N/A'}</p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">{student.country || '—'}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          {agentInfo ? (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                              <div>
                                <p className="font-semibold text-[#374151]">{agentInfo.name || 'Agent'}</p>
                                {agentInfo.agencyName && <p className="text-[10px] text-[#9CA3AF]">{agentInfo.agencyName}</p>}
                              </div>
                            </div>
                          ) : <span className="text-[#9CA3AF]">—</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                            docCount > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                          )}>
                            {docCount} {docCount === 1 ? 'doc' : 'docs'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {getVerificationBadge(student.verificationStatus)}
                            {student.verificationStatus === STUDENT_VERIFICATION_STATUS.REJECTED && student.verificationRejectionReason && (
                              <p className="text-[10px] text-red-500 truncate max-w-[140px]" title={student.verificationRejectionReason}>
                                {student.verificationRejectionReason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#6B7280]">{formatDate(student.createdAt)}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-[10px] font-bold border-[#E5E7EB] hover:bg-[#F0F7FF] hover:border-[#042C53] hover:text-[#042C53]"
                              onClick={() => navigate(`/admin/students/${student.id}`)}
                              title="View full details"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            {canInitiate && (
                              <Button
                                size="sm"
                                disabled={isActing || notReady}
                                title={notReady ? 'Verification starts after the student is enrolled with a verified deposit' : undefined}
                                className="h-7 px-2.5 text-[10px] font-bold bg-[#042C53] hover:bg-[#0C447C] text-white disabled:opacity-50"
                                onClick={() => handleInitiate(student.id, student.name)}
                              >
                                {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                                  student.verificationStatus === STUDENT_VERIFICATION_STATUS.REJECTED ? 'Re-open' : 'Start'
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[#F3F4F6] flex items-center justify-between">
              <p className="text-xs text-[#6B7280] font-medium">Page {page} of {totalPages} &middot; {totalCount} total</p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-[#E5E7EB]" disabled={page <= 1 || loading} onClick={() => handlePageChange(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  return (
                    <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm"
                      className={cn('h-8 w-8 p-0 text-xs font-bold', p === page ? 'bg-[#042C53] hover:bg-[#0C447C]' : 'border-[#E5E7EB]')}
                      onClick={() => handlePageChange(p)}>
                      {p}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-[#E5E7EB]" disabled={page >= totalPages || loading} onClick={() => handlePageChange(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStudentVerificationPage;
