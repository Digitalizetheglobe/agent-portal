import React, { useState } from 'react';
import { Bell, Check, Info, AlertTriangle, AlertCircle, Trash2, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';

const NotificationCenter = () => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
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

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleRead = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    markNotificationAsRead(id);
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
        setOpen(false);
      }
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-300 hover:bg-slate-800 hover:text-slate-100">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-rose-500 hover:bg-rose-600 border-2 border-background animate-in zoom-in duration-300"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] sm:w-[380px] p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-muted/30">
          <DropdownMenuLabel className="p-0 font-['Outfit'] text-base">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => markAllNotificationsAsRead()}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center p-6">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                We'll notify you when something important happens.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={cn(
                    "flex gap-3 p-4 transition-colors hover:bg-muted/50 cursor-pointer relative group",
                    !notification.isRead && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                    getBgColor(notification.type)
                  )}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm font-semibold truncate",
                        !notification.isRead ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {notification.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs mt-1 line-clamp-2 leading-relaxed",
                      !notification.isRead ? "text-foreground/80" : "text-muted-foreground/70"
                    )}>
                      {notification.message}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-7 h-7 rounded-full bg-background border shadow-sm"
                        onClick={(e) => handleRead(e, notification.id)}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <div className="p-2 bg-muted/10">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs font-medium text-muted-foreground"
                onClick={() => {
                  navigate(`/${user?.role || 'agent'}/notifications`);
                  setOpen(false);
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationCenter;
