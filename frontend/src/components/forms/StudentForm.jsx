import React from 'react';
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
import { toast } from 'sonner';

const studentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  country: z.string().min(2, 'Country is required'),
  education: z.string().min(2, 'Education is required'),
  courseInterested: z.string().min(2, 'Course interest is required'),
  notes: z.string().optional()
});

const countries = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 
  'India', 'China', 'Germany', 'France', 'Brazil', 'Japan',
  'South Korea', 'Singapore', 'UAE', 'Saudi Arabia', 'Nigeria',
  'South Africa', 'Mexico', 'Russia', 'Italy', 'Spain'
];

const educationLevels = [
  'High School', 'A-Levels', 'Bachelor\'s Degree', 'Master\'s Degree',
  'PhD', 'Diploma', 'Associate Degree', 'Professional Certification'
];

const StudentForm = ({ eventId }) => {
  const { addStudent } = useData();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      country: '',
      education: '',
      courseInterested: '',
      notes: ''
    }
  });

  const country = watch('country');
  const education = watch('education');

  const onSubmit = async (data) => {
    const studentData = {
      ...data,
      eventId,
      agentId: user?.id
    };

    addStudent(studentData);
    
    toast.success('Student registered', {
      description: `${data.name} has been registered successfully.`
    });

    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="student-form">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Enter student's full name"
          data-testid="student-name-input"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="student@email.com"
          data-testid="student-email-input"
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          {...register('phone')}
          placeholder="+1 234 567 8900"
          data-testid="student-phone-input"
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country *</Label>
        <Select
          value={country}
          onValueChange={(value) => setValue('country', value)}
        >
          <SelectTrigger data-testid="student-country-select">
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.country && (
          <p className="text-sm text-destructive">{errors.country.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="education">Education Level *</Label>
        <Select
          value={education}
          onValueChange={(value) => setValue('education', value)}
        >
          <SelectTrigger data-testid="student-education-select">
            <SelectValue placeholder="Select education level" />
          </SelectTrigger>
          <SelectContent>
            {educationLevels.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.education && (
          <p className="text-sm text-destructive">{errors.education.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="courseInterested">Course Interested *</Label>
        <Input
          id="courseInterested"
          {...register('courseInterested')}
          placeholder="e.g., Master's in Computer Science"
          data-testid="student-course-input"
        />
        {errors.courseInterested && (
          <p className="text-sm text-destructive">{errors.courseInterested.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Any additional information about the student..."
          rows={3}
          data-testid="student-notes-input"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full"
        disabled={isSubmitting}
        data-testid="student-submit-btn"
      >
        {isSubmitting ? 'Registering...' : 'Register Student'}
      </Button>
    </form>
  );
};

export default StudentForm;
