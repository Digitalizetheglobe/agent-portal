import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  Building2,
  Plus,
  Search,
  Globe,
  MapPin,
  Edit2,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  AlertCircle,
  CheckCircle2,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { hasStaffRole } from '../../utils/staffRoles';
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
import UniversityModal from '../../components/modals/UniversityModal';
import ImportModal from '../../components/modals/ImportModal';
import UniversityLogo from '../../components/university/UniversityLogo';
import { universityAPI, formatApiError } from '../../utils/api';
import { countries } from '../../lib/countries';
import { toast } from 'sonner';

const UniversitiesPage = () => {
  const navigate = useNavigate();
  const { deleteUniversity, updateUniversityStatus } = useData();
  const { user } = useAuth();
  // University information is maintained by the Head of Admission
  const canManage = hasStaffRole(user, 'head_admission');

  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  const [commissionFilter, setCommissionFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, countries: 0, missingCommission: 0 });
  // The API only sees the settled text; requestIdRef drops responses from superseded requests
  const [debouncedSearch, flushSearch] = useDebouncedValue(searchQuery);
  const [debouncedCity, flushCity] = useDebouncedValue(cityFilter);
  const requestIdRef = useRef(0);

  // Modals & Dialogs
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [universityToDelete, setUniversityToDelete] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [universityToToggle, setUniversityToToggle] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch universities from backend using backend query params
  const loadUniversities = useCallback(async (page = 1) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        envelope: 'true'
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (countryFilter && countryFilter !== 'all') params.country = countryFilter;
      if (debouncedCity.trim()) params.city = debouncedCity.trim();
      if (commissionFilter === 'missing') params.commission = 'missing';

      const response = await universityAPI.getAll(params);
      if (requestId !== requestIdRef.current) return;
      const data = response.data;

      if (data && typeof data === 'object' && Array.isArray(data.universities)) {
        setUniversities(data.universities);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.page || 1);
        if (data.stats) setStats(data.stats);
      } else if (Array.isArray(data)) {
        setUniversities(data);
        const countHeader = response.headers['x-total-count'];
        const totalPagesHeader = response.headers['x-total-pages'];
        setTotalCount(countHeader ? parseInt(countHeader, 10) : data.length);
        setTotalPages(totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1);
        setCurrentPage(page);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Failed to load universities:', err);
      toast.error('Failed to load universities', { description: formatApiError(err) });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, statusFilter, countryFilter, debouncedCity, commissionFilter, limit]);

  useEffect(() => {
    loadUniversities(1);
  }, [loadUniversities]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    flushSearch(searchQuery);
    flushCity(cityFilter);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    flushSearch('');
    setStatusFilter('all');
    setCountryFilter('all');
    setCityFilter('');
    flushCity('');
    setCommissionFilter('all');
  };

  // Status toggle handler
  const handleToggleStatusClick = (uni) => {
    setUniversityToToggle(uni);
    setStatusDialogOpen(true);
  };

  const handleConfirmStatusToggle = async () => {
    if (!universityToToggle) return;
    setIsUpdatingStatus(true);
    const newStatus = universityToToggle.status === 'active' ? 'inactive' : 'active';
    try {
      await updateUniversityStatus(universityToToggle.id, newStatus);
      setStatusDialogOpen(false);
      setUniversityToToggle(null);
      loadUniversities(currentPage);
    } catch (err) {
      toast.error('Failed to update status', { description: formatApiError(err) });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete handler
  const handleDeleteClick = (uni) => {
    setUniversityToDelete(uni);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!universityToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUniversity(universityToDelete.id);
      setDeleteDialogOpen(false);
      setUniversityToDelete(null);
      loadUniversities(currentPage);
    } catch (err) {
      console.error('Failed to delete university:', err);
      toast.error('Cannot delete university', {
        description: err.response?.data?.detail || err.message || 'Operation failed'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-6" data-testid="admin-universities-page">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] font-['Outfit'] tracking-tight">
            Universities
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Manage partner institutions, requirements, and affiliated student applications
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="text-xs font-bold h-10 px-4 rounded-lg gap-2 border-[#042C53]/30 text-[#042C53]"
            >
              <Upload className="w-4 h-4" /> Import from file
            </Button>
            <Button
              onClick={() => {
                setSelectedUniversity(null);
                setModalOpen(true);
              }}
              className="bg-[#042C53] hover:bg-[#0C447C] text-white text-xs font-bold h-10 px-5 rounded-lg shadow-sm gap-2"
            >
              <Plus className="w-4 h-4" /> Add University
            </Button>
          </div>
        )}
      </div>

      {/* Catalog at a glance */}
      <div className="stat-grid grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Universities</p>
            <p className="text-2xl font-semibold text-[#111827] mt-1">{stats.total}</p>
            <p className="text-[10px] font-medium text-blue-600 mt-1">in {stats.countries} {stats.countries === 1 ? 'country' : 'countries'}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Active</p>
            <p className="text-2xl font-semibold text-[#27500A] mt-1">{stats.active}</p>
            <p className="text-[10px] font-medium text-[#27500A] mt-1">accepting applications</p>
          </CardContent>
        </Card>
        <button
          type="button"
          onClick={() => setCommissionFilter((v) => (v === 'missing' ? 'all' : 'missing'))}
          className={`text-left rounded-xl border transition-colors ${
            commissionFilter === 'missing' ? 'border-[#633806] ring-1 ring-[#633806] bg-[#FAEEDA]/50' : 'border-[#E5E7EB] bg-white hover:border-[#FAC775]'
          }`}
          title="Show only universities with no commission rate"
        >
          <div className="p-4">
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">No commission rate</p>
            <p className={`text-2xl font-semibold mt-1 ${stats.missingCommission ? 'text-[#633806]' : 'text-[#27500A]'}`}>{stats.missingCommission}</p>
            <p className={`text-[10px] font-medium mt-1 ${stats.missingCommission ? 'text-[#633806]' : 'text-gray-500'}`}>
              {stats.missingCommission ? 'invoices are blocked until set' : 'all active universities have one'}
            </p>
          </div>
        </button>
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Inactive</p>
            <p className="text-2xl font-semibold text-[#6B7280] mt-1">{stats.inactive}</p>
            <p className="text-[10px] font-medium text-gray-500 mt-1">paused or archived</p>
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
                placeholder="Search by institution name, code, city..."
                className="pl-9 text-xs bg-[#F9FAFB] border-gray-200"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[130px] text-xs bg-[#F9FAFB] border-gray-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {/* Country Filter */}
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-full sm:w-[150px] text-xs bg-[#F9FAFB] border-gray-200">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* City Filter */}
              <Input
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="City"
                className="w-[120px] text-xs bg-[#F9FAFB] border-gray-200"
              />

              <Button type="submit" size="sm" className="bg-[#042C53] hover:bg-[#0C447C] text-xs h-9 px-4">
                Filter
              </Button>
              {(searchQuery || statusFilter !== 'all' || countryFilter !== 'all' || cityFilter || commissionFilter !== 'all') && (
                <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs h-9">
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* University Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider whitespace-nowrap">University</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Location</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider text-center">Programs</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider text-center">Applications</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Commission</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider text-center">Status</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#042C53] mx-auto"></div>
                  <p className="text-xs text-gray-500 mt-3 font-medium">Loading universities...</p>
                </TableCell>
              </TableRow>
            ) : universities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-gray-500">
                  <Building2 size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="font-semibold text-sm text-gray-700">No universities found</p>
                  <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search keywords, or import a list from a file</p>
                  {canManage && (
                    <Button
                      onClick={() => {
                        setSelectedUniversity(null);
                        setModalOpen(true);
                      }}
                      size="sm"
                      className="mt-4 bg-[#042C53] hover:bg-[#0C447C] text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add First University
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              universities.map((uni) => (
                <TableRow key={uni.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                  {/* Name, code and website */}
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UniversityLogo university={uni} size="sm" />
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate(`/admin/universities/${uni.id}`)}
                          className="text-sm font-bold text-[#111827] hover:text-[#042C53] hover:underline text-left truncate block max-w-xs"
                        >
                          {uni.name}
                        </button>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 whitespace-nowrap">
                          {uni.code && <span className="font-mono font-semibold uppercase text-gray-500">{uni.code}</span>}
                          {uni.website && (
                            <a
                              href={uni.website.startsWith('http') ? uni.website : `https://${uni.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-gray-600 flex items-center gap-1"
                            >
                              <Globe size={11} /> {uni.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Location */}
                  <TableCell className="px-6 py-4">
                    <div className="text-xs font-medium text-gray-800 flex items-center gap-1.5 whitespace-nowrap">
                      <MapPin size={12} className="text-gray-400 shrink-0" />
                      <span>{uni.city ? `${uni.city}, ` : ''}{uni.country}</span>
                    </div>
                  </TableCell>

                  {/* What the catalog holds for this university */}
                  <TableCell className="px-6 py-4 text-center whitespace-nowrap">
                    <span className="text-sm font-bold text-[#042C53] tabular-nums">{uni.programCount ?? 0}</span>
                    <span className="text-xs text-gray-500"> {uni.programCount === 1 ? 'program' : 'programs'}</span>
                    {(uni.brochures || []).length > 0 && (
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {(uni.brochures || []).length} {(uni.brochures || []).length === 1 ? 'brochure' : 'brochures'}
                      </div>
                    )}
                  </TableCell>

                  {/* Applications */}
                  <TableCell className="px-6 py-4 text-center text-sm font-bold text-gray-900 tabular-nums">
                    {uni.applicationCount ?? 0}
                  </TableCell>

                  {/* Commission: a missing rate blocks invoice approval, so it stands out */}
                  <TableCell className="px-6 py-4">
                    {uni.commissionRate != null ? (
                      <span className="text-sm font-bold text-gray-900 tabular-nums whitespace-nowrap">{uni.commissionRate}%</span>
                    ) : canManage ? (
                      <button
                        type="button"
                        onClick={() => { setSelectedUniversity(uni); setModalOpen(true); }}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-[#633806] bg-[#FAEEDA] hover:bg-[#FAC775]/60 px-2.5 py-1 rounded-md"
                      >
                        <AlertTriangle size={12} /> Set rate
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-[#633806]">
                        <AlertTriangle size={12} /> Not set
                      </span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="px-6 py-4 text-center">
                    {uni.status === 'active' ? (
                      <Badge className="bg-[#EAF3DE] text-[#27500A] border-[#C0DD97] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/universities/${uni.id}`)}
                        className="h-8 w-8 p-0 text-gray-600 hover:text-[#042C53] hover:bg-gray-100"
                        title="View details"
                      >
                        <Eye size={15} />
                      </Button>
                      {canManage && <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUniversity(uni);
                          setModalOpen(true);
                        }}
                        className="h-8 w-8 p-0 text-gray-600 hover:text-[#042C53] hover:bg-gray-100"
                        title="Edit university"
                      >
                        <Edit2 size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatusClick(uni)}
                        className={`h-8 w-8 p-0 ${
                          uni.status === 'active'
                            ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                            : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={uni.status === 'active' ? 'Deactivate university' : 'Activate university'}
                      >
                        <Power size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(uni)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete university"
                      >
                        <Trash2 size={15} />
                      </Button>
                      </>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div>
              Showing {universities.length} of {totalCount} universities · Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadUniversities(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="h-8 px-3 text-xs border-gray-200"
              >
                <ChevronLeft size={14} className="mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadUniversities(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="h-8 px-3 text-xs border-gray-200"
              >
                Next <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ImportModal open={importOpen} onOpenChange={setImportOpen} kind="universities" onImported={() => loadUniversities(1)} />

      {/* University Create / Edit Modal */}
      <UniversityModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        university={selectedUniversity}
        onSuccess={() => loadUniversities(currentPage)}
      />

      {/* Status Toggle Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Outfit'] text-xl">
              {universityToToggle?.status === 'active' ? 'Deactivate Institution' : 'Activate Institution'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to mark <strong>{universityToToggle?.name}</strong> as{' '}
              {universityToToggle?.status === 'active' ? 'inactive' : 'active'}?
              {universityToToggle?.status === 'active' && ' Agents will no longer be able to select this university for new applications.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isUpdatingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStatusToggle}
              disabled={isUpdatingStatus}
              className={`rounded-xl px-6 ${
                universityToToggle?.status === 'active'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isUpdatingStatus ? 'Updating...' : universityToToggle?.status === 'active' ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Outfit'] text-xl text-red-600">Delete University</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete <strong>{universityToDelete?.name}</strong>?
              This action cannot be undone.
              <br /><br />
              <span className="text-xs text-gray-500">
                Note: Deletion will be rejected if existing student applications are linked to this institution.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UniversitiesPage;
