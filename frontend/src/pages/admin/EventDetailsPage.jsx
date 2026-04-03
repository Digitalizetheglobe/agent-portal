import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, GraduationCap, ClipboardList } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import StudentForm from '../../components/forms/StudentForm';

const EventDetailsPage = () => {
  const { eventId } = useParams();
  const { getEventById, agents, getStudentsByEvent } = useData();
  const { isAdmin } = useAuth();
  
  const event = getEventById(eventId);
  const students = getStudentsByEvent(eventId);

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

  const isUpcoming = new Date(event.date) >= new Date();

  return (
    <div className="space-y-6" data-testid="event-details-page">
      {/* Back Button */}
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link to={isAdmin() ? '/admin/events' : '/agent/dashboard'}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {isAdmin() ? 'Events' : 'Dashboard'}
          </Link>
        </Button>
      </div>

      {/* Event Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground font-['Outfit']">
              {event.title}
            </h1>
            <Badge 
              variant={isUpcoming ? 'default' : 'secondary'}
              className={isUpcoming 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }
            >
              {isUpcoming ? 'Upcoming' : 'Past'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(event.date)}</span>
          </div>
        </div>
      </div>

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
                            {agent.name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm">{agent.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Registered Students */}
          <Card data-testid="event-students-card">
            <CardHeader>
              <CardTitle className="text-lg font-['Outfit'] flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Registered Students ({students.length})
              </CardTitle>
              <CardDescription>
                Students who have registered for this event
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {students.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No students registered yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-medium">Name</TableHead>
                        <TableHead className="font-medium">Email</TableHead>
                        <TableHead className="font-medium">Country</TableHead>
                        <TableHead className="font-medium">Course Interest</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id} data-testid={`event-student-${student.id}`}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell className="text-muted-foreground">{student.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{student.country}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {student.courseInterested}
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
          <Card data-testid="student-form-card">
            <CardHeader>
              <CardTitle className="text-lg font-['Outfit'] flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Register Student
              </CardTitle>
              <CardDescription>
                Fill in the details to register a new student for this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StudentForm eventId={eventId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;
