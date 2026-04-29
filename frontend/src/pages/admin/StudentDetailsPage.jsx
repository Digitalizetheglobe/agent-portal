import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Phone, Mail, User, BookOpen, Globe, Clock, Upload, FileText, Download, Trash2, Plus } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { studentAPI, formatApiError } from '../../utils/api';

const StudentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { students, events, agents, getStudentById, uploadStudentDocument } = useData();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        let foundStudent = null;
        
        // Always try to fetch from API first for fresh data
        try {
          foundStudent = await getStudentById(id);
        } catch (apiError) {
          // Fallback to local state if API fails
          foundStudent = students.find(s => s.id === id);
          
          if (apiError.response?.status !== 404) {
            throw apiError;
          }
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

    fetchStudent();
  }, [id, getStudentById, students]);

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

  // Helper function to get student data from custom fields or legacy fields
  const getStudentFieldValue = (fieldKey, fallbackKey = null) => {
    // Try custom fields first
    if (student.customFields && student.customFields[fieldKey]) {
      return student.customFields[fieldKey];
    }
    
    // Try legacy fields as fallback
    if (fallbackKey && student[fallbackKey]) {
      return student[fallbackKey];
    }
    
    return 'Not specified';
  };

  // Get all custom fields and format them for display
  const getFormattedCustomFields = () => {
    if (!student.customFields) return [];
    
    const fields = [];
    
    // Add standard fields from customFields if they exist
    const standardFields = ['name', 'email', 'phone', 'country', 'education', 'courseInterested', 'notes'];
    
    Object.entries(student.customFields).forEach(([key, value]) => {
      if (!standardFields.includes(key) && value) {
        fields.push({
          key: key.replace(/^field_/, '').replace(/_/g, ' '),
          value: value
        });
      }
    });
    
    return fields;
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PDF, Word, image, or text files.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      const result = await uploadStudentDocument(student.id, file);
      
      // Update student data with new document
      const updatedStudent = await getStudentById(student.id);
      setStudent(updatedStudent);
      
      toast.success('Document uploaded successfully');
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Failed to upload document', { description: formatApiError(error) });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle document download
  const handleDownloadDocument = async (docId, filename) => {
    try {
      const response = await studentAPI.downloadDocument(student.id, docId);
      
      // Create blob from response
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download document', { description: formatApiError(error) });
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                  <p className="text-foreground font-medium">{getStudentFieldValue('name', 'name')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <p className="text-foreground">{getStudentFieldValue('email', 'email')}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <p className="text-foreground">{getStudentFieldValue('phone', 'phone')}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Country</label>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline">{getStudentFieldValue('country', 'country')}</Badge>
                  </div>
                </div>
              </div>
              
              {/* Display additional custom fields */}
              {getFormattedCustomFields().length > 0 && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-3 block">Additional Information</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getFormattedCustomFields().map((field, index) => (
                        <div key={index}>
                          <label className="text-sm font-medium text-muted-foreground capitalize">
                            {field.key}
                          </label>
                          <p className="text-foreground mt-1">{field.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
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
                  <p className="text-foreground">{getStudentFieldValue('courseInterested', 'courseInterested')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Education</label>
                  <p className="text-foreground">{getStudentFieldValue('education', 'education')}</p>
                </div>
              </div>
              {(getStudentFieldValue('notes', 'notes') && getStudentFieldValue('notes', 'notes') !== 'Not specified') && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Additional Notes</label>
                  <p className="text-foreground mt-1">{getStudentFieldValue('notes', 'notes')}</p>
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

          {/* Documents Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-['Outfit'] flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents
              </CardTitle>
              <CardDescription>
                Upload and manage student documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <h3 className="text-sm font-medium mb-1">Upload Document</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    PDF, Word, Images (Max 10MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    size="sm"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Choose File
                      </>
                    )}
                  </Button>
                </div>
                
                {uploading && (
                  <div className="mt-3">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">Uploading document...</p>
                  </div>
                )}
              </div>

              {/* Documents List */}
              {student.documents && student.documents.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Uploaded Documents ({student.documents.length})
                  </label>
                  {student.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.originalFilename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.size)} • {formatDateTime(doc.uploadedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadDocument(doc.id, doc.originalFilename)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                </div>
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
