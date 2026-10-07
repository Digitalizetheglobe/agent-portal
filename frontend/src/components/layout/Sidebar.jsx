import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  GraduationCap,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  LifeBuoy,
  Settings,
  Building2,
  BookOpen,
  FileCheck,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { isAdmin, user } = useAuth();
  const location = useLocation();

  // Sections follow the real workflow: people -> admissions -> events -> money.
  const adminSections = [
    { title: null, links: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ]},
    { title: 'People', links: [
      { to: '/admin/agents', icon: Users, label: 'Agents' },
      { to: '/admin/students', icon: GraduationCap, label: 'Students' },
      { to: '/admin/verification', icon: ShieldCheck, label: 'Student Verification' },
    ]},
    { title: 'Admissions', links: [
      { to: '/admin/universities', icon: Building2, label: 'Universities' },
      { to: '/admin/courses', icon: BookOpen, label: 'Courses' },
      { to: '/admin/applications', icon: FileCheck, label: 'Applications' },
      { to: '/admin/events', icon: Calendar, label: 'Events' },
    ]},
    { title: 'Finance', links: [
      { to: '/admin/invoices', icon: FileText, label: 'Invoices' },
      { to: '/admin/payoffs', icon: CreditCard, label: 'Payoffs' },
    ]},
    { title: 'Help', links: [
      { to: '/admin/support', icon: LifeBuoy, label: 'Support' },
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ]},
  ];

  const agentSections = [
    { title: null, links: [
      { to: '/agent/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ]},
    { title: 'Admissions', links: [
      { to: '/agent/universities', icon: Building2, label: 'Universities' },
      { to: '/agent/students', icon: GraduationCap, label: 'Students' },
      { to: '/agent/applications', icon: FileCheck, label: 'Applications' },
      { to: '/agent/events-management', icon: CalendarCheck, label: 'Events' },
    ]},
    { title: 'Finance', links: [
      { to: '/agent/invoices', icon: FileText, label: 'Invoices' },
      { to: '/agent/payoffs', icon: CreditCard, label: 'Payoffs' },
    ]},
    { title: 'Help', links: [
      { to: '/agent/support', icon: LifeBuoy, label: 'Support' },
      { to: '/agent/settings', icon: Settings, label: 'Settings' },
    ]},
  ];

  const sections = isAdmin() ? adminSections : agentSections;

  // Detail pages (e.g. /admin/students/123) keep their parent item highlighted.
  const isLinkActive = (to) => {
    const path = location.pathname;
    if (path === to || path.startsWith(`${to}/`)) return true;
    return to === '/agent/events-management' && path.startsWith('/agent/events/');
  };

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        'fixed left-0 top-0 h-full bg-slate-900/95 border-r border-slate-900/85 z-50 transition-all duration-300 ease-in-out flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'h-20 flex items-center justify-center border-b border-slate-900/85 px-4'
      )}>
        <img
          src="/assets/QStudylogo(blue).png"
          alt="QStudy Logo"
          className="h-10 w-auto brightness-0 invert"
        />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={section.title || 'main'} className={cn(i > 0 && 'pt-3')}>
            {section.title && (
              collapsed ? (
                <div className="mx-3 mb-2 border-t border-slate-800" />
              ) : (
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {section.title}
                </div>
              )
            )}
            <div className="space-y-1">
              {section.links.map((link) => {
                const Icon = link.icon;
                const isActive = isLinkActive(link.to);

                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    title={collapsed ? link.label : undefined}
                    data-testid={`nav-${link.label.toLowerCase()}`}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-50',
                      collapsed && 'justify-center px-2'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                    {!collapsed && <span>{link.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          data-testid="sidebar-toggle"
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-50 transition-colors',
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
