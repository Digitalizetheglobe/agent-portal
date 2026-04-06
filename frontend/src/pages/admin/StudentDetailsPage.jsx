import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Phone, Mail, User, BookOpen, Globe, Clock } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';

const StudentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { students, events, agents, getStudentById } = useData();
  const [activeTab, setActiveTab] = useState('details');
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const event = events.find(e => e.id === student.eventId);
  const agent = agents.find(a => a.id === student.agentId);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6" data-testid="student-details-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/students')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Students
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground font-['Outfit']">
              Student Details
            </h1>
            <p className="text-muted-foreground">View student registration information</p>
          </div>
        </div>
        <Button onClick={() => navigate(`/admin/students/${student.id}/edit`)}>
          Edit Student
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-['Outfit'] flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-foreground font-medium">{student.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <p className="text-foreground">{student.email}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <p className="text-foreground">{student.phone}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Country</label>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline">{student.country}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-['Outfit'] flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Course Interest</label>
                  <p className="text-foreground">{student.courseInterested}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Education</label>
                  <p className="text-foreground">{student.currentEducation || 'Not specified'}</p>
                </div>
              </div>
              {student.additionalInfo && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Additional Information</label>
                  <p className="text-foreground mt-1">{student.additionalInfo}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Registration Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-['Outfit'] flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Registration Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Registration Date</label>
                  <p className="text-foreground">{formatDateTime(student.submittedAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned Agent</label>
                  <p className="text-foreground">{agent?.name || 'Unknown'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Event Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-['Outfit'] flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {event ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Event Name</label>
                    <p className="text-foreground font-medium">{event.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Event Date</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="text-foreground">{formatDate(event.date)}</p>
                    </div>
                  </div>
                  {event.location && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Location</label>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <p className="text-foreground">{event.location}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-foreground text-sm mt-1">{event.description}</p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Assigned Agents</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {event.assignedAgents.map(agentId => {
                        const assignedAgent = agents.find(a => a.id === agentId);
                        return assignedAgent ? (
                          <Badge key={agentId} variant="secondary">
                            {assignedAgent.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Event information not available</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-['Outfit']">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate(`/admin/events/${student.eventId}`)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                View Event
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate(`/admin/students/${student.id}/edit`)}
              >
                Edit Student
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailsPage;
