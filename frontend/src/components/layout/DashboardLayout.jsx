import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { cn } from '../../lib/utils';

const DashboardLayout = ({ requiredRole }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    const redirectPath = user?.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-layout">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden md:block">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          setCollapsed={setSidebarCollapsed}
        />
      </div>

      {/* Sidebar - Mobile */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <Sidebar 
          collapsed={false} 
          setCollapsed={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className={cn(
        'transition-all duration-300',
        sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
      )}>
        <Topbar 
          sidebarCollapsed={sidebarCollapsed}
          onMobileMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
