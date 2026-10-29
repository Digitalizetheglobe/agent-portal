import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  GraduationCap,
  MapPin,
  Power,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { hasStaffRole } from '../../utils/staffRoles';
import { courseAPI, applicationAPI, formatApiError } from '../../utils/api';
import { readFee } from '../../utils/programFee';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
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
import UniversityLogo from '../../components/university/UniversityLogo';
import CourseModal from '../../components/modals/CourseModal';

// The program text may hold "Entry requirements: ..." and "Awarding body: ..." lines (added by the file import).
// Those are shown on their own; everything else is the description.
const splitDescription = (text) => {
  const about = [];
  const requirements = [];
  let awardingBody = '';
  String(text || '').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const req = trimmed.match(/^Entry requirements:\s*(.*)$/i);
    const body = trimmed.match(/^Awarding body:\s*(.*)$/i);
    if (req) requirements.push(...req[1].split(/[;\n]/).map((r) => r.trim()).filter(Boolean));
    else if (body) awardingBody = body[1].trim();
    else about.push(trimmed);
  });
  return { about: about.join('\n'), requirements, awardingBody };
};

const Fact = ({ label, children }) => (
  <div className="rounded-xl bg-[#F9FAFB] border border-gray-100 px-4 py-3 min-w-0">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
    <p className="text-sm font-semibold text-gray-900 mt-1 break-words">{children}</p>
  </div>
);

const statusBadge = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'underreview' || s === 'submitted') {
    return <Badge className="bg-[#FAEEDA] text-[#633806] border-[#FAC775] text-[10px] font-bold">{status}</Badge>;
  }
  if (s === 'rejected' || s === 'withdrawn') {
    return <Badge variant="destructive" className="text-[10px] font-bold">{status}</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] font-bold">{status || 'Draft'}</Badge>;
};

