import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
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
import { BookOpen, Building2, Globe, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

const initialFormState = {
  name: '',
  code: '',
  level: 'Undergraduate',
  department: '',
  isAllUniversities: true,
  universityIds: [],
  duration: '',
  tuitionFee: '',
  status: 'active',
  description: ''
};

const DEGREE_LEVELS = [
  'Undergraduate',
  'Postgraduate',
  'Diploma',
  'Doctorate / PhD',
  'Certificate',
  'Associate Degree'
];

const DEPARTMENTS = [
  'Computer Science & IT',
  'Business & Management',
  'Engineering & Technology',
  'Health & Life Sciences',
  'Medicine & Nursing',
  'Arts & Humanities',
  'Social Sciences',
  'Law & Criminology',
  'Natural Sciences & Mathematics',
  'Architecture & Design'
];

const CourseModal = ({ open, onOpenChange, course = null, onSuccess }) => {
  const { createCourse, updateCourse, universities } = useData();
  const isEditing = Boolean(course);

  const [formData, setFormData] = useState(initialFormState);
  const [uniSearch, setUniSearch] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (course) {
      let initialUniIds = [];
      if (Array.isArray(course.universityIds) && course.universityIds.length > 0) {
        initialUniIds = course.universityIds.map(String);
      } else if (course.universityId) {
        initialUniIds = [String(course.universityId)];
      }

      const allUnis = initialUniIds.length === 0;

      setFormData({
        name: course.name || '',
        code: course.code || '',
        level: course.level || 'Undergraduate',
        department: course.department || '',
        isAllUniversities: allUnis,
        universityIds: initialUniIds,
        duration: course.duration || '',
        tuitionFee: course.tuitionFee || '',
        status: course.status || 'active',
        description: course.description || ''
      });
    } else {
      setFormData(initialFormState);
    }
    setUniSearch('');
    setErrors({});
  }, [course, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const filteredUnis = useMemo(() => {
    if (!universities) return [];
    if (!uniSearch.trim()) return universities;
    const term = uniSearch.toLowerCase();
    return universities.filter(u =>
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.country && u.country.toLowerCase().includes(term)) ||
      (u.city && u.city.toLowerCase().includes(term))
    );
  }, [universities, uniSearch]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Course name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const isAll = formData.isAllUniversities || formData.universityIds.length === 0;
      const targetUniIds = isAll ? [] : formData.universityIds;

      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase() || null,
        level: formData.level,
        department: formData.department.trim() || null,
        universityIds: targetUniIds,
        universityId: targetUniIds.length > 0 ? targetUniIds[0] : null,
        duration: formData.duration.trim() || null,
        tuitionFee: formData.tuitionFee.trim() || null,
        status: formData.status,
        description: formData.description.trim() || null
      };

      if (isEditing) {
        await updateCourse(course.id || course._id, payload);
      } else {
        await createCourse(payload);
      }

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving course:', err);
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
              <BookOpen className="w-5 h-5 text-[#042C53]" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                {isEditing ? 'Edit Course' : 'Add New Course'}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium mt-0.5">
                {isEditing ? 'Update course specifications and university availability' : 'Add a degree program or study course and assign to partner universities'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 bg-[#F9FAFB] space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Course Name */}
          <div className="space-y-1.5">
            <Label htmlFor="course-name" className="text-xs font-semibold text-gray-700">
              Course Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="course-name"
              placeholder="e.g. Master of Data Science & AI"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`bg-white ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && <p className="text-[11px] text-red-500">{errors.name}</p>}
          </div>

          {/* Code & Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="course-code" className="text-xs font-semibold text-gray-700">
                Course Code
              </Label>
              <Input
                id="course-code"
                placeholder="e.g. CS101 / MBA"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Degree Level <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.level}
                onValueChange={(val) => handleChange('level', val)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {DEGREE_LEVELS.map(lvl => (
                    <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              Department / Discipline
            </Label>
            <Select
              value={formData.department || 'other'}
              onValueChange={(val) => handleChange('department', val === 'other' ? '' : val)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="other">General / Not Specified</SelectItem>
                {DEPARTMENTS.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Partner University Multi-Select Selection */}
          <div className="space-y-2.5 p-3.5 bg-white rounded-lg border border-gray-200">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#042C53]" /> Partner University Availability
                </Label>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Assign this course to multiple partner universities so you don't have to recreate it every time.
                </p>
              </div>
              <Badge variant="outline" className="text-[11px] shrink-0 border-blue-200 text-[#042C53] bg-blue-50/50">
                {formData.isAllUniversities
                  ? 'All Universities'
                  : `${formData.universityIds.length} Selected`}
              </Badge>
            </div>

            {/* Toggle Modes */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant={formData.isAllUniversities ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, isAllUniversities: true, universityIds: [] }))}
                className={cn(
                  "text-xs h-8",
                  formData.isAllUniversities
                    ? "bg-[#042C53] text-white hover:bg-[#042C53]/90"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                )}
              >
                <Globe className="w-3.5 h-3.5 mr-1.5" /> All Partner Universities
              </Button>
              <Button
                type="button"
                variant={!formData.isAllUniversities ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, isAllUniversities: false }))}
                className={cn(
                  "text-xs h-8",
                  !formData.isAllUniversities
                    ? "bg-[#042C53] text-white hover:bg-[#042C53]/90"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                )}
              >
                Select Specific Universities ({formData.universityIds.length})
              </Button>
            </div>

            {/* If Specific Universities is selected */}
            {!formData.isAllUniversities && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search partner universities by name or country..."
                      value={uniSearch}
                      onChange={(e) => setUniSearch(e.target.value)}
                      className="h-8 pl-8 text-xs bg-gray-50/70 border-gray-200"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const allIds = (universities || []).map(u => String(u.id || u._id));
                        setFormData(prev => ({ ...prev, universityIds: allIds }));
                      }}
                      className="text-[11px] h-7 px-2 text-[#042C53] font-semibold hover:bg-blue-50"
                    >
                      Select All
                    </Button>
                    <span className="text-gray-300">|</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, universityIds: [] }))}
                      className="text-[11px] h-7 px-2 text-gray-500 hover:bg-gray-100"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Universities scrollable checkbox list */}
                <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-md p-1.5 bg-gray-50/40">
                  {filteredUnis.length === 0 ? (
                    <p className="text-xs text-center text-gray-400 py-3">No universities matching your search</p>
                  ) : (
                    filteredUnis.map(u => {
                      const uId = String(u.id || u._id);
                      const isSelected = formData.universityIds.includes(uId);
                      return (
                        <label
                          key={uId}
                          className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors select-none",
                            isSelected
                              ? "bg-blue-50/80 text-[#042C53] font-medium border border-blue-100"
                              : "hover:bg-white text-gray-700"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setFormData(prev => {
                                const exists = prev.universityIds.includes(uId);
                                const nextIds = exists
                                  ? prev.universityIds.filter(id => id !== uId)
                                  : [...prev.universityIds, uId];
                                return { ...prev, universityIds: nextIds };
                              });
                            }}
                            className="rounded border-gray-300 text-[#042C53] focus:ring-[#042C53] w-3.5 h-3.5"
                          />
                          <span className="flex-1 truncate">{u.name}</span>
                          {u.country && (
                            <span className="text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200 shrink-0">
                              {u.country}
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Selected chips display */}
                {formData.universityIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 max-h-20 overflow-y-auto">
                    {formData.universityIds.map(id => {
                      const u = universities?.find(uni => String(uni.id || uni._id) === String(id));
                      if (!u) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-[#042C53] px-2 py-0.5 rounded-md border border-blue-100"
                        >
                          <span className="truncate max-w-[150px]">{u.name}</span>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              universityIds: prev.universityIds.filter(x => x !== id)
                            }))}
                            className="text-blue-400 hover:text-blue-800 font-bold ml-1 text-xs"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Duration & Tuition Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="course-duration" className="text-xs font-semibold text-gray-700">
                Duration
              </Label>
              <Input
                id="course-duration"
                placeholder="e.g. 3 Years, 18 Months"
                value={formData.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-tuition" className="text-xs font-semibold text-gray-700">
                Estimated Tuition Fee
              </Label>
              <Input
                id="course-tuition"
                placeholder="e.g. $18,000 / year"
                value={formData.tuitionFee}
                onChange={(e) => handleChange('tuitionFee', e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              Course Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(val) => handleChange('status', val)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (Visible to Students & Agents)</SelectItem>
                <SelectItem value="inactive">Inactive (Hidden)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="course-desc" className="text-xs font-semibold text-gray-700">
              Course Overview & Description
            </Label>
            <Textarea
              id="course-desc"
              rows={3}
              placeholder="Brief summary of program curriculum, eligibility, or prerequisites..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="bg-white resize-none"
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
              className="h-10 text-xs font-semibold bg-[#042C53] hover:bg-[#042C53]/90 text-white min-w-[120px]"
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Course' : 'Create Course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CourseModal;
