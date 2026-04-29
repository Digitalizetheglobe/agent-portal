import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, GraduationCap, TrendingUp, ArrowRight, UserCheck } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

const AdminDashboard = () => {
  const { agents, events, students, getStats } = useData();
  const stats = getStats();

  const statCards = [
    {
      title: 'Total Agents',
      value: stats.totalAgents,
      subtext: `${stats.activeAgents} active`,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: '/admin/agents'
    },
    {
      title: 'Total Events',
      value: stats.totalEvents,
      subtext: `${stats.upcomingEvents} upcoming`,
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: '/admin/events'
    },
    {
      title: 'Total Students',
      value: stats.totalStudents,
      subtext: 'Registered',
      icon: GraduationCap,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: '/admin/students'
    },
    {
      title: 'Conversion Rate',
      value: '72%',
      subtext: '+5% this month',
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: null
    }
  ];

  // Get recent events
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // Get recent students
  const recentStudents = [...students]
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 5);

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown';
  };

  const getEventName = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event?.title || 'Unknown';
  };

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-['Outfit']">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's an overview of your portal.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link to="/admin/agents" data-testid="quick-add-agent">
              <Users className="w-4 h-4 mr-2" />
              Add Agent
            </Link>
          </Button>
          <Button asChild>
            <Link to="/admin/events" data-testid="quick-add-event">
              <Calendar className="w-4 h-4 mr-2" />
              Create Event
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const CardWrapper = stat.link ? Link : 'div';
          
          return (
            <CardWrapper 
              key={index} 
              to={stat.link}
              className={stat.link ? 'block' : ''}
            >
              <Card 
                className="hover:shadow-md transition-shadow cursor-pointer"
                data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-foreground mt-1 font-['Outfit']">
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.subtext}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} strokeWidth={1.5} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardWrapper>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <Card data-testid="recent-events-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-['Outfit']">Recent Events</CardTitle>
              <CardDescription>Latest events created</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/events" className="flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No events yet
                </p>
              ) : (
                recentEvents.map((event) => (
                  <Link 
                    key={event.id} 
                    to={`/admin/events/${event.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    data-testid={`recent-event-${event.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {event.assignedAgents.length} agents
                    </Badge>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Students */}
        <Card data-testid="recent-students-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-['Outfit']">Recent Registrations</CardTitle>
              <CardDescription>Latest student submissions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/students" className="flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentStudents.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No students registered yet
                </p>
              ) : (
                recentStudents.map((student) => (
                  <div 
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`recent-student-${student.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                          {student.name?.charAt(0) || 'S'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{student.name || 'Unknown Student'}</p>
                        <p className="text-xs text-muted-foreground">
                          {getEventName(student.eventId)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UserCheck className="w-3 h-3" />
                      {getAgentName(student.agentId)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Agents */}
      <Card data-testid="active-agents-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-['Outfit']">Active Agents</CardTitle>
            <CardDescription>Currently active team members</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/agents" className="flex items-center gap-1">
              Manage <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {agents.filter(a => a.status === 'active').length === 0 ? (
              <p className="text-muted-foreground text-sm">No active agents</p>
            ) : (
              agents.filter(a => a.status === 'active').map((agent) => (
                <div 
                  key={agent.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50"
                  data-testid={`active-agent-${agent.id}`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-medium text-sm">
                      {agent.name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{agent.name || 'Unknown Agent'}</p>
                    <p className="text-xs text-muted-foreground">{agent.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
