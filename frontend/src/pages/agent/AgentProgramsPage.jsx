import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  Search,
  GraduationCap,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  BookOpen
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import UniversityLogo from '../../components/university/UniversityLogo';
import { courseAPI, universityAPI, formatApiError } from '../../utils/api';
import { readFee, earningsFor } from '../../utils/programFee';
import { toast } from 'sonner';

const LEVELS = ['Undergraduate', 'Postgraduate', 'Diploma', 'Doctorate', 'Certificate'];
const loadAllUniversities = async () => {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data } = await universityAPI.getAll({ page, limit: 100, status: 'active', envelope: 'true' });
    all.push(...(data.universities || []));
    totalPages = data.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return all;
};

const AgentProgramsPage = () => {
  const navigate = useNavigate();

  const [programs, setPrograms] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [debouncedSearch, flushSearch] = useDebouncedValue(searchQuery);
  const requestIdRef = useRef(0);

  useEffect(() => {
    loadAllUniversities()
      .then(setUniversities)
      .catch((error) => toast.error('Failed to load universities', { description: formatApiError(error) }));
  }, []);

  const loadPrograms = useCallback(async (page = 1) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params = { page, limit };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (levelFilter !== 'all') params.level = levelFilter;
      if (universityFilter !== 'all') params.universityId = universityFilter;

      const { data } = await courseAPI.getAll(params);
      if (requestId !== requestIdRef.current) return;
      setPrograms(data.courses || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || page);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      toast.error('Failed to load programs', { description: formatApiError(error) });
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, levelFilter, universityFilter, limit]);

  useEffect(() => {
    loadPrograms(1);
  }, [loadPrograms]);

  const handleReset = () => {
    setSearchQuery('');
    flushSearch('');
    setLevelFilter('all');
    setUniversityFilter('all');
  };

  const apply = (program) => {
    const university = program.university;
    navigate(university
      ? `/agent/applications?university=${university.id}&course=${program.id}`
      : `/agent/applications?course=${program.id}`);
  };

  const hasFilters = searchQuery || levelFilter !== 'all' || universityFilter !== 'all';

  return (
    <div className="p-4 sm:p-6 bg-[#F9FAFB] min-h-screen space-y-6" data-testid="agent-programs-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] font-['Outfit'] tracking-tight">Programs</h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Find the right program for your student, see the price and what you earn, then apply.
          </p>
        </div>
        <div className="text-xs text-gray-600 bg-white border border-gray-200 px-3.5 py-2 rounded-lg font-medium w-fit">
          <span className="font-bold text-[#042C53]">{totalCount}</span> {totalCount === 1 ? 'program' : 'programs'}
        </div>
      </div>

      {/* Filters */}
      <Card className="border-[#E5E7EB] bg-white shadow-none">
        <CardContent className="p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); flushSearch(searchQuery); }}
            className="flex flex-col lg:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by program name, code or faculty..."
                className="pl-9 text-xs bg-[#F9FAFB] border-gray-200"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-full sm:w-[160px] text-xs bg-[#F9FAFB] border-gray-200">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  {LEVELS.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={universityFilter} onValueChange={setUniversityFilter}>
                <SelectTrigger className="w-full sm:w-[220px] text-xs bg-[#F9FAFB] border-gray-200">
                  <SelectValue placeholder="University" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">All universities</SelectItem>
                  {universities.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="submit" size="sm" className="bg-[#042C53] hover:bg-[#0C447C] text-xs h-9 px-4">Search</Button>
              {hasFilters && (
                <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="text-xs h-9">Reset</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Programs */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#042C53] mx-auto"></div>
          <p className="text-xs text-gray-500 mt-3 font-medium">Loading programs...</p>
        </div>
      ) : programs.length === 0 ? (
        <Card className="border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="text-center py-16 text-gray-500">
            <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-sm text-gray-700">No programs found</p>
            <p className="text-xs text-gray-400 mt-1">
              {hasFilters ? 'Try a different search or clear the filters.' : 'No programs are available to you yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {programs.map((program) => {
            const fee = readFee(program.tuitionFee);
            const earn = earningsFor(fee, program.university?.commissionRate);
            const extra = (program.universityIds || []).length - 1;
            return (
              <div
                key={program.id}
                className="bg-white rounded-3xl border border-[#E5E7EB] hover:border-[#042C53]/40 hover:shadow-md transition-all p-6 flex flex-col md:flex-row md:items-center gap-5"
              >
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Chips */}
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
                  </div>

                  <h2 className="text-xl font-bold text-[#111827] font-['Outfit'] leading-snug">
                    <button type="button" onClick={() => navigate(`/agent/programs/${program.id}`)} className="text-left hover:text-[#042C53] hover:underline">
                      {program.name}
                    </button>
                  </h2>

                  {/* University */}
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 flex-wrap">
                    {program.university ? (
                      <>
                        <UniversityLogo university={program.university} size="sm" />
                        <button
                          type="button"
                          onClick={() => navigate(`/agent/universities/${program.university.id}`)}
                          className="font-medium hover:text-[#042C53] hover:underline"
                        >
                          {program.university.name}
                        </button>
                        {program.university.country && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span>{program.university.country}</span>
                          </>
                        )}
                        {extra > 0 && <Badge variant="outline" className="text-[10px] font-semibold">+{extra} more {extra === 1 ? 'university' : 'universities'}</Badge>}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-2 font-medium"><Building2 size={16} className="text-gray-400" /> Offered by all universities</span>
                    )}
                  </div>

                  {program.department && <p className="text-xs text-gray-400">{program.department}</p>}
                </div>

                {/* Price and action */}
                <div className="flex items-center gap-5 md:pl-6 md:border-l border-gray-200 shrink-0">
                  <div>
                    <p className="text-xs text-gray-500">Tuition</p>
                    <p className="text-2xl font-bold text-[#111827] font-['Outfit'] mt-0.5 whitespace-nowrap">{fee ? fee.text : 'On request'}</p>
                    {earn && <p className="text-xs font-semibold text-[#27500A] mt-1 whitespace-nowrap">You earn {earn}</p>}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/agent/programs/${program.id}`)}
                    className="h-12 rounded-xl px-4 text-sm font-semibold border-gray-200 hover:border-[#042C53] hover:text-white whitespace-nowrap"
                  >
                    Details
                  </Button>
                  <Button
                    onClick={() => apply(program)}
                    className="h-12 rounded-xl px-5 bg-[#042C53] hover:bg-[#0C447C] text-white text-sm font-semibold gap-2 whitespace-nowrap"
                  >
                    Apply now <ArrowUpRight size={16} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="px-1 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>Showing {programs.length} of {totalCount} programs · Page {currentPage} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadPrograms(currentPage - 1)} disabled={currentPage <= 1 || loading} className="h-8 px-3 text-xs border-gray-200 bg-white">
              <ChevronLeft size={14} className="mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => loadPrograms(currentPage + 1)} disabled={currentPage >= totalPages || loading} className="h-8 px-3 text-xs border-gray-200 bg-white">
              Next <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentProgramsPage;
