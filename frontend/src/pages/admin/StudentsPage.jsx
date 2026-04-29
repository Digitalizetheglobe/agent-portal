import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Trash2, MoreHorizontal, Edit2, Eye } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
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
import { toast } from 'sonner';

const StudentsPage = () => {
  const { students, events, agents, deleteStudent, fetchStudents, loading } = useData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  // Fetch all students on component mount
  useEffect(() => {
    const loadStudents = async () => {
      try {
        await fetchStudents();
        console.log('Students loaded successfully:', students.length);
      } catch (error) {
        console.error('Error loading students (useEffect):', error);
        // toast.error('Failed to load students data');
      }
    };
    
    loadStudents();
  }, [fetchStudents, students.length]); // Include dependencies used in effect

  
  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  // Helper functions to get student data
  const getStudentName = (student) => {
    // Try standard fields first
    if (student.name) return student.name;
    if (student.customFields?.name) return student.customFields.name;
    
    // Check customFields as Map for standard name field
    if (student.customFields instanceof Map && student.customFields.has('name')) {
      return student.customFields.get('name');
    }
    
    // If customFields exists, try to find the first text-like field
    if (student.customFields && typeof student.customFields === 'object') {
      const fields = student.customFields instanceof Map 
        ? Array.from(student.customFields.entries())
        : Object.entries(student.customFields);
      
      // Look for fields that might contain names (exclude emails, phones, etc.)
      for (const [key, value] of fields) {
        if (value && typeof value === 'string' && 
            !value.includes('@') && // Not an email
            !value.match(/^\d+$/) && // Not just numbers
            !value.match(/^[+\d\s\-\(\)]+$/) && // Not a phone number
            key.includes('field_')) { // Dynamic form field
          return value;
        }
      }
      
      // Fallback: return the first string value from customFields
      for (const [key, value] of fields) {
        if (value && typeof value === 'string' && key.includes('field_')) {
          return value;
        }
      }
    }
    
    return 'N/A';
  };

  const getStudentPhone = (student) => {
    // Try standard fields first
    if (student.phone) return student.phone;
    if (student.customFields?.phone) return student.customFields.phone;
    
    // Check customFields as Map for standard phone field
    if (student.customFields instanceof Map && student.customFields.has('phone')) {
      return student.customFields.get('phone');
    }
    
    // If customFields exists, try to find phone-like field
    if (student.customFields && typeof student.customFields === 'object') {
      const fields = student.customFields instanceof Map 
        ? Array.from(student.customFields.entries())
        : Object.entries(student.customFields);
      
      for (const [key, value] of fields) {
        if (value && typeof value === 'string' && 
            value.match(/^[+\d\s\-\(\)]+$/) && // Phone number pattern
            key.includes('field_')) {
          return value;
        }
      }
    }
    
    return 'N/A';
  };

  // Filter students based on search and filters
  const filteredStudents = students.filter(student => {
    // If no search query, match all students for search
    const studentName = getStudentName(student);
    const studentPhone = getStudentPhone(student);
    const studentEmail = student.email || student.customFields?.email || student.customFields?.get?.('email') || '';
    const studentCountry = student.country || student.customFields?.country || student.customFields?.get?.('country') || '';
    
    const matchesSearch = !searchQuery || 
      studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentCountry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentPhone.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEvent = eventFilter === 'all' || student.eventId === eventFilter;
    // Handle null agentId for students registered by admin
    const matchesAgent = agentFilter === 'all' || 
                         (agentFilter === 'unassigned' && !student.agentId) ||
                         student.agentId === agentFilter;

    return matchesSearch && matchesEvent && matchesAgent;
  });

  // Debug logging
  console.log('Total students:', students.length);
  console.log('Filtered students:', filteredStudents.length);
  if (students[0]) {
    console.log('Sample student data:', students[0]);
    console.log('Student customFields:', students[0]?.customFields);
    console.log('CustomFields type:', typeof students[0]?.customFields);
    console.log('CustomFields is Map:', students[0]?.customFields instanceof Map);
    console.log('All student keys:', Object.keys(students[0]));
    if (students[0]?.customFields) {
      console.log('CustomFields keys:', Object.keys(students[0].customFields));
      if (students[0].customFields instanceof Map) {
        console.log('CustomFields Map entries:', Array.from(students[0].customFields.entries()));
      }
    }
  }

  const getEventName = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event?.title || 'Unknown';
  };

  const getAgentName = (agentId) => {
    if (!agentId) return 'Unassigned';
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setEventFilter('all');
    setAgentFilter('all');
  };

   const hasActiveFilters = searchQuery || eventFilter !== 'all' || agentFilter !== 'all';

  const handleDeleteStudent = (student) => {
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteStudent = async () => {
    if (studentToDelete) {
      try {
        await deleteStudent(studentToDelete.id);
        toast.success(`Student ${studentToDelete.name} has been deleted successfully.`);
        setDeleteDialogOpen(false);
        setStudentToDelete(null);
        // Refresh students data after deletion
        try {
          await fetchStudents();
        } catch (refreshError) {
          console.error('Error refreshing students after deletion:', refreshError);
          toast.error('Failed to refresh students data');
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        toast.error('Failed to delete student.');
      }
    }
  };

  const handleViewStudent = (student) => {
    // Navigate to student details page or open modal
    navigate(`/admin/students/${student.id}`);
  };

  const handleEditStudent = (student) => {
    // Navigate to edit student page or open modal
    navigate(`/admin/students/${student.id}/edit`);
  };

  return (
    <div className="space-y-6" data-testid="students-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-['Outfit']">
            Students
          </h1>
          <p className="text-muted-foreground mt-1">
            View all registered students
          </p>
        </div>
        <Badge variant="outline" className="self-start md:self-auto">
          {filteredStudents.length} of {students.length} students
        </Badge>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name, email, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="student-search-input"
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="event-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by Event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="agent-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  data-testid="clear-filters-btn"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card data-testid="students-table-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-['Outfit']">
            Student Registrations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Event</TableHead>
                  <TableHead className="font-medium">Student name</TableHead>
                  <TableHead className="font-medium w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {hasActiveFilters 
                          ? 'No students found matching your filters.' 
                          : 'No students registered yet.'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow 
                      key={student.id}
                      data-testid={`student-row-${student.id}`}
                    >
                      <TableCell>
                        <span className="text-sm">{getEventName(student.eventId)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                              {getStudentName(student) !== 'N/A' ? 
                                getStudentName(student).charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">{getStudentName(student)}</span>
                            <p className="text-xs text-muted-foreground">{getStudentPhone(student)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleViewStudent(student)}
                              data-testid={`view-student-${student.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleEditStudent(student)}
                              data-testid={`edit-student-${student.id}`}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteStudent(student)}
                              className="text-destructive focus:text-destructive"
                              data-testid={`delete-student-${student.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the registration for <strong>{studentToDelete?.name}</strong>? 
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

export default StudentsPage;
