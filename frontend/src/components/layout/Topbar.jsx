import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import NotificationCenter from './NotificationCenter';
import { cn } from '../../lib/utils';

const Topbar = ({ sidebarCollapsed, onMobileMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header
      data-testid="topbar"
      className="sticky top-0 z-40 flex h-20 w-full items-center border-b border-slate-800 bg-slate-900/95 backdrop-blur-xl"
    >
      <div className="w-full flex items-center justify-between px-4 md:px-6">
        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="text-sm font-medium text-slate-200 font-['Outfit']">
            {user?.role === 'admin' ? 'Admin' : 'Agent'}
          </div>
          <button
            onClick={onMobileMenuClick}
            data-testid="mobile-menu-btn"
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Page Title / Breadcrumb Area - Desktop Only */}
        <div className="hidden lg:block flex-1">
          <h1 className="text-lg font-semibold text-slate-200 font-['Outfit']">
            {user?.role === 'admin' ? 'Admin Dashboard' : `Welcome, ${user?.name}`}
          </h1>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 md:gap-4">

          {/* Notifications */}
          <NotificationCenter />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                data-testid="user-menu-trigger"
                className="flex items-center gap-2 h-9 px-2 hover:bg-slate-800 hover:text-slate-100 text-slate-300"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium text-slate-200">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate(user?.role === 'admin' ? '/admin/settings' : '/agent/settings')}
                data-testid="profile-menu-item"
              >
                <User className="w-4 h-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                data-testid="logout-menu-item"
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
