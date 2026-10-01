import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  RadioGroup,
  RadioGroupItem,
} from "../../components/ui/radio-group";
import { Calendar } from '../../components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import CountrySelector from './specialized/CountrySelector';
import PhoneInput from './specialized/PhoneInput';
import QualificationSelector from './specialized/QualificationSelector';
import { isCountryMatch } from '../../lib/countries';

const DEFAULT_FORM_FIELDS = [
  { id: 'name', label: 'Full Name', type: 'text', required: true, order: 1, placeholder: 'e.g. John Doe' },
  { id: 'email', label: 'Email Address', type: 'email', required: true, order: 2, placeholder: 'e.g. john@example.com' },
  { id: 'phone', label: 'Phone Number', type: 'phone', required: false, order: 3, placeholder: '+1 234 567 8900' },
  { id: 'country', label: 'Country of Interest', type: 'country', required: false, order: 4 },
  { id: 'universityId', label: 'Target University', type: 'university', required: true, order: 5 },
  { id: 'courseInterested', label: 'Target Course', type: 'course', required: false, order: 6 },
  { id: 'education', label: 'Highest Qualification', type: 'qualification', required: false, order: 7 },
  { id: 'notes', label: 'Internal Notes', type: 'paragraph', required: false, order: 8, placeholder: 'Any background notes or remarks...' }
];

