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
import { formatApiError } from '../../utils/api';

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
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' }
];

const initialFormState = {
  studentId: '',
  agentId: '',
  universityId: '',
  sourceEventId: '',
  courseName: '',
  courseLevel: 'Undergraduate',
  intakeTerm: '',
  tuitionFee: '',
  currency: 'USD',
  remarks: ''
};

const ApplicationModal = ({ open, onOpenChange, application = null, onSuccess }) => {
  const { user, isAdmin } = useAuth();
  const {
    students,
    universities,
    events,
    agents,
    courses,
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

  // Active universities
  const activeUniversities = useMemo(() => {
    if (!universities || !Array.isArray(universities)) return [];
    return universities.filter(u => u.status === 'active' || !u.status);
  }, [universities]);

  // When opening or application prop changes
  useEffect(() => {
    if (application) {
      setFormData({
        studentId: application.studentId ? String(application.studentId) : (application.student?.id ? String(application.student.id) : ''),
        agentId: application.agentId ? String(application.agentId) : (application.agent?.id ? String(application.agent.id) : ''),
        universityId: application.universityId ? String(application.universityId) : (application.university?.id ? String(application.university.id) : ''),
        sourceEventId: application.sourceEventId ? String(application.sourceEventId) : '',
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
        agentId: !isAdmin() ? String(user?.id) : ''
      });
    }
    setStudentSearch('');
    setErrors({});
  }, [application, open, user, isAdmin]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Auto-fill course or university recommendations when selecting a student
    if (field === 'studentId' && !isEditing) {
      const selectedStudent = eligibleStudents.find(s => String(s.id || s._id) === String(value));
      if (selectedStudent) {
        setFormData(prev => {
          const updates = { ...prev, studentId: value };
          if (!prev.courseName && selectedStudent.courseInterested) {
            updates.courseName = selectedStudent.courseInterested;
          }
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

  const validate = () => {
    const newErrors = {};
    if (!formData.studentId) {
      newErrors.studentId = 'Student selection is required';
    }
    if (!formData.universityId) {
      newErrors.universityId = 'University is required';
    }
    if (!formData.courseName.trim()) {
      newErrors.courseName = 'Course name is required';
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
        courseName: formData.courseName.trim(),
        courseLevel: formData.courseLevel,
        intakeTerm: formData.intakeTerm.trim() || null,
        tuitionFee: formData.tuitionFee ? parseFloat(formData.tuitionFee) : null,
        currency: formData.currency || 'USD',
        sourceEventId: formData.sourceEventId || null,
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
      <DialogContent className="max-w-[620px] p-0 overflow-hidden border-none shadow-2xl">
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

          {/* Course Name & Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="app-course-name" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#042C53]" />
                Course Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="app-course-name"
                placeholder="e.g. B.Sc Computer Science"
                value={formData.courseName}
                onChange={(e) => handleChange('courseName', e.target.value)}
                className={`bg-white text-xs ${errors.courseName ? 'border-red-500' : 'border-gray-200'}`}
              />
              {errors.courseName && <p className="text-[11px] text-red-500 font-medium">{errors.courseName}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Course Level <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.courseLevel}
                onValueChange={(val) => handleChange('courseLevel', val)}
              >
                <SelectTrigger className="bg-white text-xs border-gray-200">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_LEVELS.map(lvl => (
                    <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Intake Term & Source Event */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="app-intake" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#042C53]" />
                Intake Term
              </Label>
              <Input
                id="app-intake"
                placeholder="e.g. Fall 2025 / Spring 2026"
                value={formData.intakeTerm}
                onChange={(e) => handleChange('intakeTerm', e.target.value)}
                className="bg-white text-xs border-gray-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Source Event (Optional)
              </Label>
              <Select
                value={formData.sourceEventId || 'none'}
                onValueChange={(val) => handleChange('sourceEventId', val === 'none' ? '' : val)}
              >
                <SelectTrigger className="bg-white text-xs border-gray-200">
                  <SelectValue placeholder="Direct / No Event" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="none">Direct / No Event</SelectItem>
                  {events?.map(e => (
                    <SelectItem key={e.id || e._id} value={String(e.id || e._id)}>
                      {e.title}
                    </SelectItem>
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
                Estimated Tuition Fee
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
