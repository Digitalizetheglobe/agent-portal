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
    <div className="space-y-8 p-4 md:p-8 bg-[#F9FAFB] min-h-screen" data-testid="agent-events-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] font-['Outfit'] tracking-tight">
            My Events
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Manage student registrations for your assigned recruitment campaigns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 bg-[#E0E7FF] text-[#3730A3] border-none font-semibold text-[10px] tracking-wider uppercase">
            {assignedEvents.length} Active Events
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { title: 'Assigned Events', value: assignedEvents.length, trend: 'Total assigned', icon: Calendar, color: 'text-[#534AB7]', bgColor: 'bg-[#EEEDFE]' },
          { title: 'Upcoming Events', value: upcomingEvents.length, trend: 'Still to come', icon: Users, color: 'text-[#185FA5]', bgColor: 'bg-[#E6F1FB]' },
          { title: 'Total Registrations', value: myStudents.length, trend: 'Students submitted', icon: GraduationCap, color: 'text-[#059669]', bgColor: 'bg-[#ECFDF5]' }
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

      {/* All Events */}
      <Card className="border border-gray-200 shadow-sm" data-testid="all-events-card">
        <CardHeader className="pb-2 px-7 pt-7">
          <CardTitle className="text-xl font-bold text-[#111827] font-['Outfit']">All Assigned Events</CardTitle>
          <CardDescription className="text-sm font-medium">Click on an event to manage registrations and student onboarding.</CardDescription>
        </CardHeader>
        <CardContent className="p-7">
          {assignedEvents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">
                No events assigned to you yet. Contact your admin manager to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {assignedEvents.map((event) => {
                const isUpcoming = new Date(event.date) >= new Date();
                const eventStudents = myStudents.filter(s => s.eventId === event.id);
                
                return (
                  <Link 
                    key={event.id} 
                    to={`/agent/events/${event.id}`}
                    data-testid={`agent-event-${event.id}`}
                    className="block group"
                  >
                    <div className="h-full bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#042C53] hover:shadow-lg transition-all duration-300 flex flex-col">
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-12 h-12 rounded-xl bg-[#F0F7FF] flex items-center justify-center text-[#042C53] group-hover:scale-110 transition-transform">
                          <Calendar className="w-6 h-6" />
                        </div>
                        <Badge 
                          variant="outline"
                          className={`px-3 py-1 border-none font-bold text-[10px] tracking-wider uppercase ${isUpcoming 
                            ? 'bg-[#DCFCE7] text-[#166534]' 
                            : 'bg-[#F1F5F9] text-[#475569]'
                          }`}
                        >
                          {isUpcoming ? 'Upcoming' : 'Past Event'}
                        </Badge>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-[#111827] mb-1 group-hover:text-[#042C53] transition-colors font-['Outfit']">
                          {event.title}
                        </h3>
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-4 uppercase tracking-wider">
                          {formatDate(event.date)} · {event.location || 'Virtual Venue'}
                        </p>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-6 font-medium leading-relaxed">
                          {event.description}
                        </p>
                      </div>

                      <div className="mt-auto space-y-4">
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#042C53]">
                            <GraduationCap className="w-4 h-4" />
                            <span>{eventStudents.length} Registrations</span>
                          </div>
                          <div className="flex items-center gap-1 text-[#042C53] text-xs font-bold uppercase tracking-widest group-hover:gap-2 transition-all">
                            Manage <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Other agents */}
                        {event.assignedAgents.length > 1 && (
                          <div className="bg-[#F8FAFC] rounded-lg p-2.5 flex items-center gap-2 overflow-hidden">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <p className="text-[10px] text-slate-500 font-semibold truncate">
                              Team: {getAgentNames(event.assignedAgents.filter(id => id !== user?.id)).join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
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
