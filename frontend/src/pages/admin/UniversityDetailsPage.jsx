import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Mail,
  User,
  Calendar,
  FileText,
  Edit2,
  Power,
  ExternalLink,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
import { toast } from 'sonner';

const UniversityDetailsPage = () => {
  const { id: paramId, universityId } = useParams();
  const id = paramId || universityId;
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { updateUniversityStatus } = useData();

  const [university, setUniversity] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingApps, setLoadingApps] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
    if (s === 'enrolled' || s === 'admissionconfirmed') {
      return <Badge className="bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] text-[10px] font-bold">{status}</Badge>;
    }
    if (s === 'conditionaloffer' || s === 'unconditionaloffer' || s === 'offerreceived') {
      return <Badge className="bg-[#E6F1FB] text-[#0C447C] border-[#B5D4F4] text-[10px] font-bold">{status}</Badge>;
    }
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
      <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(isAdmin() ? '/admin/universities' : '/agent/universities')}
          className="text-xs"
        >
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
      <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(isAdmin() ? '/admin/universities' : '/agent/universities')}
          className="text-xs"
        >
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

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6" data-testid="university-details-page">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(isAdmin() ? '/admin/universities' : '/agent/universities')}
          className="text-xs w-fit bg-white border-gray-200 hover:border-[#042C53]"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Universities
        </Button>

        {isAdmin() && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={isUpdatingStatus}
              className={`text-xs h-9 ${
                university.status === 'active'
                  ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                  : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <Power className="w-3.5 h-3.5 mr-1.5" />
              {university.status === 'active' ? 'Deactivate Institution' : 'Activate Institution'}
            </Button>
            <Button
              size="sm"
              onClick={() => setEditModalOpen(true)}
              className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs h-9 px-4 gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Details
            </Button>
          </div>
        )}
      </div>

      {/* Main Profile Header Card */}
      <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="h-2 bg-[#042C53]" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              {university.logoUrl ? (
                <img
                  src={university.logoUrl}
                  alt={university.name}
                  className="w-16 h-16 rounded-xl object-contain bg-gray-50 border border-gray-200 p-1 shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#E6F1FB] flex items-center justify-center text-[#0C447C] font-bold text-xl uppercase shrink-0">
                  {university.name.substring(0, 2)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-[#111827] font-['Outfit']">{university.name}</h1>
                  <Badge variant="outline" className="font-mono text-xs font-bold tracking-wider uppercase bg-gray-50 text-gray-700">
                    {university.code}
                  </Badge>
                  {university.status === 'active' ? (
                    <Badge className="bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Active Partner
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 flex-wrap">
                  <span className="flex items-center gap-1.5 font-medium text-gray-700">
                    <MapPin size={13} className="text-[#042C53]" />
                    {university.city ? `${university.city}, ` : ''}{university.country}
                  </span>
                  {university.website && (
                    <a
                      href={university.website.startsWith('http') ? university.website : `https://${university.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Globe size={13} /> {university.website.replace(/^https?:\/\//, '')}
                      <ExternalLink size={10} />
                    </a>
                  )}
                  <span className="text-gray-400">
                    Registered {new Date(university.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-[#F9FAFB] p-3.5 rounded-xl border border-gray-100 self-start md:self-auto">
              <div className="text-center px-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Applications</p>
                <p className="text-xl font-bold text-[#042C53] mt-0.5">{applications.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Details & Contact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Description & Overview */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-[#E5E7EB] bg-white shadow-none">
            <CardHeader className="border-b border-gray-100 px-6 py-4">
              <CardTitle className="text-sm font-bold text-gray-900 font-['Outfit'] flex items-center gap-2">
                <Building2 size={16} className="text-[#042C53]" /> Institution Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">About</h4>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                  {university.description || 'No detailed institution description has been provided yet.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Country</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block">{university.country}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">City</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block">{university.city || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Institution Code</span>
                  <span className="font-mono font-bold text-gray-900 mt-0.5 block">{university.code}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Info Card */}
        <div>
          <Card className="border-[#E5E7EB] bg-white shadow-none h-full">
            <CardHeader className="border-b border-gray-100 px-6 py-4">
              <CardTitle className="text-sm font-bold text-gray-900 font-['Outfit'] flex items-center gap-2">
                <User size={16} className="text-[#042C53]" /> Admissions Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Person</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {university.contactPerson || 'Admissions Office'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Email</p>
                {university.contactEmail ? (
                  <a
                    href={`mailto:${university.contactEmail}`}
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1.5 mt-1"
                  >
                    <Mail size={12} /> {university.contactEmail}
                  </a>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Not provided</p>
                )}
              </div>
              {university.website && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Official Portal</p>
                  <a
                    href={university.website.startsWith('http') ? university.website : `https://${university.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-600 hover:text-[#042C53] flex items-center gap-1.5 mt-1 truncate"
                  >
                    <Globe size={12} className="shrink-0" /> {university.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Associated Applications Table */}
      <Card className="border-[#E5E7EB] bg-white shadow-none">
        <CardHeader className="border-b border-gray-100 px-6 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-gray-900 font-['Outfit'] flex items-center gap-2">
              <GraduationCap size={18} className="text-[#042C53]" /> Associated Applications
            </CardTitle>
            <CardDescription className="text-xs text-gray-500 mt-0.5">
              {isAdmin()
                ? 'All student applications submitted to this university across agents'
                : 'Your student applications submitted to this university'}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-bold px-2.5 py-1 bg-gray-50 text-gray-700">
            {applications.length} Total
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">App Number</TableHead>
                <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Student</TableHead>
                <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Course</TableHead>
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
                    <p className="text-[11px] text-gray-400 mt-0.5">No students have applied to this university yet.</p>
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB]">
                    <TableCell className="px-6 py-3.5">
                      <button
                        onClick={() => navigate(isAdmin() ? `/admin/applications/${app.id}` : `/agent/applications/${app.id}`)}
                        className="font-mono text-xs font-bold text-[#042C53] hover:underline text-left"
                      >
                        {app.applicationNumber}
                      </button>
                    </TableCell>
                    <TableCell className="px-6 py-3.5">
                      <div className="font-semibold text-xs text-gray-900">
                        {app.student?.name || 'Unknown Student'}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {app.student?.email}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-3.5 text-xs text-gray-800 font-medium">
                      {app.courseName || 'N/A'}
                    </TableCell>
                    <TableCell className="px-6 py-3.5 text-xs text-gray-600">
                      {app.courseLevel || 'N/A'}
                    </TableCell>
                    <TableCell className="px-6 py-3.5 text-xs text-gray-600">
                      {app.intakeTerm ? `${app.intakeTerm} ` : ''}{app.intakeYear || app.intake || 'N/A'}
                    </TableCell>
                    <TableCell className="px-6 py-3.5 text-right">
                      {getApplicationStatusBadge(app.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* University Edit Modal */}
      {isAdmin() && (
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
