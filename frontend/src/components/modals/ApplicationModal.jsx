import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { FileCheck, Search, Building2, User, BookOpen, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { formatApiError, universityAPI } from '../../utils/api';

const COURSE_LEVELS = [
  'Undergraduate',
  'Postgraduate',
  'Diploma',
  'Doctorate',
  'Certificate'
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
  { code: 'MYR', symbol: 'RM', label: 'MYR (RM)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'SGD', symbol: 'S$', label: 'SGD (S$)' },
  { code: 'NZD', symbol: 'NZ$', label: 'NZD (NZ$)' },
  { code: 'AED', symbol: 'AED', label: 'AED (AED)' }
];

const INTAKE_SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const NO_INTAKE = 'none';

const buildIntakeOptions = (current) => {
  const year = new Date().getFullYear();
  const options = [];
  for (let y = year; y <= year + 2; y++) {
    INTAKE_SEASONS.forEach(season => options.push(`${season} ${y}`));
  }
  if (current && !options.includes(current)) options.unshift(current);
  return options;
};

const initialFormState = {
  studentId: '',
  agentId: '',
  universityId: '',
  courseId: '',
  courseName: '',
  courseLevel: 'Undergraduate',
  intakeTerm: '',
  tuitionFee: '',
  currency: 'USD',
  remarks: ''
};

// Mirrors backend parseCourseTuitionFee: a single unambiguous amount, else null.
const parseCourseFee = (fee) => {
  if (!fee || typeof fee !== 'string') return null;
  const matches = fee.match(/\d+(?:,\d{3})*(?:\.\d{1,2})?/g);
  if (!matches || matches.length !== 1) return null;
  const value = parseFloat(matches[0].replace(/,/g, ''));
  return value > 0 && isFinite(value) ? value : null;
};

const ApplicationModal = ({ open, onOpenChange, application = null, onSuccess, defaultUniversityId = '', defaultCourseId = '' }) => {
  const { user, isAdmin } = useAuth();
  const {
    students,
    universities,
    agents,
    createApplication,
    updateApplication
  } = useData();

  const isEditing = Boolean(application);
  const [formData, setFormData] = useState(initialFormState);
  const [studentSearch, setStudentSearch] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Eligible students: Agents can only select their own students
  const eligibleStudents = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    if (isAdmin()) {
      return students;
    }
    // Agent role: only students assigned to this agent
    return students.filter(s => {
      const studentAgentId = s.agentId || s.agent?.id;
      return String(studentAgentId) === String(user?.id);
    });
  }, [students, isAdmin, user]);

  // Filtered students by search term
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return eligibleStudents;
    const term = studentSearch.toLowerCase();
    return eligibleStudents.filter(s =>
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.phone && s.phone.toLowerCase().includes(term))
    );
  }, [eligibleStudents, studentSearch]);

  // Every active university (the app-wide list only holds the first few, so load them all when the form opens).
  // An agent only receives the universities they are allowed to use.
  const [universityOptions, setUniversityOptions] = useState(null);
  useEffect(() => {
    if (!open || universityOptions) return;
    let cancelled = false;
    (async () => {
      try {
        const all = [];
        let page = 1;
        let totalPages = 1;
        do {
          const { data } = await universityAPI.getAll({ page, limit: 100, status: 'active', envelope: 'true' });
          all.push(...(data.universities || []));
          totalPages = data.totalPages || 1;
          page += 1;
        } while (page <= totalPages);
        if (!cancelled) setUniversityOptions(all);
      } catch {
        // fall back to the app-wide list below
      }
    })();
    return () => { cancelled = true; };
  }, [open, universityOptions]);

  const activeUniversities = useMemo(() => {
    const list = universityOptions || universities;
    if (!list || !Array.isArray(list)) return [];
    return list.filter(u => u.status === 'active' || !u.status);
  }, [universityOptions, universities]);

  // The active programs of the chosen university (including programs open to all), loaded from the server
  const [courseOptions, setCourseOptions] = useState([]);
  useEffect(() => {
    if (!open || !formData.universityId) {
      setCourseOptions([]);
      return undefined;
    }
    let cancelled = false;
    universityAPI.getCourses(formData.universityId)
      .then(({ data }) => {
        if (!cancelled) setCourseOptions((data.courses || []).filter(c => !c.status || c.status === 'active'));
      })
      .catch(() => { if (!cancelled) setCourseOptions([]); });
    return () => { cancelled = true; };
  }, [open, formData.universityId]);

  const availableCourses = courseOptions;

  // "All universities" or the (first two) university names a course is limited to (only known for the app-wide list)
  const describeAvailability = (course) => {
    if (!course.universityIds) return null;
    const ids = (course.universityIds || []).map(String);
    if (ids.length === 0) return 'All universities';
    const names = ids
      .map(id => universities?.find(u => String(u.id || u._id) === id)?.name)
      .filter(Boolean);
    if (names.length === 0) return `${ids.length} universities`;
    const shown = names.slice(0, 2).join(', ');
    return names.length > 2 ? `${shown} +${names.length - 2}` : shown;
  };

  const selectedCourse = useMemo(
    () => availableCourses.find(c => String(c.id || c._id) === String(formData.courseId)),
    [availableCourses, formData.courseId]
  );
  const catalogTuition = selectedCourse ? parseCourseFee(selectedCourse.tuitionFee) : null;
  const intakeOptions = useMemo(() => buildIntakeOptions(formData.intakeTerm), [formData.intakeTerm]);

  // When opening or application prop changes
  useEffect(() => {
    if (application) {
      setFormData({
        studentId: application.studentId ? String(application.studentId) : (application.student?.id ? String(application.student.id) : ''),
        agentId: application.agentId ? String(application.agentId) : (application.agent?.id ? String(application.agent.id) : ''),
        universityId: application.universityId ? String(application.universityId) : (application.university?.id ? String(application.university.id) : ''),
        courseId: application.courseId ? String(application.courseId) : '',
        courseName: application.courseName || '',
        courseLevel: application.courseLevel || 'Undergraduate',
        intakeTerm: application.intakeTerm || '',
        tuitionFee: application.tuitionFee !== null && application.tuitionFee !== undefined ? String(application.tuitionFee) : '',
        currency: application.currency || 'USD',
        remarks: application.remarks || ''
      });
    } else {
      setFormData({
        ...initialFormState,
        universityId: defaultUniversityId || '',
        agentId: !isAdmin() ? String(user?.id) : ''
      });
    }
    setStudentSearch('');
    setErrors({});
  }, [application, open, user, isAdmin, defaultUniversityId]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // Course must belong to the chosen university, so reset it when the university changes
      if (field === 'universityId' && value !== prev.universityId) {
        next.courseId = '';
        next.courseName = '';
        next.tuitionFee = '';
      }
      // Auto-fill tuition from the catalog when the course changes; the user can still overwrite it
      if (field === 'courseId' && value !== prev.courseId) {
        const course = courseOptions.find(c => String(c.id || c._id) === String(value));
        const fee = course ? parseCourseFee(course.tuitionFee) : null;
        next.tuitionFee = fee !== null ? String(fee) : '';
      }
      return next;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Auto-fill course or university recommendations when selecting a student
    if (field === 'studentId' && !isEditing) {
      const selectedStudent = eligibleStudents.find(s => String(s.id || s._id) === String(value));
      if (selectedStudent) {
        setFormData(prev => {
          const updates = { ...prev, studentId: value };
          if (!prev.universityId && (selectedStudent.universityId || selectedStudent.customFields?.universityId)) {
            updates.universityId = selectedStudent.universityId || selectedStudent.customFields?.universityId;
          }
          if (isAdmin() && selectedStudent.agentId) {
            updates.agentId = String(selectedStudent.agentId);
          }
          return updates;
        });
      }
    }
  };

  // Arriving from a program: select it once the chosen university's programs are loaded.
  // Choosing another university later selects it again if that university offers it; the agent's own pick is never overridden.
  useEffect(() => {
    if (!open || application || !defaultCourseId) return;
    const course = courseOptions.find(c => String(c.id || c._id) === String(defaultCourseId));
    if (!course) return;
    setFormData(prev => {
      if (prev.courseId) return prev;
      const fee = parseCourseFee(course.tuitionFee);
      return { ...prev, courseId: String(course.id || course._id), tuitionFee: fee !== null ? String(fee) : prev.tuitionFee };
    });
  }, [open, application, defaultCourseId, courseOptions, formData.courseId]);

  const validate = () => {
    const newErrors = {};
    if (!formData.studentId) {
      newErrors.studentId = 'Student selection is required';
    }
    if (!formData.universityId) {
      newErrors.universityId = 'University is required';
    }
    if (!formData.courseId && !(isEditing && !application?.courseId && formData.courseName.trim())) {
      newErrors.courseId = 'Select a course from the catalog';
    }
    if (formData.tuitionFee && (isNaN(Number(formData.tuitionFee)) || Number(formData.tuitionFee) < 0)) {
      newErrors.tuitionFee = 'Tuition fee must be a valid positive number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        universityId: formData.universityId,
        courseId: formData.courseId || undefined,
        intakeTerm: formData.intakeTerm.trim() || null,
        tuitionFee: formData.tuitionFee ? parseFloat(formData.tuitionFee) : null,
        currency: formData.currency || 'USD',
        remarks: formData.remarks.trim() || null
      };

      if (!isEditing) {
        // Create requires studentId
        payload.studentId = formData.studentId;
        // Only admin can send explicit agentId (agent ownership is derived from auth on backend)
        if (isAdmin() && formData.agentId) {
          payload.agentId = formData.agentId;
        }
        await createApplication(payload);
      } else {
        // Edit mode
        if (isAdmin()) {
          if (formData.studentId) payload.studentId = formData.studentId;
          if (formData.agentId) payload.agentId = formData.agentId;
        }
        await updateApplication(application.id || application._id, payload);
      }

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving application:', err);
      toast.error(isEditing ? 'Failed to update application' : 'Failed to create application', {
        description: formatApiError(err)
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] p-0 overflow-y-auto border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#042C53]/5 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-[#042C53]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                {isEditing ? `Edit Application ${application?.applicationNumber || ''}` : 'Create New Application'}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">
                {isEditing
                  ? 'Update university application details and study preferences'
                  : 'Submit a new student application to a partner university'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 bg-[#F9FAFB] space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Student Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="app-student" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#042C53]" />
              Select Student <span className="text-red-500">*</span>
            </Label>
            {isEditing && !isAdmin() ? (
              <Input
                disabled
                value={application?.student?.name || 'Selected Student'}
                className="bg-gray-100 text-xs text-gray-700 font-medium cursor-not-allowed"
              />
            ) : (
              <div className="space-y-1.5">
                <Select
                  value={formData.studentId}
                  onValueChange={(val) => handleChange('studentId', val)}
                >
                  <SelectTrigger className={`bg-white text-xs ${errors.studentId ? 'border-red-500' : 'border-gray-200'}`}>
                    <SelectValue placeholder="Choose a registered student..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Search student by name or email..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="h-7 text-[11px] pl-7 bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    {filteredStudents.length === 0 ? (
                      <div className="py-3 text-center text-xs text-gray-400">
                        No students found
                      </div>
                    ) : (
                      filteredStudents.map(s => (
                        <SelectItem key={s.id || s._id} value={String(s.id || s._id)}>
                          <span className="font-medium text-white-900">{s.name}</span>
                          {s.email && <span className="text-gray-400 text-[11px] ml-1.5">({s.email})</span>}
                          {s.country && <span className="text-blue-600 text-[10px] ml-1.5 bg-blue-50 px-1 rounded">{s.country}</span>}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.studentId && <p className="text-[11px] text-red-500 font-medium">{errors.studentId}</p>}
              </div>
            )}
          </div>

          {/* Admin-only Agent selector */}
          {isAdmin() && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Assigned Agent
              </Label>
              <Select
                value={formData.agentId}
                onValueChange={(val) => handleChange('agentId', val)}
              >
                <SelectTrigger className="bg-white text-xs border-gray-200">
                  <SelectValue placeholder="Default to student's agent" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {agents?.map(a => (
                    <SelectItem key={a.id || a._id} value={String(a.id || a._id)}>
                      {a.name} {a.agencyName ? `(${a.agencyName})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* University Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="app-university" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#042C53]" />
              Target University <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.universityId}
              onValueChange={(val) => handleChange('universityId', val)}
            >
              <SelectTrigger className={`bg-white text-xs ${errors.universityId ? 'border-red-500' : 'border-gray-200'}`}>
                <SelectValue placeholder="Select partner university..." />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {activeUniversities.map(u => (
                  <SelectItem key={u.id || u._id} value={String(u.id || u._id)}>
                    <span className="font-medium text-white-900">{u.name}</span>
                    {u.country && <span className="text-gray-500 text-[11px] ml-1.5">({u.country})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.universityId && <p className="text-[11px] text-red-500 font-medium">{errors.universityId}</p>}
          </div>

          {/* Course (from university catalog) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="app-course" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#042C53]" />
                Course / Program <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.courseId}
                onValueChange={(val) => handleChange('courseId', val)}
                disabled={!formData.universityId}
              >
                <SelectTrigger id="app-course" className={`bg-white text-xs ${errors.courseId ? 'border-red-500' : 'border-gray-200'}`}>
                  <SelectValue placeholder={formData.universityId ? 'Select a course...' : 'Select a university first'} />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {availableCourses.length === 0 ? (
                    <div className="py-3 text-center text-xs text-gray-400">No active courses for this university</div>
                  ) : (
                    availableCourses.map(c => (
                      <SelectItem key={c.id || c._id} value={String(c.id || c._id)}>
                        <span className="font-medium">{c.name}</span>
                        {c.level && <span className="text-gray-500 text-[11px] ml-1.5">({c.level})</span>}
                        {/* Same-named courses can differ in fee, duration and availability, so show all three */}
                        <span className="text-gray-500 text-[11px] ml-1.5">
                          · {[c.duration, c.tuitionFee, describeAvailability(c)].filter(Boolean).join(' · ')}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.courseId && <p className="text-[11px] text-red-500 font-medium">{errors.courseId}</p>}
              {isEditing && !application?.courseId && formData.courseName && !formData.courseId && (
                <p className="text-[11px] text-amber-600">Legacy course: "{formData.courseName}". Pick a catalog course to update it.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Course Level</Label>
              <Input
                disabled
                value={selectedCourse?.level || formData.courseLevel || ''}
                placeholder="Set by the selected course"
                className="bg-gray-100 text-xs text-gray-700 font-medium cursor-not-allowed"
              />
            </div>
          </div>

          {/* Intake Term */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="app-intake" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#042C53]" />
                Intake Term <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Select
                value={formData.intakeTerm || NO_INTAKE}
                onValueChange={(val) => handleChange('intakeTerm', val === NO_INTAKE ? '' : val)}
              >
                <SelectTrigger id="app-intake" className="bg-white text-xs border-gray-200">
                  <SelectValue placeholder="Select intake (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_INTAKE}>Not specified</SelectItem>
                  {intakeOptions.map(term => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tuition Fee & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="app-tuition" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#042C53]" />
                Estimated Tuition Fee <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="app-tuition"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 15000"
                value={formData.tuitionFee}
                onChange={(e) => handleChange('tuitionFee', e.target.value)}
                className={`bg-white text-xs ${errors.tuitionFee ? 'border-red-500' : 'border-gray-200'}`}
              />
              {catalogTuition !== null && (
                <p className="text-[11px] text-gray-500">Auto-filled from the course catalog. You can overwrite it.</p>
              )}
              {errors.tuitionFee && <p className="text-[11px] text-red-500 font-medium">{errors.tuitionFee}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Currency
              </Label>
              <Select
                value={formData.currency}
                onValueChange={(val) => handleChange('currency', val)}
              >
                <SelectTrigger className="bg-white text-xs border-gray-200">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(curr => (
                    <SelectItem key={curr.code} value={curr.code}>{curr.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="app-remarks" className="text-xs font-semibold text-gray-700">
              Internal Remarks / Notes
            </Label>
            <Textarea
              id="app-remarks"
              rows={2}
              placeholder="Any remarks, requirements, or student background for this application..."
              value={formData.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              className="bg-white text-xs resize-none border-gray-200"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 text-xs font-semibold text-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-10 text-xs font-semibold bg-[#042C53] hover:bg-[#042C53]/90 text-white min-w-[130px]"
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Application' : 'Create Application'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationModal;
