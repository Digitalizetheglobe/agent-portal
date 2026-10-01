import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  GraduationCap,
  Building2,
  Clock,
  DollarSign,
  Edit2,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Globe
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
import CourseModal from '../../components/modals/CourseModal';
import { courseAPI, formatApiError } from '../../utils/api';
import { toast } from 'sonner';

const DEGREE_LEVELS = [
  'Undergraduate',
  'Postgraduate',
  'Diploma',
  'Doctorate / PhD',
  'Certificate',
  'Associate Degree'
];

const CoursesPage = () => {
  const { universities, deleteCourse, updateCourseStatus } = useData();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');

  // Modals & Dialogs
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [courseToToggle, setCourseToToggle] = useState(null);

  // Fetch courses with backend filters
  const loadCourses = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        level: levelFilter !== 'all' ? levelFilter : undefined,
        universityId: universityFilter !== 'all' ? universityFilter : undefined
      };

      const res = await courseAPI.getAll(params);
      const data = res.data;

      if (data && typeof data === 'object' && Array.isArray(data.courses)) {
        setCourses(data.courses);
        setTotalCount(data.total || data.courses.length);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(data.page || page);
      } else if (Array.isArray(data)) {
        setCourses(data);
        setTotalCount(data.length);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
      toast.error('Failed to load courses', { description: formatApiError(err) });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, levelFilter, universityFilter, limit]);

  useEffect(() => {
    loadCourses(1);
  }, [statusFilter, levelFilter, universityFilter, loadCourses]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCourses(1);
  };

  const handleOpenAdd = () => {
    setSelectedCourse(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (course) => {
    setSelectedCourse(course);
    setModalOpen(true);
  };

  const handleOpenDelete = (course) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;
    try {
      await deleteCourse(courseToDelete.id || courseToDelete._id);
      loadCourses(currentPage);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    }
  };

  const handleOpenToggleStatus = (course) => {
    setCourseToToggle(course);
    setStatusDialogOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!courseToToggle) return;
    const newStatus = courseToToggle.status === 'active' ? 'inactive' : 'active';
    try {
      await updateCourseStatus(courseToToggle.id || courseToToggle._id, newStatus);
      loadCourses(currentPage);
    } catch (err) {
      console.error('Toggle status failed:', err);
    } finally {
      setStatusDialogOpen(false);
      setCourseToToggle(null);
    }
  };

  // Stats
  const activeCount = useMemo(() => courses.filter(c => c.status === 'active').length, [courses]);
  const uniqueLevels = useMemo(() => new Set(courses.map(c => c.level).filter(Boolean)).size, [courses]);

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-6" data-testid="admin-courses-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#111827] font-['Outfit']">Target Courses</h1>
            <Badge className="bg-[#042C53]/10 text-[#042C53] border-none font-semibold">
              {totalCount} Total
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage degree courses and study programs available for student registrations
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-[#042C53] hover:bg-[#042C53]/90 text-white font-semibold text-xs px-4 h-10 shadow-sm"
          data-testid="add-course-btn"
        >
          <Plus className="w-4 h-4 mr-2" /> Add New Course
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Programs</p>
              <p className="text-2xl font-bold text-[#111827] mt-1 font-['Outfit']">{totalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#042C53] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Courses</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 font-['Outfit']">{activeCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Degree Levels</p>
              <p className="text-2xl font-bold text-violet-600 mt-1 font-['Outfit']">{uniqueLevels}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Universities</p>
              <p className="text-2xl font-bold text-amber-600 mt-1 font-['Outfit']">
                {universities?.length || 0}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search course by name, code, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-xs bg-[#F9FAFB] border-gray-200"
                />
              </div>
              <Button type="submit" variant="secondary" className="h-10 text-xs px-4">
                Search
              </Button>
            </form>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Level Filter */}
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[150px] h-10 text-xs bg-white border-gray-200">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {DEGREE_LEVELS.map(lvl => (
                    <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* University Filter */}
              <Select value={universityFilter} onValueChange={setUniversityFilter}>
                <SelectTrigger className="w-[170px] h-10 text-xs bg-white border-gray-200">
                  <SelectValue placeholder="All Universities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Universities</SelectItem>
                  <SelectItem value="general">Open to All Universities</SelectItem>
                  {universities?.map(u => (
                    <SelectItem key={u.id || u._id} value={String(u.id || u._id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-10 text-xs bg-white border-gray-200">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || statusFilter !== 'all' || levelFilter !== 'all' || universityFilter !== 'all') && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setLevelFilter('all');
                    setUniversityFilter('all');
                  }}
                  className="h-10 text-xs text-gray-500 hover:text-gray-900"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses Table */}
      <Card className="border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/70 border-b border-gray-100">
              <TableRow>
                <TableHead className="text-xs font-bold text-gray-700 uppercase tracking-wider py-3.5">Course Name</TableHead>
                <TableHead className="text-xs font-bold text-gray-700 uppercase tracking-wider py-3.5">Level & Discipline</TableHead>
                <TableHead className="text-xs font-bold text-gray-700 uppercase tracking-wider py-3.5">University</TableHead>
                <TableHead className="text-xs font-bold text-gray-700 uppercase tracking-wider py-3.5">Duration & Fees</TableHead>
                <TableHead className="text-xs font-bold text-gray-700 uppercase tracking-wider py-3.5">Status</TableHead>
                <TableHead className="text-xs font-bold text-gray-700 uppercase tracking-wider py-3.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-xs">
                    Loading courses...
                  </TableCell>
                </TableRow>
              ) : courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-gray-400">
                    <BookOpen className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-sm text-gray-600">No courses found</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Add New Course" to add courses to your portal catalog</p>
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow key={course.id || course._id} className="hover:bg-gray-50/80 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[#111827]">{course.name}</span>
                        {course.code && (
                          <span className="text-[11px] font-mono font-medium text-gray-500 mt-0.5">
                            {course.code}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline" className="text-[11px] font-medium border-gray-200 text-gray-700">
                          {course.level || 'Undergraduate'}
                        </Badge>
                        {course.department && (
                          <span className="text-[11px] text-gray-500">{course.department}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      {(() => {
                        const uniIds = (course.universityIds && course.universityIds.length > 0)
                          ? course.universityIds
                          : (course.universityId ? [course.universityId] : []);

                        if (uniIds.length === 0) {
                          return (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#042C53] bg-blue-50 px-2 py-0.5 rounded-md">
                              <Globe className="w-3 h-3 text-[#042C53]" /> All Partner Universities
                            </span>
                          );
                        }

                        const matchedUnis = uniIds
                          .map(id => universities?.find(u => String(u.id || u._id) === String(id)))
                          .filter(Boolean);

                        if (matchedUnis.length === 1) {
                          return (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-[#042C53] shrink-0" />
                              <span className="text-xs font-medium text-gray-900 truncate max-w-[200px]" title={matchedUnis[0].name}>
                                {matchedUnis[0].name}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div className="flex flex-col gap-0.5 items-start">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-[#042C53] shrink-0" />
                              <span className="text-xs font-semibold text-gray-900 truncate max-w-[150px]">
                                {matchedUnis[0]?.name || (course.university ? course.university.name : 'University')}
                              </span>
                              <Badge variant="secondary" className="text-[10px] bg-blue-50 text-[#042C53] font-bold px-1.5 py-0 border border-blue-100">
                                +{matchedUnis.length - 1} more
                              </Badge>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              Offered in {matchedUnis.length} universities
                            </span>
                          </div>
                        );
                      })()}
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-col text-xs text-gray-600">
                        {course.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" /> {course.duration}
                          </span>
                        )}
                        {course.tuitionFee && (
                          <span className="text-emerald-700 font-medium mt-0.5">
                            {course.tuitionFee}
                          </span>
                        )}
                        {!course.duration && !course.tuitionFee && (
                          <span className="text-gray-400 text-[11px]">N/A</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <Badge
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-none ${
                          course.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {course.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenToggleStatus(course)}
                          title={course.status === 'active' ? 'Deactivate' : 'Activate'}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900"
                        >
                          <Power className={`w-3.5 h-3.5 ${course.status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(course)}
                          title="Edit Course"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDelete(course)}
                          title="Delete Course"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing page {currentPage} of {totalPages} ({totalCount} courses)
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => loadCourses(currentPage - 1)}
                className="h-8 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => loadCourses(currentPage + 1)}
                className="h-8 text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Course Modal */}
      <CourseModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        course={selectedCourse}
        onSuccess={() => loadCourses(currentPage)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-900">
              Delete Course
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{courseToDelete?.name}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-9"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Status Confirmation Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-900">
              {courseToToggle?.status === 'active' ? 'Deactivate Course' : 'Activate Course'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              {courseToToggle?.status === 'active'
                ? `Deactivating "${courseToToggle?.name}" will hide it from the course selection dropdown for students and agents.`
                : `Activating "${courseToToggle?.name}" will make it selectable in the student registration forms.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleStatus}
              className="bg-[#042C53] hover:bg-[#042C53]/90 text-white text-xs h-9"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CoursesPage;
