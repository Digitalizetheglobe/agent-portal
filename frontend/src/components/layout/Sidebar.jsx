import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  GraduationCap, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { isAdmin, user } = useAuth();
  const location = useLocation();

  const adminLinks = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/agents', icon: Users, label: 'Agents' },
    { to: '/admin/events', icon: Calendar, label: 'Events' },
    { to: '/admin/students', icon: GraduationCap, label: 'Students' },
  ];

  const agentLinks = [
    { to: '/agent/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/agent/events', icon: Calendar, label: 'Events' },
  ];

  const links = isAdmin() ? adminLinks : agentLinks;

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        'fixed left-0 top-0 h-full bg-card border-r border-border z-50 transition-all duration-300 ease-in-out flex flex-col',
        collapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'h-20 flex items-center border-b border-border px-4',
        collapsed ? 'justify-center' : 'justify-center'
      )}>
        {!collapsed && (
          <img 
            src="/assets/QStudylogo(blue).png" 
            alt="QStudy Logo" 
            className="h-10 w-auto"
          />
        )}
        {collapsed && (
          <img 
            src="/assets/QStudylogo(blue).png" 
            alt="QStudy Logo" 
            className="h-10 w-auto"
          />
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          
          return (
            <NavLink
              key={link.to}
              to={link.to}
              data-testid={`nav-${link.label.toLowerCase()}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          data-testid="sidebar-toggle"
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
