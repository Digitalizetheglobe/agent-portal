import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
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
import { cn } from '../../lib/utils';

const StudentEditPage = () => {
  const { studentId: id } = useParams();
  const navigate = useNavigate();
  const { students, events, agents, updateStudent, getStudentById } = useData();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    courseInterested: '',
    currentEducation: '',
    additionalInfo: '',
    eventId: '',
    agentId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setLoading(true);
        setError(null);

        // First try to find in local state
        let foundStudent = students.find(s => s.id === id);

        // If not found locally, fetch from API
        if (!foundStudent) {
          foundStudent = await getStudentById(id);
        }

        if (foundStudent) {
          setStudent(foundStudent);

          const event = events.find(e => e.id === foundStudent.eventId || e._id === foundStudent.eventId);

          const getField = (fieldKey, fallbackKey = null) => {
            if (fallbackKey && foundStudent[fallbackKey]) return foundStudent[fallbackKey];
            if (foundStudent[fieldKey]) return foundStudent[fieldKey];

            if (event?.formFields) {
              const field = event.formFields.find(f =>
                f.label.toLowerCase().trim() === fieldKey.toLowerCase().trim() ||
                (fallbackKey && f.label.toLowerCase().trim() === fallbackKey.toLowerCase().trim()) ||
                f.label.toLowerCase().includes(fieldKey.toLowerCase())
              );

              if (field && foundStudent.customFields) {
                const cleanFieldId = String(field.id).replace(/^field_/, '');
                if (foundStudent.customFields[cleanFieldId] !== undefined) return foundStudent.customFields[cleanFieldId];
                if (foundStudent.customFields[`field_${cleanFieldId}`] !== undefined) return foundStudent.customFields[`field_${cleanFieldId}`];
              }
            }

            if (foundStudent.customFields && foundStudent.customFields[fieldKey]) {
              return foundStudent.customFields[fieldKey];
            }
            return '';
          };

          setFormData({
            name: getField('name', 'Full Name'),
            email: getField('email', 'Email Address'),
            phone: getField('phone', 'Phone Number'),
            country: getField('country', 'Country of Interest'),
            courseInterested: getField('courseInterested', 'Target Course'),
            currentEducation: getField('currentEducation', 'Education Level') || getField('education', 'Highest Qualification'),
            additionalInfo: getField('additionalInfo', 'Internal Notes') || getField('notes'),
            eventId: foundStudent.eventId || '',
            agentId: foundStudent.agentId || '',
          });
        } else {
          setError('Student not found');
        }
      } catch (err) {
        setError('Failed to fetch student details');
        console.error('Error fetching student:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchStudent();
    }
  }, [id, students, getStudentById]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/students')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Students
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading student details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/students')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Students
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">{error || 'Student not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateStudent(id, formData);
      toast.success('Student information updated successfully');
      navigate(`/admin/students/${id}`);
    } catch (error) {
      toast.error('Failed to update student information');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/admin/students/${id}`);
  };

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-8" data-testid="student-edit-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          {/* <Button 
            variant="outline" 
            size="sm"
            className="mt-1 h-9 border-[#E5E7EB] bg-white hover:bg-gray-50"
            onClick={() => navigate('/admin/students')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button> */}
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
              Edit Student Details
            </h1>
            <p className="text-sm font-medium text-[#6B7280] mt-1">Update registration records for {formData.name || 'Student'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-10 px-6 border-[#E5E7EB] hover:text-[#6B7280] bg-white hover:bg-gray-50 font-bold"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            className="h-10 px-6 bg-[#042C53] hover:bg-[#0C447C] font-bold rounded-lg shadow-sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="save-student-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Information Card */}
            <Card className="border-[#E5E7EB] shadow-sm">
              <CardHeader className="border-b border-[#F3F4F6] px-6 py-4">
                <CardTitle className="text-base font-semibold font-['Outfit'] text-[#111827]">Personal Information</CardTitle>
                <CardDescription className="text-xs font-medium">
                  Core contact and identification details
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter student's full name"
                      className="h-11 border-[#E5E7EB] focus-visible:ring-[#042C53]/10"
                      data-testid="student-name-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="student@example.com"
                      className="h-11 border-[#E5E7EB] focus-visible:ring-[#042C53]/10"
                      data-testid="student-email-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+1234567890"
                      className="h-11 border-[#E5E7EB] focus-visible:ring-[#042C53]/10"
                      data-testid="student-phone-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Country of Interest *</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="United States"
                      className="h-11 border-[#E5E7EB] focus-visible:ring-[#042C53]/10"
                      data-testid="student-country-input"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Academic Information Card */}
            <Card className="border-[#E5E7EB] shadow-sm">
              <CardHeader className="border-b border-[#F3F4F6] px-6 py-4">
                <CardTitle className="text-base font-semibold font-['Outfit'] text-[#111827]">Academic Profile</CardTitle>
                <CardDescription className="text-xs font-medium">
                  Education background and course preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="courseInterested" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Interested Course *</Label>
                    <Input
                      id="courseInterested"
                      value={formData.courseInterested}
                      onChange={(e) => handleInputChange('courseInterested', e.target.value)}
                      placeholder="e.g., Computer Science, Business"
                      className="h-11 border-[#E5E7EB] focus-visible:ring-[#042C53]/10"
                      data-testid="student-course-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentEducation" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Current Qualification</Label>
                    <Input
                      id="currentEducation"
                      value={formData.currentEducation}
                      onChange={(e) => handleInputChange('currentEducation', e.target.value)}
                      placeholder="e.g., High School, Bachelor's Degree"
                      className="h-11 border-[#E5E7EB] focus-visible:ring-[#042C53]/10"
                      data-testid="student-education-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="additionalInfo" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Internal Notes</Label>
                  <Textarea
                    id="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                    placeholder="Any additional context for this student..."
                    rows={4}
                    className="border-[#E5E7EB] focus-visible:ring-[#042C53]/10 resize-none"
                    data-testid="student-additional-input"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-8">
            {/* Assignment Card */}
            <Card className="border-[#E5E7EB] shadow-sm">
              <CardHeader className="border-b border-[#F3F4F6] px-6 py-4">
                <CardTitle className="text-base font-semibold font-['Outfit'] text-[#111827]">Assignments</CardTitle>
                <CardDescription className="text-xs font-medium">
                  Campaign and Agency mapping
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="eventId" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Target Event *</Label>
                  <Select
                    value={formData.eventId}
                    onValueChange={(value) => handleInputChange('eventId', value)}
                    data-testid="event-select"
                  >
                    <SelectTrigger className="h-11 border-[#E5E7EB]">
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map(event => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agentId" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Originating Agent *</Label>
                  <Select
                    value={formData.agentId}
                    onValueChange={(value) => handleInputChange('agentId', value)}
                    data-testid="agent-select"
                  >
                    <SelectTrigger className="h-11 border-[#E5E7EB]">
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Sticky Actions */}
            <Card className="border-[#E5E7EB] shadow-md bg-white">
              <CardContent className="p-6 space-y-3">
                <Button
                  type="submit"
                  className="w-full h-11 bg-[#042C53] hover:bg-[#0C447C] font-bold"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  data-testid="submit-student-form"
                >
                  {isSubmitting ? 'Updating...' : 'Commit Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 border-[#E5E7EB] hover:text-[#6B7280] font-bold hover:bg-gray-50"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Discard Edits
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StudentEditPage;
