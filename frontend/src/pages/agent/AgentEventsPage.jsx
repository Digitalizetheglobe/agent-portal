import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

const AgentEventsPage = () => {
  const { user } = useAuth();
  const { getEventsForAgent, getStudentsByAgent, agents } = useData();

  const assignedEvents = getEventsForAgent(user?.id);
  const myStudents = getStudentsByAgent(user?.id);

  const upcomingEvents = assignedEvents.filter(e => new Date(e.date) >= new Date());

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAgentNames = (agentIds) => {
    return agentIds.map(id => {
      const agent = agents.find(a => a.id === id);
      return agent?.name || 'Unknown';
    });
  };

  return (
    <div className="space-y-6" data-testid="agent-events-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-['Outfit']">
            My Events
          </h1>
          <p className="text-muted-foreground mt-1">
            Events assigned to you for student registration.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Assigned Events
                </p>
                <p className="text-3xl font-bold text-foreground mt-1 font-['Outfit']">
                  {assignedEvents.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total assigned
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Upcoming Events
                </p>
                <p className="text-3xl font-bold text-foreground mt-1 font-['Outfit']">
                  {upcomingEvents.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Still to come
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Registrations
                </p>
                <p className="text-3xl font-bold text-foreground mt-1 font-['Outfit']">
                  {myStudents.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Students submitted
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Events */}
      <Card data-testid="all-events-card">
        <CardHeader>
          <CardTitle className="text-lg font-['Outfit']">All Assigned Events</CardTitle>
          <CardDescription>
            Click on an event to register students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                No events assigned to you yet. Contact your admin to get assigned.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedEvents.map((event) => {
                const isUpcoming = new Date(event.date) >= new Date();
                const eventStudents = myStudents.filter(s => s.eventId === event.id);
                
                return (
                  <Link 
                    key={event.id} 
                    to={`/agent/events/${event.id}`}
                    data-testid={`agent-event-${event.id}`}
                  >
                    <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/30">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                          </div>
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
                        
                        <h3 className="font-semibold text-foreground mb-1">
                          {event.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {formatDate(event.date)}
                        </p>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {event.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {eventStudents.length} registrations
                            </span>
                          </div>
                          <Button variant="ghost" size="sm" className="text-primary">
                            Open <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>

                        {/* Other agents */}
                        {event.assignedAgents.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                              Also assigned: {getAgentNames(event.assignedAgents.filter(id => id !== user?.id)).join(', ')}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentEventsPage;
