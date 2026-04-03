import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
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

const StudentsPage = () => {
  const { students, events, agents } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  // Filter students based on search and filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.country.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEvent = eventFilter === 'all' || student.eventId === eventFilter;
    const matchesAgent = agentFilter === 'all' || student.agentId === agentFilter;

    return matchesSearch && matchesEvent && matchesAgent;
  });

  const getEventName = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event?.title || 'Unknown';
  };

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setEventFilter('all');
    setAgentFilter('all');
  };

  const hasActiveFilters = searchQuery || eventFilter !== 'all' || agentFilter !== 'all';

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
                  <TableHead className="font-medium">Name</TableHead>
                  <TableHead className="font-medium">Email</TableHead>
                  <TableHead className="font-medium">Country</TableHead>
                  <TableHead className="font-medium">Event</TableHead>
                  <TableHead className="font-medium">Agent</TableHead>
                  <TableHead className="font-medium">Course Interest</TableHead>
                  <TableHead className="font-medium">Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
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
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                              {student.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">{student.name}</span>
                            <p className="text-xs text-muted-foreground">{student.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.country}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getEventName(student.eventId)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getAgentName(student.agentId)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {student.courseInterested}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(student.submittedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentsPage;
