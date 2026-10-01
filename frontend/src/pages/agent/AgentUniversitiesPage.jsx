import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Globe,
  MapPin,
  Mail,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
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
import { universityAPI, formatApiError } from '../../utils/api';
import { countries } from '../../lib/countries';
import { toast } from 'sonner';

const AgentUniversitiesPage = () => {
  const navigate = useNavigate();

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

  // Load universities with backend queries
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
      console.error('Failed to load universities for agent:', err);
      toast.error('Failed to load partner universities', { description: formatApiError(err) });
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

  const distinctCountries = useMemo(() => {
    return new Set(universities.map(u => u.country)).size;
  }, [universities]);

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6" data-testid="agent-universities-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] font-['Outfit'] tracking-tight">
            Partner Universities
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Explore approved destination universities and check program eligibility for student applicants
          </p>
        </div>
        <div className="text-xs text-gray-600 bg-white border border-gray-200 px-3.5 py-2 rounded-lg font-medium shadow-2xs">
          Partner Destinations: <span className="font-bold text-[#042C53]">{distinctCountries} countries</span>
        </div>
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
                placeholder="Search university name, code, or city..."
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
                  <SelectItem value="active">Active Only</SelectItem>
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
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Country & City</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider">Contact</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider text-center">Status</TableHead>
              <TableHead className="text-[10px] text-[#6B7280] font-bold px-6 py-3 uppercase tracking-wider text-right">Action</TableHead>
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
                  <p className="font-semibold text-sm text-gray-700">No partner universities found</p>
                  <p className="text-xs text-gray-400 mt-1">Try modifying your search or filter options</p>
                </TableCell>
              </TableRow>
            ) : (
              universities.map((uni) => (
                <TableRow key={uni.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                  {/* Institution Name & Logo */}
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
                          onClick={() => navigate(`/agent/universities/${uni.id}`)}
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
                    <div className="text-xs font-medium text-gray-800 flex items-center gap-1.5">
                      <MapPin size={12} className="text-gray-400 shrink-0" />
                      <span>{uni.city ? `${uni.city}, ` : ''}{uni.country}</span>
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
                      <span className="text-xs text-gray-400">Contact office</span>
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

                  {/* Read-Only Action */}
                  <TableCell className="px-6 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/agent/universities/${uni.id}`)}
                      className="text-xs h-8 border-gray-200 hover:border-[#042C53] hover:text-[#042C53]"
                    >
                      View Details <ArrowRight size={12} className="ml-1" />
                    </Button>
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
    </div>
  );
};

export default AgentUniversitiesPage;
