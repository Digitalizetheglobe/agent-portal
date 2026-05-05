import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Calendar, Users, GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
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
    <div className="space-y-8 p-4 md:p-8 bg-[#F9FAFB] min-h-screen" data-testid="agent-events-management-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
            Events Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Strategic overview and administration of your assigned recruitment events.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { title: 'Total Events', value: assignedEvents.length, trend: 'Assigned to you', icon: Calendar, color: 'text-[#534AB7]', bgColor: 'bg-[#EEEDFE]' },
          { title: 'Upcoming Events', value: assignedEvents.filter(e => isUpcoming(e.date)).length, trend: 'Still to come', icon: Users, color: 'text-[#185FA5]', bgColor: 'bg-[#E6F1FB]' },
          { title: 'Total Registrations', value: assignedEvents.reduce((total, event) => total + getStudentCount(event.id), 0), trend: 'Across all events', icon: GraduationCap, color: 'text-[#059669]', bgColor: 'bg-[#ECFDF5]' }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" strokeWidth={2} />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-bold text-[#111827] font-['Outfit']">
                    {stat.value}
                  </h3>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {stat.trend}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search events by title, location or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="event-search-input"
              className="pl-14 py-7 border-none rounded-none focus-visible:ring-0 text-sm font-medium placeholder:text-muted-foreground/60"
            />
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card className="border border-gray-200 shadow-sm overflow-hidden" data-testid="events-table-card">
        <CardHeader className="pb-4 px-7 pt-7 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-[#111827] font-['Outfit']">
                Active Assignments ({filteredEvents.length})
              </CardTitle>
              <CardDescription className="text-sm font-medium mt-1">Detailed list of recruitment events allocated to your agency.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] border-b border-gray-100">
                  <TableHead className="py-4 px-7 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Event Details</TableHead>
                  <TableHead className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date & Venue</TableHead>
                  <TableHead className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Agency Team</TableHead>
                  <TableHead className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Registrations</TableHead>
                  <TableHead className="py-4 px-6 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="py-4 px-7 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <Calendar className="w-10 h-10 text-muted-foreground/20" />
                        <p className="text-sm font-medium text-muted-foreground">
                          {searchQuery ? 'No matching events found.' : 'Your event queue is currently empty.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow 
                      key={event.id}
                      data-testid={`event-row-${event.id}`}
                      className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <TableCell className="py-5 px-7">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] flex items-center justify-center text-[#042C53] shrink-0">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-[#111827] block truncate">{event.title}</span>
                            <p className="text-[11px] text-muted-foreground font-medium line-clamp-1 mt-0.5">
                              {event.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-[#111827]">{formatDate(event.date)}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tight flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-slate-300" /> {event.location || 'Virtual Venue'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        <div className="flex flex-wrap gap-1.5">
                          {getAgentNames(event.assignedAgents).slice(0, 2).map((name, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline"
                              className={`text-[9px] px-2 py-0.5 border-none font-bold uppercase tracking-wider ${name === user?.name ? "bg-[#EEEDFE] text-[#3730A3]" : "bg-gray-100 text-gray-600"}`} 
                            >
                              {name === user?.name ? 'You' : name.split(' ')[0]}
                            </Badge>
                          ))}
                          {event.assignedAgents.length > 2 && (
                            <Badge variant="outline" className="text-[9px] px-2 py-0.5 bg-gray-50 text-gray-400 border-none font-bold">
                              +{event.assignedAgents.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6 text-center">
                        <div className="inline-flex items-center gap-2 bg-[#F0FDF4] text-[#166534] px-3 py-1 rounded-full border border-[#DCFCE7]">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{getStudentCount(event.id)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        <Badge 
                          variant="outline"
                          className={`text-[9px] px-2.5 py-1 border-none font-bold uppercase tracking-widest ${isUpcoming(event.date) 
                            ? 'bg-[#E0E7FF] text-[#3730A3]' 
                            : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isUpcoming(event.date) ? 'Active' : 'Closed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5 px-7 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          asChild
                          className="text-[#042C53] font-bold text-xs uppercase tracking-widest hover:bg-[#F0F7FF] hover:text-[#042C53] group"
                        >
                          <Link to={`/agent/events/${event.id}`}>
                            Details <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
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