const DynamicStudentForm = ({ eventId, studentData, onSuccess }) => {
  const { addStudent, getEventById, updateStudent, agents, universities, fetchUniversities, courses, fetchCourses } = useData();
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState(null);
  const [formSchema, setFormSchema] = useState(null);
  const isEditMode = !!studentData;

  // Load universities if empty
  useEffect(() => {
    if (!universities || universities.length === 0) {
      if (typeof fetchUniversities === 'function') {
        fetchUniversities();
      }
    }
  }, [universities, fetchUniversities]);

  // Load courses if empty
  useEffect(() => {
    if (!courses || courses.length === 0) {
      if (typeof fetchCourses === 'function') {
        fetchCourses();
      }
    }
  }, [courses, fetchCourses]);

  // Determine active form fields (custom fields if defined on event, else standard default fields)
  const activeFields = useMemo(() => {
    if (event?.formFields && Array.isArray(event.formFields) && event.formFields.length > 0) {
      let fields = [...event.formFields];
      // Check if event already has university field
      const hasUni = fields.some(f => f.id === 'universityId' || f.label?.toLowerCase().includes('university'));
      if (!hasUni) {
        fields.push({ id: 'universityId', label: 'Target University', type: 'university', required: true, order: 98 });
      }
      // Check if event already has course field
      const hasCourse = fields.some(f => f.id === 'courseInterested' || f.type === 'course' || f.label?.toLowerCase().includes('course'));
      if (!hasCourse) {
        fields.push({ id: 'courseInterested', label: 'Target Course', type: 'course', required: false, order: 99 });
      }

      return fields.map(f => {
        if (f.id === 'universityId' || f.label?.toLowerCase().includes('university')) {
          return { ...f, type: 'university', required: true };
        }
        if (f.id === 'courseInterested' || f.label?.toLowerCase().includes('course')) {
          return { ...f, type: 'course' };
        }
        return f;
      });
    }
    return DEFAULT_FORM_FIELDS;
  }, [event]);

  // Get event data
  useEffect(() => {
    if (eventId) {
      const eventData = getEventById(eventId);
      setEvent(eventData || null);
    } else {
      setEvent(null);
    }
  }, [eventId, getEventById]);

  // Generate dynamic Zod schema based on active fields
  useEffect(() => {
    const schemaFields = {};

    activeFields.forEach(field => {
      let fieldSchema;

      switch (field.type) {
        case 'text':
        case 'email':
        case 'phone':
        case 'country':
        case 'university':
        case 'course':
        case 'qualification':
        case 'select':
        case 'radio':
          if (field.required) {
            fieldSchema = z.string().min(1, `${field.label} is required`);
          } else {
            fieldSchema = z.string().optional();
          }

          if (field.type === 'email' || field.label.toLowerCase().includes('email')) {
            if (field.required) {
              fieldSchema = z.string().email('Invalid email address');
            } else {
              fieldSchema = z.string().email('Invalid email address').optional().or(z.literal(''));
            }
          }
          break;
        case 'date':
          fieldSchema = field.required
            ? z.date({ required_error: `${field.label} is required` })
            : z.date().optional();
          break;
        case 'paragraph':
          fieldSchema = field.required
            ? z.string().min(1, `${field.label} is required`)
            : z.string().optional();
          break;
        default:
          fieldSchema = field.required
            ? z.string().min(1, `${field.label} is required`)
            : z.string().optional();
      }

      // Add regex validation if specified
      if (field.regex) {
        const regexPattern = new RegExp(field.regex);
        fieldSchema = fieldSchema.regex(regexPattern, field.regexError || 'Invalid format');
      }

      schemaFields[field.id] = fieldSchema;
    });

    if (isAdmin()) {
      schemaFields.agentId = z.string().optional();
    }

    setFormSchema(z.object(schemaFields));
  }, [activeFields, isAdmin]);

  // Prepare default values for the form
  const getDefaultValues = () => {
    if (studentData) {
      const values = {};
      if (studentData.customFields) {
        Object.entries(studentData.customFields).forEach(([key, value]) => {
          values[key] = value;
        });
      }
      if (studentData.name) values.name = studentData.name;
      if (studentData.email) values.email = studentData.email;
      if (studentData.phone) values.phone = studentData.phone;
      if (studentData.country) values.country = studentData.country;
      if (studentData.education) values.education = studentData.education;
      if (studentData.courseInterested) values.courseInterested = studentData.courseInterested;
      if (studentData.notes) values.notes = studentData.notes;
      if (studentData.agentId) values.agentId = studentData.agentId;
      if (studentData.universityId || studentData.customFields?.universityId) {
        values.universityId = studentData.universityId || studentData.customFields?.universityId;
      }
      return values;
    }
    return {};
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: formSchema ? zodResolver(formSchema) : undefined,
    defaultValues: getDefaultValues()
  });

  // Update form values when studentData changes
  useEffect(() => {
    if (studentData) {
      const values = getDefaultValues();
      Object.entries(values).forEach(([key, value]) => {
        setValue(key, value);
      });
    }
  }, [studentData, setValue]);

  // Dynamically identify the country field ID (supports default 'country' and custom fields)
  const countryFieldId = useMemo(() => {
    const f = activeFields.find(field =>
      field.type === 'country' ||
      field.id === 'country' ||
      (field.label && field.label.toLowerCase().includes('country'))
    );
    return f ? f.id : 'country';
  }, [activeFields]);

  const watchedCountry = watch(countryFieldId);
  const watchedUniversityId = watch('universityId');

  // Filter universities based on selected Country of Interest.
  // If no Country of Interest is selected, show all target universities.
  const filteredUniversities = useMemo(() => {
    if (!universities || universities.length === 0) return [];
    if (!watchedCountry || !watchedCountry.trim()) {
      return universities;
    }
    return universities.filter(u => isCountryMatch(u.country, watchedCountry));
  }, [universities, watchedCountry]);

  // Filter courses based on selected Target University (if one is chosen).
  // If no university is chosen, show all active courses.
  const filteredCourses = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    const active = courses.filter(c => c.status === 'active' || !c.status);
    if (!watchedUniversityId) return active;
    return active.filter(c => {
      const uniIds = Array.isArray(c.universityIds) && c.universityIds.length > 0
        ? c.universityIds.map(String)
        : (c.universityId ? [String(c.universityId)] : []);
      // If course is open to all universities
      if (uniIds.length === 0) return true;
      // If course is offered by the selected university
      return uniIds.includes(String(watchedUniversityId));
    });
  }, [courses, watchedUniversityId]);

  // If student changes country to one that doesn't include their previously selected university, clear universityId
  useEffect(() => {
    if (watchedCountry && watchedCountry.trim() && watchedUniversityId) {
      const isMatch = filteredUniversities.some(u => String(u.id || u._id) === String(watchedUniversityId));
      if (!isMatch) {
        setValue('universityId', '', { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchedCountry, filteredUniversities, watchedUniversityId, setValue]);

  const onSubmit = async (data) => {
    try {
      const effectiveAgentId = isAdmin()
        ? (data.agentId || studentData?.agentId || user?.id)
        : user?.id;

      const studentPayload = {
        eventId: eventId || null,
        agentId: effectiveAgentId,
        customFields: { ...data }
      };

      // Map university if selected
      if (data.universityId) {
        const matchedUni = (universities || []).find(u => (u.id === data.universityId || u._id === data.universityId));
        studentPayload.customFields.universityId = data.universityId;
        studentPayload.customFields.university = matchedUni?.name || '';
        studentPayload.customFields.universityName = matchedUni?.name || '';
      }

      // Map course if selected
      if (data.courseInterested) {
        studentPayload.courseInterested = data.courseInterested;
        studentPayload.customFields.courseInterested = data.courseInterested;
        const matchedCourse = (courses || []).find(c => c.name === data.courseInterested || c.id === data.courseInterested);
        if (matchedCourse) {
          studentPayload.customFields.courseId = matchedCourse.id;
        }
      }

      // Map fields to root properties
      activeFields.forEach(field => {
        const val = data[field.id];
        if (!val) return;

        const label = (field.label || '').toLowerCase();
        const idKey = (field.id || '').toLowerCase();

        if (label.includes('name') || idKey === 'name') studentPayload.name = val;
        else if (label.includes('email') || idKey === 'email') studentPayload.email = val;
        else if (label.includes('phone') || label.includes('mobile') || idKey === 'phone') studentPayload.phone = val;
        else if (label.includes('country') || idKey === 'country') studentPayload.country = val;
        else if (label.includes('city') || idKey === 'city') studentPayload.city = val;
        else if (label.includes('education') || label.includes('qualification') || idKey === 'education') studentPayload.education = val;
        else if (label.includes('course') || idKey === 'courseinterested') studentPayload.courseInterested = val;
        else if (label.includes('note') || idKey === 'notes') studentPayload.notes = val;
      });

      // Direct fallback if standard fields exist on data
      if (data.name) studentPayload.name = data.name;
      if (data.email) studentPayload.email = data.email;
      if (data.phone) studentPayload.phone = data.phone;
      if (data.country) studentPayload.country = data.country;
      if (data.education) studentPayload.education = data.education;
      if (data.courseInterested) studentPayload.courseInterested = data.courseInterested;
      if (data.notes) studentPayload.notes = data.notes;

      if (isEditMode && studentData) {
        await updateStudent(studentData.id || studentData._id, studentPayload);
        toast.success('Student updated successfully');
      } else {
        await addStudent(studentPayload);
        toast.success('Student registered successfully');
      }

      if (onSuccess) {
        onSuccess();
      }
      reset();
    } catch (error) {
      console.error('Failed to save student:', error);
    }
  };

  const renderFormField = (field) => {
    const fieldValue = watch(field.id);
    const error = errors[field.id];

    switch (field.type) {
      case 'text':
        if (field.id === 'courseInterested' || field.label?.toLowerCase().includes('course')) {
          return renderFormField({ ...field, type: 'course' });
        }
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type === 'email' ? 'email' : 'text'}
              {...register(field.id)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              className={cn("h-10 text-sm", error ? 'border-red-500' : 'border-gray-200')}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'email':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              type="email"
              {...register(field.id)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              className={cn("h-10 text-sm", error ? 'border-red-500' : 'border-gray-200')}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'course':
        return (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
              {watchedUniversityId ? (
                <span className="text-[11px] font-medium text-[#042C53] bg-blue-50 px-2 py-0.5 rounded-md">
                  {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} available
                </span>
              ) : (
                <span className="text-[11px] font-medium text-gray-400">
                  {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} total
                </span>
              )}
            </div>
            <select
              id={field.id}
              {...register(field.id)}
              className={cn(
                "w-full h-10 px-3 py-2 text-sm rounded-lg border outline-none focus:border-[#042C53] bg-white transition-colors",
                error ? 'border-red-500' : 'border-gray-200'
              )}
            >
              <option value="">Select Target Course</option>
              {fieldValue && !filteredCourses.some(c => c.name === fieldValue) && (
                <option value={fieldValue}>{fieldValue} (Current)</option>
              )}
              {filteredCourses.map(c => {
                const uniCount = (c.universityIds && c.universityIds.length > 0) ? c.universityIds.length : (c.universityId ? 1 : 0);
                let uniLabel = '';
                if (!watchedUniversityId) {
                  if (uniCount === 0) uniLabel = ' (All Universities)';
                  else if (uniCount === 1) {
                    const uniId = c.universityIds?.[0] || c.universityId;
                    const u = universities?.find(x => String(x.id || x._id) === String(uniId));
                    if (u) uniLabel = ` - ${u.name}`;
                  } else {
                    uniLabel = ` (${uniCount} Universities)`;
                  }
                }
                const labelText = `${c.name}${c.level ? ` (${c.level})` : ''}${uniLabel}`;
                return (
                  <option key={c.id || c._id} value={c.name}>
                    {labelText}
                  </option>
                );
              })}
            </select>
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'university':
        return (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
              {watchedCountry && watchedCountry.trim() ? (
                <span className="text-[11px] font-medium text-[#042C53] bg-blue-50 px-2 py-0.5 rounded-md">
                  {filteredUniversities.length} {filteredUniversities.length === 1 ? 'university' : 'universities'} in {watchedCountry}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-gray-400">
                  {filteredUniversities.length} {filteredUniversities.length === 1 ? 'university' : 'universities'} available
                </span>
              )}
            </div>
            <select
              id={field.id}
              {...register(field.id)}
              className={cn(
                "w-full h-10 px-3 py-2 text-sm rounded-lg border outline-none focus:border-[#042C53] bg-white transition-colors",
                error ? 'border-red-500' : 'border-gray-200'
              )}
            >
              <option value="">
                {watchedCountry && watchedCountry.trim()
                  ? `Select Target University in ${watchedCountry}`
                  : 'Select Target University'}
              </option>
              {filteredUniversities.map(u => (
                <option key={u.id || u._id} value={u.id || u._id}>
                  {u.name} {u.country ? `(${u.country})` : ''}
                </option>
              ))}
            </select>
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
            {watchedCountry && watchedCountry.trim() && filteredUniversities.length === 0 && (
              <p className="text-xs text-amber-600 font-medium">
                No partner universities found for {watchedCountry}. Clear Country of Interest to select from all available universities.
              </p>
            )}
          </div>
        );

      case 'paragraph':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.id}
              {...register(field.id)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              rows={3}
              className={cn("text-sm resize-none", error ? 'border-red-500' : 'border-gray-200')}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={fieldValue || ''}
              onValueChange={(value) => setValue(field.id, value)}
            >
              <SelectTrigger className={cn("h-10 text-sm", error ? 'border-red-500' : 'border-gray-200')}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'country':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <CountrySelector
              value={fieldValue || ''}
              onChange={(value) => setValue(field.id, value || '', { shouldValidate: true, shouldDirty: true })}
              placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'qualification':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <QualificationSelector
              value={fieldValue || ''}
              onChange={(value) => setValue(field.id, value)}
              placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'phone':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <PhoneInput
              value={fieldValue || ''}
              onChange={(value) => setValue(field.id, value)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              defaultCountry={field.defaultCountry || 'IN'}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <RadioGroup
              value={fieldValue || ''}
              onValueChange={(value) => setValue(field.id, value)}
              className={cn("p-2 rounded-md", error ? 'border border-red-500' : '')}
            >
              {(field.options || []).map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.id}-${index}`} />
                  <Label htmlFor={`${field.id}-${index}`} className="text-sm">{option}</Label>
                </div>
              ))}
            </RadioGroup>
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal h-10',
                    !fieldValue && 'text-muted-foreground',
                    error && 'border-red-500'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fieldValue ? format(fieldValue, 'PPP') : field.placeholder || 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fieldValue}
                  onSelect={(date) => setValue(field.id, date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              {...register(field.id)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              className={cn("h-10 text-sm", error ? 'border-red-500' : 'border-gray-200')}
            />
            {error && (
              <p className="text-xs text-red-500">{error.message}</p>
            )}
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="dynamic-student-form">
      {/* If Admin, render Assigned Agent selector */}
      {isAdmin() && !isEditMode && (
        <div className="space-y-1.5 pb-2 border-b border-gray-100">
          <Label htmlFor="agentId" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Assigned Agent
          </Label>
          <select
            id="agentId"
            {...register('agentId')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#042C53] bg-white"
          >
            <option value="">Admin / Direct Registration</option>
            {(agents || []).map(a => (
              <option key={a.id || a._id} value={a.id || a._id}>
                {a.name} ({a.agencyName || a.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Render all active fields */}
      {activeFields
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(field => renderFormField(field))}

      <Button
        type="submit"
        className="w-full bg-[#042C53] hover:bg-[#0C447C] h-11 text-sm font-bold mt-4 shadow-sm"
        disabled={isSubmitting}
        data-testid="dynamic-student-submit-btn"
      >
        {isSubmitting ? (isEditMode ? 'Updating...' : 'Registering...') : (isEditMode ? 'Update Student' : 'Register Student')}
      </Button>
    </form>
  );
};

export default DynamicStudentForm;
