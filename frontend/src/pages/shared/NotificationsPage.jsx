import React from 'react';
import { 
  Bell, 
  Check, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  CheckCheck, 
  Clock,
  ArrowRight,
  Filter,
  Search,
  MoreVertical
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const NotificationsPage = () => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState('all'); // all, unread, read
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredNotifications = notifications
    .filter(n => {
      if (filter === 'unread') return !n.isRead;
      if (filter === 'read') return n.isRead;
      return true;
    })
    .filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.message.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <Check className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-rose-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/10';
      case 'warning': return 'bg-amber-500/10';
      case 'error': return 'bg-rose-500/10';
      default: return 'bg-blue-500/10';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markNotificationAsRead(notification.id);
    }

    if (notification.relatedModel && notification.relatedId) {
      const role = user?.role || 'agent';
      let path = '';
      
      switch (notification.relatedModel) {
        case 'Student':
          path = `/${role}/students/${notification.relatedId}`;
          break;
        case 'Event':
          path = `/${role}/events/${notification.relatedId}`;
          break;
        case 'Invoice':
          path = `/${role}/invoices`;
          break;
        case 'Ticket':
          path = `/${role}/support`;
          break;
        case 'Agent':
          path = role === 'admin' ? `/admin/agents/${notification.relatedId}/report` : `/agent/dashboard`;
          break;
        default:
          break;
      }
      
      if (path) {
        navigate(path);
      }
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-['Outfit'] tracking-tight text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated with your latest activities and alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="rounded-xl border-primary/20 hover:bg-primary/5 text-primary"
            onClick={() => markAllNotificationsAsRead()}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-primary/10 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {[
                { id: 'all', label: 'All Notifications', icon: Bell },
                { id: 'unread', label: 'Unread', icon: Clock },
                { id: 'read', label: 'Read', icon: Check }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    filter === item.id 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                  {item.id === 'unread' && notifications.filter(n => !n.isRead).length > 0 && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-none">
                      {notifications.filter(n => !n.isRead).length}
                    </Badge>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Search</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search notifications..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <div className="lg:col-span-3">
          <Card className="border-primary/10 shadow-sm overflow-hidden rounded-2xl min-h-[600px]">
            <div className="divide-y divide-border">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">No notifications found</h3>
                  <p className="text-muted-foreground max-w-xs mt-2">
                    {searchQuery 
                      ? `No notifications matching "${searchQuery}"`
                      : "You're all caught up! There are no notifications to show right now."}
                  </p>
                  {searchQuery && (
                    <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={cn(
                      "p-6 flex gap-5 transition-all duration-300 hover:bg-muted/50 cursor-pointer group relative",
                      !notification.isRead && "bg-primary/[0.03]"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                      getBgColor(notification.type)
                    )}>
                      {getIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className={cn(
                          "text-base font-bold font-['Outfit']",
                          !notification.isRead ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                      
                      <p className={cn(
                        "text-sm leading-relaxed max-w-2xl",
                        !notification.isRead ? "text-foreground/80" : "text-muted-foreground/70"
                      )}>
                        {notification.message}
                      </p>
                      
                      {notification.relatedModel && (
                        <div className="pt-2 flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full">
                            {notification.relatedModel}
                          </span>
                          <span className="text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            View details
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </div>

                    {!notification.isRead && (
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="rounded-xl shadow-lg border bg-background"
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationAsRead(notification.id);
                          }}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Mark read
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
