import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Phone, Mail, User, BookOpen, Globe, Clock, Upload, FileText, Download, Trash2, Plus, Check, X, Shield, AlertCircle, Edit, Eye } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { studentAPI, formatApiError } from '../../utils/api';

const StudentDetailsPage = () => {
  const { studentId: id } = useParams();
  const navigate = useNavigate();
  const { students, events, agents, getStudentById, uploadStudentDocument, updateStudentStatus, verifyStudentDocument } = useData();
  const { isAdmin, isAgent } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('Other');
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

  const event = useMemo(() => {
    if (!student?.eventId) return null;
    return events.find(e => e.id === student.eventId || e._id === student.eventId);
  }, [events, student?.eventId]);

  const agent = useMemo(() => {
    if (!student?.agentId) return null;
    return agents.find(a => a.id === student.agentId || a._id === student.agentId);
  }, [agents, student?.agentId]);

  const requiredDocs = useMemo(() => {
    const DEFAULT_DOC_CATEGORIES = [
      { label: 'Passport', value: 'Passport', mandatory: true },
      { label: 'Academic Transcripts', value: 'Transcript', mandatory: true },
      { label: 'Language Test', value: 'LanguageTest', mandatory: false }
    ];
    return event?.requiredDocuments || DEFAULT_DOC_CATEGORIES;
  }, [event]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(isAdmin() ? '/admin/students' : '/agent/students')}>
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
          <Button variant="ghost" onClick={() => navigate(isAdmin() ? '/admin/students' : '/agent/students')}>
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
    // 1. Try legacy fields as priority (direct properties)
    if (fallbackKey && student[fallbackKey]) {
      return student[fallbackKey];
    }
    if (student[fieldKey]) {
      return student[fieldKey];
    }

    // 2. Try to find in custom fields by label matching
    if (event?.formFields) {
      const field = event.formFields.find(f => 
        f.label.toLowerCase().trim() === fieldKey.toLowerCase().trim() || 
        (fallbackKey && f.label.toLowerCase().trim() === fallbackKey.toLowerCase().trim()) ||
        // Check for partial matches like "Full Name" matching "name"
        f.label.toLowerCase().includes(fieldKey.toLowerCase())
      );
      
      if (field && student.customFields && (student.customFields[field.id] || student.customFields[`field_${field.id}`])) {
        return student.customFields[field.id] || student.customFields[`field_${field.id}`];
      }
    }

    // 3. Try custom fields directly by key
    if (student.customFields && student.customFields[fieldKey]) {
      return student.customFields[fieldKey];
    }

    return 'Not specified';
  };

  // Get all custom fields and format them for display
  const getFormattedCustomFields = () => {
    if (!student.customFields) return [];

    const fields = [];

    // Define standard field keys to skip in the "Other" section
    const standardFieldKeys = ['name', 'email', 'phone', 'country', 'education', 'courseInterested', 'notes'];
    
    // Also skip fields that are already matched by label in standard sections
    const standardLabels = ['Full Name', 'Email Address', 'Phone Number', 'Country of Interest', 'Target Course', 'Education Level', 'Internal Notes'];

    Object.entries(student.customFields).forEach(([key, value]) => {
      if (!value) return;

      // Find the label from event formFields if possible
      const fieldId = key.replace(/^field_/, '');
      const formField = event?.formFields?.find(f => f.id === fieldId || `field_${f.id}` === key);
      
      const label = formField ? formField.label : key.replace(/^field_/, '').replace(/_/g, ' ');

      // Skip if it's a standard field or already displayed
      const isStandardKey = standardFieldKeys.includes(key);
      const isStandardLabel = standardLabels.some(l => label.toLowerCase().includes(l.toLowerCase()));

      if (!isStandardKey && !isStandardLabel) {
        fields.push({
          key: label,
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

      const result = await uploadStudentDocument(student.id, file, selectedCategory);

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
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up URL
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      toast.error('Failed to download document', { description: formatApiError(error) });
    }
  };

  // Handle document preview
  const handleViewDocument = async (docId, filename) => {
    try {
      const response = await studentAPI.downloadDocument(student.id, docId, { inline: 'true' });

      // Create blob from response with the correct MIME type
      const contentType = response.headers['content-type'];
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      // Open in new tab
      window.open(url, '_blank');

      // Note: We don't revokeObjectURL immediately because the new tab needs it
      // In a real app, you might want to track these and revoke them later
    } catch (error) {
      toast.error('Failed to view document', { description: formatApiError(error) });
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

  const handleVerifyDocument = async (docId, status) => {
    const remarks = status === 'rejected' ? prompt('Enter reason for rejection:') : '';
    if (status === 'rejected' && remarks === null) return;

    try {
      const updatedStudent = await verifyStudentDocument(student.id, docId, { status, remarks });
      setStudent(updatedStudent);
      toast.success(`Document ${status}`);
    } catch (error) {
      console.error('Error verifying document:', error);
    }
  };

  const getDocStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1"><Check className="w-3 h-3" /> Approved</Badge>;
      case 'rejected': return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" /> Rejected</Badge>;
      default: return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
    }
  };

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen space-y-8" data-testid="student-details-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="sm"
            className="mt-1 h-9 border-[#E5E7EB] bg-white hover:bg-gray-50"
            onClick={() => navigate(isAdmin() ? '/admin/students' : '/agent/students')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
              Student Profile
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <Badge className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border-none",
                student.status === 'Registered' ? 'bg-blue-100 text-blue-700' :
                  student.status === 'Contacted' ? 'bg-yellow-100 text-yellow-700' :
                    student.status === 'Confirmed' ? 'bg-purple-100 text-purple-700' :
                      student.status === 'Attended' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-pink-100 text-pink-700'
              )}>
                {student.status || 'Registered'}
              </Badge>
              <span className="text-xs font-medium text-[#6B7280]">
                ID: {student.id?.slice(-8).toUpperCase()} · Joined {formatDate(student.submittedAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            className="h-10 px-6 bg-[#042C53] hover:bg-[#0C447C] font-bold rounded-lg shadow-sm"
            onClick={() => navigate(isAdmin() ? `/admin/students/${student.id}/edit` : `/agent/events/${student.eventId}`)}
          >
            {isAdmin() ? <Edit className="w-4 h-4 mr-2" /> : null}
            {isAdmin() ? 'Edit Student' : 'Back to Event'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Information Card */}
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4">
              <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                <User className="w-4 h-4 text-[#042C53]" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Full Name</label>
                  <p className="text-sm font-semibold text-[#111827]">{getStudentFieldValue('name', 'name')}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Email Address</label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    <p className="text-sm font-medium text-[#111827]">{getStudentFieldValue('email', 'email')}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Phone Number</label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    <p className="text-sm font-medium text-[#111827]">{getStudentFieldValue('phone', 'phone')}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Country of Interest</label>
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    <span className="text-sm font-medium text-[#111827]">{getStudentFieldValue('country', 'country')}</span>
                  </div>
                </div>
              </div>

              {/* Display additional custom fields */}
              {getFormattedCustomFields().length > 0 && (
                <>
                  <Separator className="my-6 bg-[#F3F4F6]" />
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {getFormattedCustomFields().map((field, index) => (
                        <div key={index} className="space-y-1">
                          <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider capitalize">
                            {field.key}
                          </label>
                          <p className="text-sm font-medium text-[#111827]">{field.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Academic Information Card */}
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4">
              <CardTitle className="text-base font-semibold font-['Outfit'] flex items-center gap-2 text-[#111827]">
                <BookOpen className="w-4 h-4 text-[#042C53]" />
                Academic Background
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Target Course</label>
                  <p className="text-sm font-semibold text-[#111827]">{getStudentFieldValue('courseInterested', 'courseInterested')}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Education Level</label>
                  <p className="text-sm font-medium text-[#111827]">{getStudentFieldValue('education', 'education')}</p>
                </div>
              </div>
              {(getStudentFieldValue('notes', 'notes') && getStudentFieldValue('notes', 'notes') !== 'Not specified') && (
                <div className="mt-6 p-4 bg-[#F9FAFB] rounded-lg border border-[#F3F4F6]">
                  <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mb-2">Internal Notes</label>
                  <p className="text-sm text-[#4B5563] leading-relaxed">{getStudentFieldValue('notes', 'notes')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-8">
          {/* Event & Agent Context */}
          <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
            <div className="h-2 bg-[#042C53]" />
            <CardContent className="p-6 space-y-6">
              {event && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E6F1FB] flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-[#042C53]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Registered For</p>
                      <p className="text-sm font-bold text-[#111827] leading-tight mt-0.5">{event.title}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pl-13">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-[#9CA3AF] uppercase">Event Date</p>
                      <p className="text-xs font-semibold text-[#4B5563]">{formatDate(event.date)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-[#9CA3AF] uppercase">Location</p>
                      <p className="text-xs font-semibold text-[#4B5563] truncate">{event.location || 'Online'}</p>
                    </div>
                  </div>
                </div>
              )}

              <Separator className="bg-[#F3F4F6]" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EEEDFE] flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-[#3C3489]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Referring Agency</p>
                  <p className="text-sm font-bold text-[#111827] mt-0.5">{agent?.agencyName || 'Direct Registration'}</p>
                  <p className="text-[11px] text-[#6B7280]">{agent?.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents Section */}
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader className="border-b border-[#F3F4F6] px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold font-['Outfit'] text-[#111827]">
                Documents
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-bold bg-[#F9FAFB]">
                {student.documents?.length || 0} Total
              </Badge>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Documents List */}
              <div className="space-y-3">
                {student.documents && student.documents.length > 0 ? (
                  student.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="group p-3 border border-[#F3F4F6] rounded-xl hover:border-[#042C53] hover:bg-[#F9FAFB] transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                            <FileText className="w-4 h-4 text-[#6B7280]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#111827] truncate" title={doc.originalFilename}>
                              {doc.originalFilename}
                            </p>
                            <p className="text-[10px] text-[#9CA3AF] font-medium mt-0.5 uppercase">
                              {doc.category} · {formatFileSize(doc.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md text-[#6B7280] hover:text-[#042C53]"
                            onClick={() => handleViewDocument(doc.id, doc.originalFilename)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md text-[#6B7280] hover:text-[#042C53]"
                            onClick={() => handleDownloadDocument(doc.id, doc.originalFilename)}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        {getDocStatusBadge(doc.status)}
                        {isAdmin() && doc.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              className="h-6 text-[9px] font-bold bg-[#EAF3DE] text-[#27500A] border border-[#C0DD97] hover:bg-[#DCEFC0]"
                              onClick={() => handleVerifyDocument(doc.id, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              className="h-6 text-[9px] font-bold bg-[#FCEBEB] text-[#791F1F] border border-[#F7C1C1] hover:bg-[#FADADA]"
                              onClick={() => handleVerifyDocument(doc.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-[#F9FAFB] rounded-xl border border-dashed border-[#E5E7EB]">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-[#9CA3AF] opacity-40" />
                    <p className="text-xs font-semibold text-[#6B7280]">No documents yet</p>
                  </div>
                )}
              </div>

              {/* Upload Section */}
              <div className="pt-2">
                <div className="flex flex-col gap-3">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white focus:ring-1 focus:ring-[#042C53] outline-none"
                  >
                    {requiredDocs.map(doc => (
                      <option key={doc.value} value={doc.value}>{doc.label}</option>
                    ))}
                    <option value="Other">Other Category</option>
                  </select>

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
                    className="w-full h-10 bg-white border border-[#042C53] text-[#042C53] hover:bg-[#F0F7FF] font-bold text-xs"
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#042C53]" />
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 mr-2" />
                        Upload Document
                      </>
                    )}
                  </Button>
                </div>

                {uploading && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-bold text-[#6B7280] mb-1 uppercase tracking-wider">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5 bg-[#F3F4F6]" indicatorClassName="bg-[#042C53]" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lifecycle Status */}
          <Card className="border-[#E5E7EB] shadow-sm overflow-hidden">
            <CardHeader className="bg-[#F9FAFB] border-b border-[#F3F4F6] px-6 py-4">
              <CardTitle className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Update Pipeline Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <select
                value={student.status || 'Registered'}
                onChange={(e) => {
                  updateStudentStatus(student.id, e.target.value).then(res => setStudent(res));
                }}
                className={cn(
                  "w-full text-sm font-bold px-4 py-3 rounded-xl border appearance-none cursor-pointer focus:ring-2 focus:ring-[#042C53]/10 outline-none transition-all",
                  student.status === 'Registered' ? 'bg-[#E6F1FB] text-[#0C447C] border-[#B5D4F4]' :
                    student.status === 'Contacted' ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]' :
                      student.status === 'Confirmed' ? 'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]' :
                        student.status === 'Attended' ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]' :
                          'bg-[#FDF2F8] text-[#9D174D] border-[#FBCFE8]'
                )}
              >
                <option value="Registered">Status: Registered</option>
                <option value="Contacted">Status: Contacted</option>
                <option value="Confirmed">Status: Confirmed</option>
                <option value="Attended">Status: Attended</option>
                <option value="Converted">Status: Converted</option>
              </select>
              <p className="text-[10px] text-[#9CA3AF] mt-3 px-1">
                Last activity: {formatDateTime(student.updatedAt || student.submittedAt)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailsPage;
