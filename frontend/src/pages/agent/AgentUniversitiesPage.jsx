import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  Building2,
  Search,
  Globe,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  GraduationCap,
  FileText,
  Award,
  Megaphone,
  Percent,
  LayoutGrid,
  List
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import UniversityLogo from '../../components/university/UniversityLogo';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
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

const VIEW_KEY = 'agentUniversitiesView';

const readStoredView = () => {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
};

const AgentUniversitiesPage = () => {
  const navigate = useNavigate();
  const [view, setView] = useState(readStoredView);

  const changeView = (next) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // the choice just is not remembered
    }
  };

  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(12);
  const [stats, setStats] = useState({ active: 0, countries: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  // The API only sees the settled text; requestIdRef drops responses from superseded requests
  const [debouncedSearch, flushSearch] = useDebouncedValue(searchQuery);
  const [debouncedCity, flushCity] = useDebouncedValue(cityFilter);
  const requestIdRef = useRef(0);

  // Load universities with backend queries
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
      // An inactive university cannot take new applications, so agents only browse the active ones
      params.status = 'active';
      if (countryFilter && countryFilter !== 'all') params.country = countryFilter;
      if (debouncedCity.trim()) params.city = debouncedCity.trim();

      const response = await universityAPI.getAll(params);
      if (requestId !== requestIdRef.current) return;
      const data = response.data;

      if (data && typeof data === 'object' && Array.isArray(data.universities)) {
        setUniversities(data.universities);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.page || 1);
        if (data.stats) setStats({ active: data.stats.active, countries: data.stats.countries });
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
      console.error('Failed to load universities for agent:', err);
      toast.error('Failed to load partner universities', { description: formatApiError(err) });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, countryFilter, debouncedCity, limit]);

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
    setCountryFilter('all');
    setCityFilter('');
    flushCity('');
  };

  const hasFilters = searchQuery || countryFilter !== 'all' || cityFilter;

  return (
    <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-6" data-testid="agent-universities-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] font-['Outfit'] tracking-tight">
            Partner Universities
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Pick where to send your student. See the programs, what you earn and the brochures, then apply.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="bg-white border border-gray-200 px-3 py-2 rounded-lg font-medium">
            <span className="font-bold text-[#042C53]">{stats.active}</span> universities
          </span>
          <span className="bg-white border border-gray-200 px-3 py-2 rounded-lg font-medium">
            <span className="font-bold text-[#042C53]">{stats.countries}</span> countries
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <Card className="border-[#E5E7EB] bg-white shadow-none">
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by university name, code or city..."
                className="pl-9 text-xs bg-[#F9FAFB] border-gray-200"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-full sm:w-[170px] text-xs bg-[#F9FAFB] border-gray-200">
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
              <Input
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="City"
                className="w-[120px] text-xs bg-[#F9FAFB] border-gray-200"
              />
              <Button type="submit" size="sm" className="bg-[#042C53] hover:bg-[#0C447C] text-xs h-9 px-4">
                Search
              </Button>
              {hasFilters && (
                <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs h-9">
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Grid or list */}
      {!loading && universities.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">{totalCount} {totalCount === 1 ? 'university' : 'universities'}</p>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5" role="group" aria-label="Change layout">
            {[
              { key: 'grid', label: 'Grid', Icon: LayoutGrid },
              { key: 'list', label: 'List', Icon: List },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => changeView(key)}
                aria-pressed={view === key}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-semibold transition-colors',
                  view === key ? 'bg-[#042C53] text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* University cards or rows */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#042C53] mx-auto"></div>
          <p className="text-xs text-gray-500 mt-3 font-medium">Loading universities...</p>
        </div>
      ) : universities.length === 0 ? (
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="text-center py-16 text-gray-500">
            <Building2 size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-sm text-gray-700">No universities found</p>
            <p className="text-xs text-gray-400 mt-1">
              {hasFilters ? 'Try a different search or clear the filters.' : 'No universities are available to you yet. Contact your Account Manager.'}
            </p>
          </CardContent>
        </Card>
      ) : view === 'list' ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <TableHead className="text-[10px] text-[#6B7280] font-bold px-5 py-3 uppercase tracking-wider whitespace-nowrap">University</TableHead>
                <TableHead className="text-[10px] text-[#6B7280] font-bold px-5 py-3 uppercase tracking-wider whitespace-nowrap">Location</TableHead>
                <TableHead className="text-[10px] text-[#6B7280] font-bold px-5 py-3 uppercase tracking-wider text-center whitespace-nowrap">Programs</TableHead>
                <TableHead className="text-[10px] text-[#6B7280] font-bold px-5 py-3 uppercase tracking-wider text-center whitespace-nowrap">You earn</TableHead>
                <TableHead className="text-[10px] text-[#6B7280] font-bold px-5 py-3 uppercase tracking-wider text-center whitespace-nowrap">Brochures</TableHead>
                <TableHead className="text-[10px] text-[#6B7280] font-bold px-5 py-3 uppercase tracking-wider whitespace-nowrap">Good to know</TableHead>
                <TableHead className="text-[10px] text-[#6B7280] font-bold px-5 py-3 uppercase tracking-wider text-right whitespace-nowrap">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {universities.map((uni) => (
                <TableRow key={uni.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                  <TableCell className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <UniversityLogo university={uni} size="sm" />
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate(`/agent/universities/${uni.id}`)}
                          className="text-sm font-bold text-[#111827] hover:text-[#042C53] hover:underline text-left block max-w-[280px] truncate"
                        >
                          {uni.name}
                        </button>
                        {uni.code && <span className="font-mono text-[10px] font-semibold uppercase text-gray-400">{uni.code}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-gray-400 shrink-0" />
                      {uni.city ? `${uni.city}, ` : ''}{uni.country}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-center text-sm font-bold text-[#042C53] tabular-nums">{uni.programCount ?? 0}</TableCell>
                  <TableCell className="px-5 py-3 text-center text-sm font-bold tabular-nums whitespace-nowrap">
                    {uni.commissionRate != null ? <span className="text-[#27500A]">{uni.commissionRate}%</span> : <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-center text-sm font-semibold text-gray-700 tabular-nums">{(uni.brochures || []).length}</TableCell>
                  <TableCell className="px-5 py-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      {uni.scholarshipCount > 0 && (
                        <Badge className="bg-[#EAF3DE] text-[#27500A] border-none text-[10px] font-semibold gap-1">
                          <Award size={11} /> {uni.scholarshipCount} {uni.scholarshipCount === 1 ? 'scholarship' : 'scholarships'}
                        </Badge>
                      )}
                      {uni.updateCount - uni.scholarshipCount > 0 && (
                        <Badge className="bg-[#E6F1FB] text-[#0C447C] border-none text-[10px] font-semibold gap-1">
                          <Megaphone size={11} /> {uni.updateCount - uni.scholarshipCount} news
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/agent/universities/${uni.id}`)}
                        className="text-xs h-8 border-gray-200 hover:border-[#042C53] hover:text-[#042C53]"
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/agent/applications?university=${uni.id}`)}
                        className="text-xs h-8 bg-[#042C53] hover:bg-[#0C447C] text-white"
                      >
                        Apply <ArrowRight size={12} className="ml-1" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {universities.map((uni) => (
            <Card key={uni.id} className="border-[#E5E7EB] bg-white shadow-none hover:shadow-md hover:border-[#042C53]/30 transition-all flex flex-col">
              <CardContent className="p-5 flex flex-col gap-4 flex-1">
                {/* Who and where */}
                <div className="flex items-start gap-3">
                  <UniversityLogo university={uni} size="md" />
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => navigate(`/agent/universities/${uni.id}`)}
                      className="text-sm font-bold text-[#111827] hover:text-[#042C53] hover:underline text-left leading-snug"
                    >
                      {uni.name}
                    </button>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin size={12} className="shrink-0" />
                      {uni.city ? `${uni.city}, ` : ''}{uni.country}
                    </p>
                  </div>
                  {uni.code && (
                    <Badge variant="outline" className="font-mono text-[10px] font-bold uppercase bg-gray-50 text-gray-600 border-gray-200 shrink-0">
                      {uni.code}
                    </Badge>
                  )}
                </div>

                {/* What the agent needs to decide */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-[#F9FAFB] border border-gray-100 py-2.5">
                    <p className="text-lg font-bold text-[#042C53] leading-none">{uni.programCount ?? 0}</p>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                      <GraduationCap size={11} /> Programs
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#EAF3DE]/60 border border-[#C0DD97]/60 py-2.5">
                    <p className="text-lg font-bold text-[#27500A] leading-none">
                      {uni.commissionRate != null ? `${uni.commissionRate}%` : '—'}
                    </p>
                    <p className="text-[10px] font-semibold text-[#27500A]/80 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                      <Percent size={11} /> You earn
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F9FAFB] border border-gray-100 py-2.5">
                    <p className="text-lg font-bold text-[#042C53] leading-none">{(uni.brochures || []).length}</p>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
                      <FileText size={11} /> Brochures
                    </p>
                  </div>
                </div>

                {/* Good to know */}
                <div className="flex flex-wrap items-center gap-1.5 min-h-[22px]">
                  {uni.scholarshipCount > 0 && (
                    <Badge className="bg-[#EAF3DE] text-[#27500A] border-none text-[10px] font-semibold gap-1">
                      <Award size={11} /> {uni.scholarshipCount} {uni.scholarshipCount === 1 ? 'scholarship' : 'scholarships'}
                    </Badge>
                  )}
                  {uni.updateCount - uni.scholarshipCount > 0 && (
                    <Badge className="bg-[#E6F1FB] text-[#0C447C] border-none text-[10px] font-semibold gap-1">
                      <Megaphone size={11} /> {uni.updateCount - uni.scholarshipCount} news
                    </Badge>
                  )}
                  {uni.website && (
                    <a
                      href={uni.website.startsWith('http') ? uni.website : `https://${uni.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-gray-400 hover:text-[#042C53] flex items-center gap-1 ml-auto"
                    >
                      <Globe size={11} /> {uni.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/agent/universities/${uni.id}`)}
                    className="flex-1 text-xs h-9 border-gray-200 hover:border-[#042C53] hover:text-[#042C53]"
                  >
                    View programs
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/agent/applications?university=${uni.id}`)}
                    className="flex-1 text-xs h-9 bg-[#042C53] hover:bg-[#0C447C] text-white"
                  >
                    Apply a student <ArrowRight size={12} className="ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {totalCount > 0 && (
        <div className="px-1 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Showing {universities.length} of {totalCount} universities · Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUniversities(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="h-8 px-3 text-xs border-gray-200 bg-white"
            >
              <ChevronLeft size={14} className="mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUniversities(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="h-8 px-3 text-xs border-gray-200 bg-white"
            >
              Next <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentUniversitiesPage;
