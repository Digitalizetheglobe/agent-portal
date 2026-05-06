import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, GraduationCap, ClipboardList, MapPin, Armchair, Edit, Trash2, Plus, Eye } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import DynamicStudentForm from '../../components/forms/DynamicStudentForm';
import FormFieldBuilder from '../../components/forms/FormFieldBuilder';
import { Progress } from '../../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const EventDetailsPage = () => {
  const { eventId } = useParams();
  const { getEventById, agents, getStudentsByEvent, updateEvent, deleteEvent, deleteStudent, fetchStudentsForEvent, updateStudentStatus } = useData();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [formBuilderOpen, setFormBuilderOpen] = useState(false);
  const [formFields, setFormFields] = useState([]);
  const [editingField, setEditingField] = useState(null);
  const [fieldEditOpen, setFieldEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [editingStudent, setEditingStudent] = useState(null);
  const [isStudentEditModalOpen, setIsStudentEditModalOpen] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState(null);
  const [isStudentDeleteAlertOpen, setIsStudentDeleteAlertOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const event = getEventById(eventId);
  const students = getStudentsByEvent(eventId);
  const [filledSeats, setFilledSeats] = useState(0);
  const [availableSeats, setAvailableSeats] = useState(0);
  const [seatUtilization, setSeatUtilization] = useState(0);

  const seatCapacity = event?.seatCapacity || 0;

  // Initial data load for this specific event
  React.useEffect(() => {
    if (event && !isAdmin()) {
      // For agents, load all students for this specific event
      fetchStudentsForEvent(eventId);
    }
  }, [event, eventId, isAdmin]);

  // Update seat counts when students or seat capacity changes
  React.useEffect(() => {
    const newFilledSeats = students.length;
    const newAvailableSeats = seatCapacity - newFilledSeats;
    const newSeatUtilization = seatCapacity > 0 ? (newFilledSeats / seatCapacity) * 100 : 0;

    setFilledSeats(newFilledSeats);
    setAvailableSeats(newAvailableSeats);
    setSeatUtilization(newSeatUtilization);
  }, [students, seatCapacity]);

  // Initialize form fields when event loads
  React.useEffect(() => {
    if (event?.formFields) {
      setFormFields(event.formFields);
    }
  }, [event]);

  if (!event) {
    return <Navigate to={isAdmin() ? '/admin/events' : '/agent/dashboard'} replace />;
  }

  const assignedAgents = event.assignedAgents.map(id =>
    agents.find(a => a.id === id)
  ).filter(Boolean);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStudentValue = (student, key, fallbackLabel) => {
    if (!student) return 'N/A';
    
    // Direct property
    if (student[key] && student[key] !== 'Not specified') return student[key];
    
    // Custom field by exact key
    if (student.customFields?.[key]) return student.customFields[key];
    
    // Custom field by label lookup
    if (event?.formFields) {
      const field = event.formFields.find(f => 
        f.label.toLowerCase().trim() === fallbackLabel.toLowerCase().trim() ||
        f.label.toLowerCase().includes(fallbackLabel.toLowerCase())
      );
      if (field) {
        const val = student.customFields?.[field.id] || student.customFields?.[`field_${field.id}`];
        if (val) return val;
      }
    }
    
    return 'N/A';
  };

  const isUpcoming = new Date(event.date) >= new Date();

  const handleSaveFormFields = () => {
    updateEvent(event.id, { formFields });
    setFormBuilderOpen(false);
  };

  const handleEditField = (field) => {
    setEditingField({ ...field });
    setFieldEditOpen(true);
  };

  const handleSaveFieldEdit = () => {
    const updatedFields = formFields.map(f =>
      f.id === editingField.id ? editingField : f
    );
    setFormFields(updatedFields);
    updateEvent(event.id, { formFields: updatedFields });
    setFieldEditOpen(false);
    setEditingField(null);
  };

  const handleDeleteField = (fieldId) => {
    const updatedFields = formFields.filter(f => f.id !== fieldId);
    setFormFields(updatedFields);
    updateEvent(event.id, { formFields: updatedFields });
  };

  const handleDeleteEvent = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDeleteEvent = async () => {
    try {
      await deleteEvent(event.id);
      toast.success(`Event "${event.title}" has been deleted successfully.`);
      navigate('/admin/events');
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Student operations
  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setIsStudentEditModalOpen(true);
  };

  const handleDeleteStudent = (studentId) => {
    setDeletingStudentId(studentId);
    setIsStudentDeleteAlertOpen(true);
  };

  const confirmDeleteStudent = async () => {
    try {
      await deleteStudent(deletingStudentId);
      toast.success('Student has been deleted successfully.');
      setIsStudentDeleteAlertOpen(false);
      setDeletingStudentId(null);
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student.');
    }
  };

  const handleStatusChange = async (studentId, newStatus) => {
    setUpdatingStatus(studentId);
    try {
      await updateStudentStatus(studentId, newStatus);
      toast.success('Student status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Registered': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Contacted': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Confirmed': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Attended': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Converted': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 bg-[#F9FAFB] min-h-screen" data-testid="event-details-page">
      {/* Back Button */}
      {/* <div>
        <Button variant="ghost" asChild className="mb-6 hover:bg-gray-100 text-[#042C53] font-bold text-xs uppercase tracking-widest">
          <Link to={isAdmin() ? '/admin/events' : '/agent/dashboard'}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {isAdmin() ? 'Registry' : 'Dashboard'}
          </Link>
        </Button>
      </div> */}

      {/* Event Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
              {event.title}
            </h1>
            <Badge
              variant="outline"
              className={`text-[10px] px-3 py-1 border-none font-bold uppercase tracking-widest ${isUpcoming
                ? 'bg-[#E0E7FF] text-[#3730A3]'
                : 'bg-gray-100 text-gray-500'
                }`}
            >
              {isUpcoming ? 'Active Campaign' : 'Concluded'}
            </Badge>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#042C53]">
                <Calendar className="w-4 h-4" />
              </div>
              <span>{formatDate(event.date)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-[#042C53]">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seat Tracking */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-4 px-7 pt-7 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-[#111827] font-['Outfit'] flex items-center gap-2">
                <Armchair className="w-5 h-5 text-[#042C53]" />
                Institutional Capacity
              </CardTitle>
              <CardDescription className="text-sm font-medium mt-1">
                Real-time seat utilization across all collaborative agency partners.
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-[#042C53] bg-[#F0F7FF] px-3 py-1 rounded-full border border-[#D0E7FF]">
                {Math.round(seatUtilization)}% Occupancy
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-7">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Utilization Progress</span>
                <span className="text-[11px] font-bold text-[#111827]">
                  {filledSeats} / {seatCapacity} Seats Allocated
                </span>
              </div>
              <Progress value={seatUtilization} className="h-2.5 bg-gray-100" indicatorClassName="bg-[#042C53]" />
            </div>

            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Seats Filled', value: filledSeats, color: 'text-[#059669]', bgColor: 'bg-[#ECFDF5]' },
                { label: 'Available', value: availableSeats, color: 'text-[#185FA5]', bgColor: 'bg-[#E6F1FB]' },
                { label: 'Total Budget', value: seatCapacity, color: 'text-[#534AB7]', bgColor: 'bg-[#EEEDFE]' }
              ].map((item, idx) => (
                <div key={idx} className={`p-4 rounded-2xl ${item.bgColor} border border-white shadow-sm`}>
                  <p className={`text-2xl font-bold ${item.color} font-['Outfit']`}>{item.value}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Event Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Description */}
          <Card data-testid="event-info-card">
            <CardHeader>
              <CardTitle className="text-lg font-['Outfit']">Event Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {event.description}
              </p>

              <Separator className="my-4" />

              {/* Assigned Agents */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Assigned Agents ({assignedAgents.length})
                </h4>
                {assignedAgents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No agents assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {assignedAgents.map(agent => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary text-xs font-medium">
                            {agent.name?.charAt(0) || 'A'}
                          </span>
                        </div>
                        <span className="text-sm">{agent.name || 'Agency Partner'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Custom Form Fields */}
          {isAdmin() && (
            <Card data-testid="form-fields-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-['Outfit']">Custom Registration Form</CardTitle>
                  <Dialog open={formBuilderOpen} onOpenChange={setFormBuilderOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Form
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Customize Registration Form</DialogTitle>
                        <DialogDescription>
                          Create custom fields for student registration
                        </DialogDescription>
                      </DialogHeader>
                      <FormFieldBuilder
                        value={formFields}
                        onChange={setFormFields}
                      />
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setFormBuilderOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveFormFields}>
                          Save Form Fields
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {formFields.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                    <p className="text-muted-foreground">
                      No custom fields added yet. Click "Edit Form" to create custom registration fields.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formFields
                      .sort((a, b) => a.order - b.order)
                      .map((field) => (
                        <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{field.label}</span>
                              {field.required && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {field.type}
                              </Badge>
                              {field.regex && (
                                <Badge variant="secondary" className="text-xs">
                                  Regex
                                </Badge>
                              )}
                              {field.placeholder && (
                                <span className="text-xs text-muted-foreground">
                                  {field.placeholder}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditField(field)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteField(field.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Registered Students */}
          <Card className="border border-gray-200 shadow-sm overflow-hidden" data-testid="event-students-card">
            <CardHeader className="pb-4 px-7 pt-7 border-b border-gray-100 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-[#111827] font-['Outfit'] flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-[#042C53]" />
                    Candidate Roster ({students.length})
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Institutional log of all registered campaign participants.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {students.length === 0 ? (
                <div className="p-16 text-center bg-white">
                  <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No active registrations recorded.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F9FAFB] border-b border-gray-100">
                        <TableHead className="py-4 px-7 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Candidate</TableHead>
                        <TableHead className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Management</TableHead>
                        <TableHead className="py-4 px-7 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow
                          key={student.id}
                          data-testid={`event-student-${student.id}`}
                          className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0 bg-white"
                        >
                          <TableCell className="py-5 px-7">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                <span className="text-slate-500 font-bold text-xs uppercase">
                                  {getStudentValue(student, 'name', 'Full Name')?.charAt(0) || 'S'}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-sm font-bold text-[#111827] block truncate">
                                  {getStudentValue(student, 'name', 'Full Name') === 'N/A' ? 'Candidate' : getStudentValue(student, 'name', 'Full Name')}
                                </span>
                                <p className="text-[10px] text-muted-foreground font-semibold tracking-widest mt-0.5 opacity-80">
                                  {getStudentValue(student, 'email', 'Email Address')}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-5 px-6">
                            <select
                              value={student.status || 'Registered'}
                              onChange={(e) => handleStatusChange(student.id, e.target.value)}
                              disabled={updatingStatus === student.id || !isAdmin()}
                              className={cn(
                                "text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border-none focus:ring-0 cursor-pointer transition-all",
                                student.status === 'Converted' ? "bg-emerald-100 text-emerald-700" :
                                  student.status === 'Confirmed' ? "bg-purple-100 text-purple-700" :
                                    student.status === 'Attended' ? "bg-blue-100 text-blue-700" :
                                      "bg-gray-100 text-gray-600"
                              )}
                            >
                              <option value="Registered">Registered</option>
                              <option value="Contacted">Contacted</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Attended">Attended</option>
                              <option value="Converted">Converted</option>
                            </select>
                          </TableCell>
                          <TableCell className="py-5 px-7 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-[#042C53] hover:bg-[#F0F7FF] rounded-lg"
                                onClick={() => navigate(`${isAdmin() ? '/admin' : '/agent'}/students/${student.id}`)}
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-[#042C53] hover:bg-[#F0F7FF] rounded-lg"
                                onClick={() => handleEditStudent(student)}
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                onClick={() => handleDeleteStudent(student.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Student Registration Form */}
        <div className="lg:col-span-1">
          <Card className="border border-gray-200 shadow-sm overflow-hidden bg-white sticky top-8" data-testid="student-form-card">
            <CardHeader className="pb-4 px-7 pt-7 border-b border-gray-100">
              <CardTitle className="text-lg font-bold text-[#111827] font-['Outfit'] flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#042C53]" />
                Direct Onboarding
              </CardTitle>
              <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                Manually register a new candidate for this campaign.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-7">
              <DynamicStudentForm eventId={eventId} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Field Edit Dialog */}
      <Dialog open={fieldEditOpen} onOpenChange={setFieldEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
            <DialogDescription>
              Edit the properties of this form field
            </DialogDescription>
          </DialogHeader>
          {editingField && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="field-label">Field Label</Label>
                <Input
                  id="field-label"
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                  placeholder="Enter field label"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-placeholder">Placeholder</Label>
                <Input
                  id="field-placeholder"
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                  placeholder="Enter placeholder text"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-type">Field Type</Label>
                <select
                  id="field-type"
                  value={editingField.type}
                  onChange={(e) => setEditingField({ ...editingField, type: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="text">Text</option>
                  <option value="paragraph">Paragraph</option>
                  <option value="radio">Radio</option>
                  <option value="date">Date</option>
                  <option value="select">Select</option>
                </select>
              </div>

              {(editingField.type === 'radio' || editingField.type === 'select') && (
                <div className="space-y-2">
                  <Label htmlFor="field-options">Options (comma separated)</Label>
                  <Input
                    id="field-options"
                    value={editingField.options ? editingField.options.join(', ') : ''}
                    onChange={(e) => setEditingField({
                      ...editingField,
                      options: e.target.value.split(',').map(opt => opt.trim()).filter(Boolean)
                    })}
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="field-required"
                  checked={editingField.required}
                  onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                />
                <Label htmlFor="field-required">Required field</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-regex">Regex Validation (optional)</Label>
                <Input
                  id="field-regex"
                  value={editingField.regex || ''}
                  onChange={(e) => setEditingField({ ...editingField, regex: e.target.value })}
                  placeholder="e.g., ^[0-9]{10}$ for 10-digit phone"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a regex pattern for custom validation. Leave empty for no validation.
                </p>
              </div>

              {editingField.regex && (
                <div className="space-y-2">
                  <Label htmlFor="field-regex-error">Error Message</Label>
                  <Input
                    id="field-regex-error"
                    value={editingField.regexError || 'Invalid format'}
                    onChange={(e) => setEditingField({ ...editingField, regexError: e.target.value })}
                    placeholder="Error message for invalid format"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFieldEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the event <strong>{event?.title}</strong>?
              This will also remove all student registrations associated with this event.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Student Edit Dialog */}
      <Dialog open={isStudentEditModalOpen} onOpenChange={setIsStudentEditModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the student's information
            </DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <DynamicStudentForm
              eventId={eventId}
              studentData={editingStudent}
              onSuccess={() => {
                setIsStudentEditModalOpen(false);
                setEditingStudent(null);
                toast.success('Student information updated successfully.');
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Student Delete Confirmation Dialog */}
      <AlertDialog open={isStudentDeleteAlertOpen} onOpenChange={setIsStudentDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this student?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStudent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventDetailsPage;
