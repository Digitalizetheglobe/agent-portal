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

const StudentEditPage = () => {
  const { id } = useParams();
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
          setFormData({
            name: foundStudent.name || '',
            email: foundStudent.email || '',
            phone: foundStudent.phone || '',
            country: foundStudent.country || '',
            courseInterested: foundStudent.courseInterested || '',
            currentEducation: foundStudent.currentEducation || '',
            additionalInfo: foundStudent.additionalInfo || '',
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
    <div className="space-y-6" data-testid="student-edit-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/students')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Students
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground font-['Outfit']">
              Edit Student
            </h1>
            <p className="text-muted-foreground">Update student registration information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            data-testid="save-student-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-['Outfit']">Personal Information</CardTitle>
                <CardDescription>
                  Update the student's personal details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter student's full name"
                      data-testid="student-name-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="student@example.com"
                      data-testid="student-email-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+1234567890"
                      data-testid="student-phone-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="United States"
                      data-testid="student-country-input"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Academic Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-['Outfit']">Academic Information</CardTitle>
                <CardDescription>
                  Update the student's academic details and interests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="courseInterested">Course Interest *</Label>
                    <Input
                      id="courseInterested"
                      value={formData.courseInterested}
                      onChange={(e) => handleInputChange('courseInterested', e.target.value)}
                      placeholder="e.g., Computer Science, Business"
                      data-testid="student-course-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentEducation">Current Education</Label>
                    <Input
                      id="currentEducation"
                      value={formData.currentEducation}
                      onChange={(e) => handleInputChange('currentEducation', e.target.value)}
                      placeholder="e.g., High School, Bachelor's Degree"
                      data-testid="student-education-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Additional Information</Label>
                  <Textarea
                    id="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                    placeholder="Any additional notes or information about the student..."
                    rows={3}
                    data-testid="student-additional-input"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Assignment Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-['Outfit']">Assignment</CardTitle>
                <CardDescription>
                  Update event and agent assignments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eventId">Event *</Label>
                  <Select
                    value={formData.eventId}
                    onValueChange={(value) => handleInputChange('eventId', value)}
                    data-testid="event-select"
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="agentId">Assigned Agent *</Label>
                  <Select
                    value={formData.agentId}
                    onValueChange={(value) => handleInputChange('agentId', value)}
                    data-testid="agent-select"
                  >
                    <SelectTrigger>
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

            {/* Form Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-['Outfit']">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="submit-student-form"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
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
