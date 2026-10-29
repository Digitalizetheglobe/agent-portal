import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Mail,
  User,
  FileText,
  Edit2,
  Power,
  ExternalLink,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Percent,
  Megaphone,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasStaffRole } from '../../utils/staffRoles';
import { useData } from '../../context/DataContext';
import { universityAPI, formatApiError } from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';
import UniversityModal from '../../components/modals/UniversityModal';
import UniversityContent from '../../components/university/UniversityContent';
import UniversityLogo from '../../components/university/UniversityLogo';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const websiteHref = (url) => (url.startsWith('http') ? url : `https://${url}`);

const FactLabel = ({ children }) => (
  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{children}</span>
);

const UniversityDetailsPage = () => {
  const { id: paramId, universityId } = useParams();
  const id = paramId || universityId;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, user } = useAuth();
  const staffView = isAdmin();
  // University information is maintained by the Head of Admission
  const canManage = hasStaffRole(user, 'head_admission');
  const { updateUniversityStatus } = useData();

  const [university, setUniversity] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingApps, setLoadingApps] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const backPath = staffView ? '/admin/universities' : '/agent/universities';

  // Fetch University Details
  const fetchUniversityDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await universityAPI.getById(id);
      setUniversity(response.data);
    } catch (err) {
      console.error('Error fetching university details:', err);
      toast.error('Failed to load university details', { description: formatApiError(err) });
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch Associated Applications
  const fetchApplications = useCallback(async () => {
    if (!id) return;
    setLoadingApps(true);
    try {
      const response = await universityAPI.getApplications(id);
      const data = response.data;
      if (Array.isArray(data)) {
        setApplications(data);
      } else if (data && Array.isArray(data.applications)) {
        setApplications(data.applications);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error('Error fetching university applications:', err);
      // Non-critical: do not crash whole page
    } finally {
      setLoadingApps(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUniversityDetails();
    fetchApplications();
  }, [fetchUniversityDetails, fetchApplications]);

  const handleToggleStatus = async () => {
    if (!university) return;
    setIsUpdatingStatus(true);
    const newStatus = university.status === 'active' ? 'inactive' : 'active';
    try {
      await updateUniversityStatus(university.id, newStatus);
      setUniversity(prev => ({ ...prev, status: newStatus }));
      toast.success(`University marked as ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status', { description: formatApiError(err) });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getApplicationStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'underreview' || s === 'submitted') {
      return <Badge className="bg-[#FAEEDA] text-[#633806] border-[#FAC775] text-[10px] font-bold">{status}</Badge>;
    }
    if (s === 'rejected' || s === 'withdrawn') {
      return <Badge variant="destructive" className="text-[10px] font-bold">{status}</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] font-bold">{status || 'Draft'}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="text-xs">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Universities
        </Button>
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#042C53] mx-auto"></div>
            <p className="text-xs text-gray-500 mt-3 font-medium">Loading university information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="text-xs">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Universities
        </Button>
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-16 text-center text-gray-500">
            <AlertCircle size={40} className="mx-auto mb-3 opacity-20" />
            <h3 className="font-bold text-base text-gray-800">University not found</h3>
            <p className="text-xs text-gray-400 mt-1">The requested university does not exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brochures = Array.isArray(university.brochures) ? university.brochures : [];
  const fees = Array.isArray(university.fees) ? university.fees : [];
  const isActive = university.status === 'active';
  const missingRate = university.commissionRate == null;
  const location = `${university.city ? `${university.city}, ` : ''}${university.country}`;

  // The first thing anyone wants to know, before any detail
  const facts = [
    { label: 'Programs', icon: GraduationCap, value: university.programCount ?? 0, hint: 'active programs', tab: 'programs' },
    { label: 'News & scholarships', icon: Megaphone, value: university.updateCount ?? 0, hint: university.scholarshipCount ? `${university.scholarshipCount} scholarship${university.scholarshipCount === 1 ? '' : 's'}` : 'latest updates', tab: 'news' },
    { label: 'Brochures', icon: FileText, value: brochures.length, hint: 'to download', tab: 'fees' },
    { label: staffView ? 'Applications' : 'Your applications', icon: GraduationCap, value: applications.length, hint: staffView ? 'across all agents' : 'sent here', tab: 'applications' },
  ];

  const tabs = [
    { key: 'programs', label: 'Programs', count: university.programCount ?? 0 },
    { key: 'news', label: 'News & scholarships', count: university.updateCount ?? 0 },
    { key: 'fees', label: 'Fees & brochures', count: fees.length + brochures.length },
    { key: 'about', label: 'About' },
    { key: 'applications', label: staffView ? 'Applications' : 'My applications', count: applications.length },
  ];
  const requestedTab = searchParams.get('tab');
  const activeTab = tabs.some((t) => t.key === requestedTab) ? requestedTab : 'programs';
  const setTab = (key) => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set('tab', key); return next; }, { replace: true });

  const contentSection = ['programs', 'news', 'fees'].includes(activeTab) ? activeTab : null;

  return (
    <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-5" data-testid="university-details-page">
      {/* Back button & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(backPath)}
          className="text-xs w-fit bg-white border-gray-200 hover:border-[#042C53]"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Universities
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {!staffView && isActive && (
            <Button
              size="sm"
              onClick={() => navigate(`/agent/applications?university=${university.id}`)}
              className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs h-9 px-4 gap-1.5"
            >
              Apply a student <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleStatus}
                disabled={isUpdatingStatus}
                className={`text-xs h-9 ${
                  isActive
                    ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                    : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <Power className="w-3.5 h-3.5 mr-1.5" />
                {isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                size="sm"
                onClick={() => setEditModalOpen(true)}
                className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs h-9 px-4 gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit details
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Things that need attention come before anything else */}
      {!isActive && (
        <div className="flex items-start gap-2 rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-3 text-xs text-[#4B5563]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            This university is <strong>inactive</strong>. {staffView ? 'Agents cannot select it for new applications.' : 'It cannot be selected for new applications right now.'}
          </span>
        </div>
      )}
      {staffView && missingRate && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#FAC775] bg-[#FAEEDA] px-4 py-3 text-xs text-[#633806]">
          <span className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>No commission rate is set, so invoices for this university cannot be approved. Rates are managed on the Commission page.</span>
          </span>
          {canManage && (
            <Button size="sm" variant="outline" className="h-8 text-xs border-[#633806]/30 text-[#633806]" onClick={() => navigate('/admin/commission')}>
              Open Commission
            </Button>
          )}
        </div>
      )}

      {/* Who they are */}
      <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="h-1.5 bg-[#042C53]" />
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex items-start gap-4">
            <UniversityLogo university={university} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-[#111827] font-['Outfit']">{university.name}</h1>
                {university.code && (
                  <Badge variant="outline" className="font-mono text-xs font-bold tracking-wider uppercase bg-gray-50 text-gray-700">
                    {university.code}
                  </Badge>
                )}
                {isActive ? (
                  <Badge className="bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 font-medium text-gray-700">
                  <MapPin size={13} className="text-[#042C53]" /> {location}
                </span>
                {university.website && (
                  <a
                    href={websiteHref(university.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Globe size={13} /> {university.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Key facts */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {facts.map((fact) => {
              const Icon = fact.icon;
              const content = (
                <>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Icon size={11} /> {fact.label}
                  </p>
                  <p className={cn(
                    'text-xl font-bold mt-1 font-[\'Outfit\']',
                    fact.tone === 'warn' ? 'text-[#633806]' : fact.tone === 'good' ? 'text-[#27500A]' : 'text-[#042C53]'
                  )}>
                    {fact.value}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{fact.hint}</p>
                </>
              );
              return fact.tab ? (
                <button
                  key={fact.label}
                  type="button"
                  onClick={() => setTab(fact.tab)}
                  className="text-left rounded-xl border border-gray-100 bg-[#F9FAFB] p-3.5 hover:border-[#042C53]/30 hover:bg-white transition-colors"
                >
                  {content}
                </button>
              ) : (
                <div key={fact.label} className="rounded-xl border border-gray-100 bg-[#F9FAFB] p-3.5">{content}</div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
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
                <span className={cn(
                  'px-1.5 py-0.5 text-[11px] font-mono rounded-full font-semibold',
                  selected ? 'bg-[#0C447C] text-white' : 'bg-[#E5E7EB] text-[#374151]'
                )}>{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Programs, news and scholarships, fees and brochures (loaded once, shown by tab) */}
      <UniversityContent university={university} canManage={canManage} onChanged={fetchUniversityDetails} show={contentSection} />

      {activeTab === 'about' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="border-[#E5E7EB] bg-white shadow-none h-full">
              <CardHeader className="border-b border-gray-100 px-6 py-4">
                <CardTitle className="text-sm font-bold text-gray-900 font-['Outfit'] flex items-center gap-2">
                  <Building2 size={16} className="text-[#042C53]" /> About {university.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {university.description || 'No description has been added for this university yet.'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100 text-xs">
                  <div><FactLabel>Country</FactLabel><span className="font-semibold text-gray-900 mt-0.5 block">{university.country}</span></div>
                  <div><FactLabel>City</FactLabel><span className="font-semibold text-gray-900 mt-0.5 block">{university.city || 'N/A'}</span></div>
                  <div><FactLabel>Code</FactLabel><span className="font-mono font-bold text-gray-900 mt-0.5 block">{university.code || 'N/A'}</span></div>
                  <div>
                    <FactLabel>Added to the portal</FactLabel>
                    <span className="font-semibold text-gray-900 mt-0.5 block">
                      {new Date(university.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-[#E5E7EB] bg-white shadow-none h-fit">
            <CardHeader className="border-b border-gray-100 px-6 py-4">
              <CardTitle className="text-sm font-bold text-gray-900 font-['Outfit'] flex items-center gap-2">
                <Globe size={16} className="text-[#042C53]" /> Website
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {university.website && (
                <div>
                  <FactLabel>Official website</FactLabel>
                  <a
                    href={websiteHref(university.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-600 hover:text-[#042C53] flex items-center gap-1.5 mt-1 break-all"
                  >
                    <Globe size={12} className="shrink-0" /> {university.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'applications' && (
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="border-b border-gray-100 px-6 py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-gray-900 font-['Outfit'] flex items-center gap-2">
                <GraduationCap size={18} className="text-[#042C53]" /> {staffView ? 'Applications' : 'Your applications'}
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-0.5">
                {staffView
                  ? 'All student applications submitted to this university across agents'
                  : 'Your student applications submitted to this university'}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-bold px-2.5 py-1 bg-gray-50 text-gray-700">
              {applications.length} Total
            </Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">App Number</TableHead>
                  <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Student</TableHead>
                  <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Program</TableHead>
                  <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Level</TableHead>
                  <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Intake</TableHead>
                  <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingApps ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#042C53] mx-auto"></div>
                      <p className="text-xs text-gray-400 mt-2 font-medium">Loading applications...</p>
                    </TableCell>
                  </TableRow>
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      <FileText size={36} className="mx-auto mb-2 opacity-20" />
                      <p className="text-xs font-semibold text-gray-700">No applications on record</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {staffView ? 'No students have applied to this university yet.' : 'You have not sent any student to this university yet.'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((app) => (
                    <TableRow key={app.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                      <TableCell className="px-6 py-3.5">
                        <button
                          onClick={() => navigate(staffView ? `/admin/applications/${app.id}` : `/agent/applications/${app.id}`)}
                          className="font-mono text-xs font-bold text-[#042C53] hover:underline text-left"
                        >
                          {app.applicationNumber}
                        </button>
                      </TableCell>
                      <TableCell className="px-6 py-3.5">
                        <div className="font-semibold text-xs text-gray-900">{app.student?.name || 'Unknown Student'}</div>
                        <div className="text-[11px] text-gray-400">{app.student?.email}</div>
                      </TableCell>
                      <TableCell className="px-6 py-3.5 text-xs text-gray-800 font-medium">{app.courseName || 'N/A'}</TableCell>
                      <TableCell className="px-6 py-3.5 text-xs text-gray-600">{app.courseLevel || 'N/A'}</TableCell>
                      <TableCell className="px-6 py-3.5 text-xs text-gray-600">
                        {app.intakeTerm ? `${app.intakeTerm} ` : ''}{app.intakeYear || app.intake || 'N/A'}
                      </TableCell>
                      <TableCell className="px-6 py-3.5 text-right">{getApplicationStatusBadge(app.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* University Edit Modal */}
      {canManage && (
        <UniversityModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          university={university}
          onSuccess={() => {
            fetchUniversityDetails();
            fetchApplications();
          }}
        />
      )}
    </div>
  );
};

export default UniversityDetailsPage;