const ProgramDetailsPage = () => {
  const { programId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { deleteCourse, updateCourseStatus } = useData();
  // University and program information is maintained by the Head of Admission
  const canManage = hasStaffRole(user, 'head_admission');

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // 'status' | 'delete' | null
  const [pending, setPending] = useState(false);

  const fetchProgram = useCallback(async () => {
    try {
      const { data } = await courseAPI.getById(programId);
      setProgram(data.course || data);
    } catch (error) {
      setProgram(null);
      toast.error('Could not load this program', { description: formatApiError(error) });
    } finally {
      setLoading(false);
    }
  }, [programId]);

  const fetchApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const { data } = await applicationAPI.getAll({ courseId: programId, limit: 100 });
      setApplications(Array.isArray(data) ? data : data?.applications || []);
    } catch {
      // non-critical: the rest of the page still works
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  }, [programId]);

  useEffect(() => {
    setLoading(true);
    fetchProgram();
    fetchApplications();
  }, [fetchProgram, fetchApplications]);

  const universities = program?.universities || [];
  const fee = useMemo(() => readFee(program?.tuitionFee), [program]);
  const { about, requirements, awardingBody } = useMemo(() => splitDescription(program?.description), [program]);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'universities', label: 'Universities', count: universities.length },
    { key: 'applications', label: 'Applications', count: applications.length },
  ];
  const requestedTab = searchParams.get('tab');
  const activeTab = tabs.some((t) => t.key === requestedTab) ? requestedTab : 'overview';
  const setTab = (key) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.set('tab', key);
    return next;
  }, { replace: true });

  const back = (
    <Button variant="outline" size="sm" onClick={() => navigate('/admin/courses')} className="text-xs w-fit bg-white border-gray-200 hover:border-[#042C53]">
      <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Programs
    </Button>
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-6">
        {back}
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#042C53] mx-auto"></div>
            <p className="text-xs text-gray-500 mt-3 font-medium">Loading program...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-6">
        {back}
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-16 text-center text-gray-500">
            <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
            <h3 className="font-bold text-base text-gray-800">Program not found</h3>
            <p className="text-xs text-gray-400 mt-1">It may have been deleted.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = program.status === 'active';
  const openToAll = universities.length === 0;

  const confirmStatus = async () => {
    setPending(true);
    try {
      await updateCourseStatus(program.id, isActive ? 'inactive' : 'active');
      await fetchProgram();
    } catch {
      // error toast already shown
    } finally {
      setPending(false);
      setDialog(null);
    }
  };

  const confirmDelete = async () => {
    setPending(true);
    try {
      await deleteCourse(program.id);
      navigate('/admin/courses');
    } catch {
      // error toast already shown
      setPending(false);
      setDialog(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-6" data-testid="admin-program-details-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {back}
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setDialog('status')} className="h-10 text-xs font-semibold bg-white">
              <Power className="w-4 h-4 mr-2" /> {isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button variant="outline" onClick={() => setDialog('delete')} className="h-10 text-xs font-semibold bg-white text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
            <Button onClick={() => setEditOpen(true)} className="h-10 text-xs font-semibold bg-[#042C53] hover:bg-[#0C447C] text-white">
              <Edit2 className="w-4 h-4 mr-2" /> Edit details
            </Button>
          </div>
        )}
      </div>

      <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="h-1.5 bg-[#042C53]" />
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {program.level && (
              <span className="inline-flex items-center gap-1.5 bg-[#EEF2FF] text-[#1E3A8A] text-xs font-semibold px-3 py-1.5 rounded-lg">
                <GraduationCap size={13} /> {program.level}
              </span>
            )}
            {program.duration && (
              <span className="inline-flex items-center gap-1.5 bg-[#F3F4F6] text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                <Clock size={13} /> {program.duration}
              </span>
            )}
            {program.code && (
              <span className="border border-gray-200 text-gray-600 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg">{program.code}</span>
            )}
            <Badge className={cn('border-none text-[10px] font-bold uppercase tracking-wider px-2.5 py-1', isActive ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-gray-100 text-gray-600')}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] font-['Outfit'] leading-tight">{program.name}</h1>
          {program.department && <p className="text-sm text-gray-600">{program.department}</p>}

          {!isActive && (
            <div className="flex items-start gap-2 rounded-lg bg-[#FAEEDA] text-[#633806] px-4 py-3 text-xs">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>This program is <strong>inactive</strong>. Agents cannot select it for new applications.</span>
            </div>
          )}
          {!openToAll ? null : (
            <div className="flex items-start gap-2 rounded-lg bg-[#E6F1FB] text-[#0C447C] px-4 py-3 text-xs">
              <Building2 size={14} className="mt-0.5 shrink-0" />
              <span>No university is assigned, so this program is open to every university.</span>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <Fact label="Tuition">{fee ? fee.text : 'Not set'}</Fact>
            <Fact label="Universities">{openToAll ? 'All' : universities.length}</Fact>
            <Fact label="Applications">{loadingApps ? '...' : applications.length}</Fact>
            <Fact label="Added">{program.createdAt ? new Date(program.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</Fact>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-1 border-b border-[#D1D5DB] overflow-x-auto" role="tablist">
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(tab.key)}
              className={cn(
                'flex items-center gap-2 py-3 px-4 -mb-px text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap rounded-t-lg',
                selected
                  ? 'border-[#0C447C] text-[#0C447C] bg-[#E6F1FB]'
                  : 'border-transparent text-[#374151] hover:text-[#111827] hover:bg-[#F3F4F6]'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn('px-1.5 py-0.5 text-[11px] font-mono rounded-full font-semibold', selected ? 'bg-[#0C447C] text-white' : 'bg-[#E5E7EB] text-[#374151]')}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-[#E5E7EB] bg-white shadow-none">
              <CardHeader className="border-b border-gray-100 px-6 py-4">
                <CardTitle className="text-base font-bold text-gray-900 font-['Outfit']">About this program</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {about || 'No description has been added for this program yet.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Fact label="Level">{program.level || '-'}</Fact>
                  <Fact label="Duration">{program.duration || '-'}</Fact>
                  <Fact label="Faculty">{program.department || '-'}</Fact>
                  <Fact label="Program code">{program.code || '-'}</Fact>
                  {awardingBody && <Fact label="Awarding body">{awardingBody}</Fact>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#E5E7EB] bg-white shadow-none">
              <CardHeader className="border-b border-gray-100 px-6 py-4">
                <CardTitle className="text-base font-bold text-gray-900 font-['Outfit']">Entry requirements</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {requirements.length === 0 ? (
                  <p className="text-sm text-gray-500">No entry requirements are listed. Add them in Edit details as a line starting with "Entry requirements:".</p>
                ) : (
                  <ul className="space-y-2.5">
                    {requirements.map((requirement, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <CheckCircle2 size={16} className="text-[#27500A] shrink-0 mt-0.5" /> {requirement}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#E5E7EB] bg-white shadow-sm">
            <CardContent className="p-6 space-y-3">
              <p className="text-xs text-gray-500">Tuition (what the student pays)</p>
              <p className="text-3xl font-bold text-[#111827] font-['Outfit']">{fee ? fee.text : 'On request'}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'universities' && (
        <Card className="border-[#E5E7EB] bg-white shadow-none overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            {openToAll ? (
              <div className="p-12 text-center text-gray-500">
                <Building2 size={36} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs font-semibold text-gray-700">Open to every university</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Edit the program to limit it to specific universities.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">University</TableHead>
                    <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {universities.map((u) => (
                    <TableRow key={u.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                      <TableCell className="px-6 py-3.5">
                        <button type="button" onClick={() => navigate(`/admin/universities/${u.id}`)} className="flex items-center gap-3 text-left hover:underline">
                          <UniversityLogo university={u} size="sm" />
                          <span className="text-sm font-semibold text-gray-900">{u.name}</span>
                        </button>
                      </TableCell>
                      <TableCell className="px-6 py-3.5 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} className="text-gray-400" /> {[u.city, u.country].filter(Boolean).join(', ') || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'applications' && (
        <Card className="border-[#E5E7EB] bg-white shadow-none overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">App Number</TableHead>
                  <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Student</TableHead>
                  <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">University</TableHead>
                  <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Intake</TableHead>
                  <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingApps ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#042C53] mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                      <FileText size={36} className="mx-auto mb-2 opacity-20" />
                      <p className="text-xs font-semibold text-gray-700">No applications for this program yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((app) => (
                    <TableRow key={app.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                      <TableCell className="px-6 py-3.5">
                        <button type="button" onClick={() => navigate(`/admin/applications/${app.id}`)} className="font-mono text-xs font-bold text-[#042C53] hover:underline text-left">
                          {app.applicationNumber}
                        </button>
                      </TableCell>
                      <TableCell className="px-6 py-3.5">
                        <div className="font-semibold text-xs text-gray-900">{app.student?.name || 'Unknown Student'}</div>
                        <div className="text-[11px] text-gray-400">{app.student?.email}</div>
                      </TableCell>
                      <TableCell className="px-6 py-3.5 text-xs text-gray-700">{app.university?.name || app.universityName || '-'}</TableCell>
                      <TableCell className="px-6 py-3.5 text-xs text-gray-600">
                        {app.intakeTerm ? `${app.intakeTerm} ` : ''}{app.intakeYear || app.intake || 'N/A'}
                      </TableCell>
                      <TableCell className="px-6 py-3.5 text-right">{statusBadge(app.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <CourseModal
          open={editOpen}
          onOpenChange={setEditOpen}
          course={program}
          onSuccess={fetchProgram}
        />
      )}

      <AlertDialog open={dialog === 'delete'} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-900">Delete program</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{program.name}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={pending} className="bg-red-600 hover:bg-red-700 text-white text-xs h-9">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === 'status'} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-900">{isActive ? 'Deactivate program' : 'Activate program'}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              {isActive
                ? `Deactivating "${program.name}" will hide it from the program selection for students and agents.`
                : `Activating "${program.name}" will make it selectable in the student registration forms.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatus} disabled={pending} className="bg-[#042C53] hover:bg-[#042C53]/90 text-white text-xs h-9">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProgramDetailsPage;
