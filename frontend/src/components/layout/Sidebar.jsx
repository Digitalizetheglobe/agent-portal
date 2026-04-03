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
  const { isAdmin } = useAuth();
  const location = useLocation();

  const adminLinks = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/agents', icon: Users, label: 'Agents' },
    { to: '/admin/events', icon: Calendar, label: 'Events' },
    { to: '/admin/students', icon: GraduationCap, label: 'Students' },
  ];

  const agentLinks = [
    { to: '/agent/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ];

  const links = isAdmin() ? adminLinks : agentLinks;

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        'fixed left-0 top-0 h-full bg-card border-r border-border z-50 transition-all duration-300 ease-in-out flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'h-16 flex items-center border-b border-border px-4',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AP</span>
            </div>
            <span className="font-semibold text-foreground font-['Outfit']">Admin Portal</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">AP</span>
          </div>
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
