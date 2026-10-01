import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Globe,
  MapPin,
  Mail,
  User,
  ExternalLink,
  Edit2,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
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
import { universityAPI, formatApiError } from '../../utils/api';
import { countries } from '../../lib/countries';
import { toast } from 'sonner';

const UniversitiesPage = () => {
  const navigate = useNavigate();
  const { deleteUniversity, updateUniversityStatus } = useData();

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

  // Modals & Dialogs
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [universityToDelete, setUniversityToDelete] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [universityToToggle, setUniversityToToggle] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch universities from backend using backend query params
  const loadUniversities = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        envelope: 'true'
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (countryFilter && countryFilter !== 'all') params.country = countryFilter;
      if (cityFilter.trim()) params.city = cityFilter.trim();

      const response = await universityAPI.getAll(params);
      const data = response.data;

      if (data && typeof data === 'object' && Array.isArray(data.universities)) {
        setUniversities(data.universities);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.page || 1);
      } else if (Array.isArray(data)) {
        setUniversities(data);
        const countHeader = response.headers['x-total-count'];
        const totalPagesHeader = response.headers['x-total-pages'];
        setTotalCount(countHeader ? parseInt(countHeader, 10) : data.length);
        setTotalPages(totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error('Failed to load universities:', err);
      toast.error('Failed to load universities', { description: formatApiError(err) });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, countryFilter, cityFilter, limit]);

  useEffect(() => {
    loadUniversities(1);
  }, [statusFilter, countryFilter, loadUniversities]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUniversities(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCountryFilter('all');
    setCityFilter('');
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

  // Stats calculation
  const stats = useMemo(() => {
    const active = universities.filter(u => u.status === 'active').length;
    const inactive = universities.filter(u => u.status === 'inactive').length;
    const distinctCountries = new Set(universities.map(u => u.country)).size;
    return { active, inactive, distinctCountries };
  }, [universities]);

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6" data-testid="admin-universities-page">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Total Institutions</p>
            <p className="text-2xl font-semibold text-[#111827] mt-1">{totalCount}</p>
            <p className="text-[10px] font-medium text-blue-600 mt-1">Global partner network</p>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Active Universities</p>
            <p className="text-2xl font-semibold text-[#27500A] mt-1">{stats.active}</p>
            <p className="text-[10px] font-medium text-[#27500A] mt-1">Accepting applications</p>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Inactive</p>
            <p className="text-2xl font-semibold text-[#6B7280] mt-1">{stats.inactive}</p>
            <p className="text-[10px] font-medium text-gray-500 mt-1">Archived or paused</p>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">Partner Countries</p>
            <p className="text-2xl font-semibold text-[#042C53] mt-1">{stats.distinctCountries}</p>
            <p className="text-[10px] font-medium text-purple-600 mt-1">Destinations available</p>
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
                <SelectTrigger className="w-[130px] text-xs bg-[#F9FAFB] border-gray-200">
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
                <SelectTrigger className="w-[150px] text-xs bg-[#F9FAFB] border-gray-200">
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
              {(searchQuery || statusFilter !== 'all' || countryFilter !== 'all' || cityFilter) && (
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
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Institution</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Code</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Location</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Contact</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider text-center">Status</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#042C53] mx-auto"></div>
                  <p className="text-xs text-gray-500 mt-3 font-medium">Loading universities...</p>
                </TableCell>
              </TableRow>
            ) : universities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-gray-500">
                  <Building2 size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="font-semibold text-sm text-gray-700">No universities found</p>
                  <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search keywords</p>
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
                </TableCell>
              </TableRow>
            ) : (
              universities.map((uni) => (
                <TableRow key={uni.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                  {/* Name & Logo */}
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {uni.logoUrl ? (
                        <img
                          src={uni.logoUrl}
                          alt={uni.name}
                          className="w-9 h-9 rounded-lg object-contain bg-gray-50 border border-gray-200"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-[#E6F1FB] flex items-center justify-center text-[#0C447C] font-bold text-xs uppercase">
                          {uni.name.substring(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate(`/admin/universities/${uni.id}`)}
                          className="text-sm font-bold text-[#111827] hover:text-[#042C53] hover:underline text-left truncate block max-w-xs"
                        >
                          {uni.name}
                        </button>
                        {uni.website && (
                          <a
                            href={uni.website.startsWith('http') ? uni.website : `https://${uni.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-0.5"
                          >
                            <Globe size={11} /> {uni.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Code */}
                  <TableCell className="px-6 py-4">
                    <Badge variant="outline" className="font-mono text-[10px] font-bold tracking-wider uppercase bg-gray-50 text-gray-700 border-gray-200">
                      {uni.code || 'N/A'}
                    </Badge>
                  </TableCell>

                  {/* Location */}
                  <TableCell className="px-6 py-4">
                    <div className="text-xs font-medium text-gray-800">
                      {uni.city ? `${uni.city}, ` : ''}{uni.country}
                    </div>
                  </TableCell>

                  {/* Contact */}
                  <TableCell className="px-6 py-4">
                    {uni.contactEmail || uni.contactPerson ? (
                      <div className="space-y-0.5">
                        {uni.contactPerson && (
                          <div className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                            <User size={12} className="text-gray-400" /> {uni.contactPerson}
                          </div>
                        )}
                        {uni.contactEmail && (
                          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                            <Mail size={12} className="text-gray-400" /> {uni.contactEmail}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Not specified</span>
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
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

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
