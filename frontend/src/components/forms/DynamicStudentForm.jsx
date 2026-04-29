import React, { useState, useEffect } from 'react';
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

const DynamicStudentForm = ({ eventId, studentData, onSuccess }) => {
  const { addStudent, getEventById, updateStudent } = useData();
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState(null);
  const [formSchema, setFormSchema] = useState(null);
  const [isEditMode, setIsEditMode] = useState(!!studentData);

  // Get event data and form fields
  useEffect(() => {
    const eventData = getEventById(eventId);
    setEvent(eventData);
    
    if (eventData?.formFields && eventData.formFields.length > 0) {
      // Generate dynamic Zod schema based on form fields
      const schemaFields = {};
      
      eventData.formFields.forEach(field => {
        let fieldSchema;
        
        switch (field.type) {
          case 'text':
            fieldSchema = z.string().min(1, `${field.label} is required`);
            break;
          case 'paragraph':
            fieldSchema = z.string().min(1, `${field.label} is required`);
            break;
          case 'email':
            fieldSchema = z.string().email('Invalid email address');
            break;
          case 'date':
            fieldSchema = z.date({ required_error: `${field.label} is required` });
            break;
          case 'select':
          case 'radio':
            fieldSchema = z.string().min(1, `${field.label} is required`);
            break;
          default:
            fieldSchema = z.string().min(1, `${field.label} is required`);
        }
        
        // Add regex validation if specified
        if (field.regex) {
          const regexPattern = new RegExp(field.regex);
          fieldSchema = fieldSchema.regex(regexPattern, field.regexError || 'Invalid format');
        }
        
        // Make field optional if not required
        if (!field.required) {
          fieldSchema = fieldSchema.optional();
        }
        
        schemaFields[field.id] = fieldSchema;
      });
      
      const dynamicSchema = z.object(schemaFields);
      setFormSchema(dynamicSchema);
    }
  }, [eventId, getEventById]);

  // Prepare default values for the form
  const getDefaultValues = () => {
    if (studentData) {
      // Edit mode: populate with existing student data
      const values = {};
      
      // Handle custom fields
      if (studentData.customFields) {
        Object.entries(studentData.customFields).forEach(([key, value]) => {
          values[key] = value;
        });
      }
      
      // Handle legacy fields for backward compatibility
      if (studentData.name) values.name = studentData.name;
      if (studentData.email) values.email = studentData.email;
      if (studentData.phone) values.phone = studentData.phone;
      if (studentData.country) values.country = studentData.country;
      if (studentData.education) values.education = studentData.education;
      if (studentData.courseInterested) values.courseInterested = studentData.courseInterested;
      if (studentData.notes) values.notes = studentData.notes;
      
      return values;
    }
    
    // Create mode: empty values
    return {};
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
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

  const onSubmit = async (data) => {
    try {
      const studentPayload = {
        eventId,
        // Only set agentId if current user is an agent, not admin
        agentId: isAdmin() ? (studentData?.agentId || null) : user?.id,
        customFields: data // Store custom field responses
      };

      // Remove individual field properties to avoid duplicates
      Object.keys(data).forEach(key => {
        if (key.startsWith('field_')) {
          delete studentPayload[key];
        }
      });

      if (isEditMode && studentData) {
        // Update existing student
        console.log('Updating student with ID:', studentData.id);
        console.log('Student payload:', studentPayload);
        await updateStudent(studentData.id, studentPayload);
        toast.success('Student updated', {
          description: 'Student information has been updated successfully.'
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Create new student
        await addStudent(studentPayload);
        toast.success('Student registered', {
          description: 'Student has been registered successfully.'
        });
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
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              {...register(field.id)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
          </div>
        );

      case 'paragraph':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.id}
              {...register(field.id)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              rows={3}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={fieldValue || ''}
              onValueChange={(value) => setValue(field.id, value)}
            >
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <RadioGroup
              value={fieldValue || ''}
              onValueChange={(value) => setValue(field.id, value)}
              className={error ? 'border-red-500 rounded-md p-2' : ''}
            >
              {field.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.id}-${index}`} />
                  <Label htmlFor={`${field.id}-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
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
              <p className="text-sm text-destructive">{error.message}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              {...register(field.id)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}
          </div>
        );
    }
  };

  // If no custom form fields, show default form
  if (!event?.formFields || event.formFields.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
        <p className="text-muted-foreground">
          No custom registration form configured for this event.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Please contact your admin to set up the registration form.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="dynamic-student-form">
      {/* <div className="mb-4">
        <h3 className="text-lg font-medium">
          {isEditMode ? 'Edit Student' : 'Registration Form'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isEditMode ? 'Update student information below' : 'Please fill in all required fields marked with *'}
        </p>
      </div> */}

      {event.formFields
        .sort((a, b) => a.order - b.order)
        .map(field => renderFormField(field))}

      <Button 
        type="submit" 
        className="w-full"
        disabled={isSubmitting}
        data-testid="dynamic-student-submit-btn"
      >
        {isSubmitting ? (isEditMode ? 'Updating...' : 'Registering...') : (isEditMode ? 'Update Student' : 'Register Student')}
      </Button>
    </form>
  );
};

export default DynamicStudentForm;
