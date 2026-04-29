import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Calendar, Users, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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

const AgentEventsManagementPage = () => {
  const { user } = useAuth();
  const { events, agents, getStudentsByEvent } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter events assigned to this agent
  const assignedEvents = events.filter(event => 
    event.assignedAgents.includes(user?.id)
  );

  // Filter events based on search
  const filteredEvents = assignedEvents.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAgentNames = (agentIds) => {
    return agentIds.map(id => {
      const agent = agents.find(a => a.id === id);
      return agent?.name || 'Unknown';
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isUpcoming = (dateStr) => {
    return new Date(dateStr) >= new Date();
  };

  const getStudentCount = (eventId) => {
    return getStudentsByEvent(eventId).length;
  };

  return (
    <div className="space-y-6" data-testid="agent-events-management-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-['Outfit']">
            Events Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage events allocated to you
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
                  Total Events
                </p>
                <p className="text-3xl font-bold text-foreground mt-1 font-['Outfit']">
                  {assignedEvents.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assigned to you
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
                  {assignedEvents.filter(e => isUpcoming(e.date)).length}
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
                  {assignedEvents.reduce((total, event) => total + getStudentCount(event.id), 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all events
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search events by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="event-search-input"
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card data-testid="events-table-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-['Outfit']">
            Your Events ({filteredEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-medium">Title</TableHead>
                  <TableHead className="font-medium">Date</TableHead>
                  <TableHead className="font-medium">Assigned Agents</TableHead>
                  <TableHead className="font-medium">Registrations</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchQuery ? 'No events found matching your search.' : 'No events assigned to you yet.'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow 
                      key={event.id}
                      data-testid={`event-row-${event.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <span className="font-medium">{event.title}</span>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(event.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getAgentNames(event.assignedAgents).slice(0, 2).map((name, idx) => (
                            <Badge 
                              key={idx} 
                              variant={name === user?.name ? "default" : "outline"} 
                              className="text-xs"
                            >
                              {name}
                            </Badge>
                          ))}
                          {event.assignedAgents.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{event.assignedAgents.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{getStudentCount(event.id)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={isUpcoming(event.date) ? 'default' : 'secondary'}
                          className={isUpcoming(event.date) 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }
                        >
                          {isUpcoming(event.date) ? 'Upcoming' : 'Past'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          asChild
                          data-testid={`view-event-${event.id}`}
                        >
                          <Link to={`/agent/events/${event.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Link>
                        </Button>
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

export default AgentEventsManagementPage;
