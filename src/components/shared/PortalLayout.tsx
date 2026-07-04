import React, { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useStore } from '../../store/StoreContext';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '../ui/Button';

const ROLE_ACCENT: Record<string, { bg: string; text: string; label: string }> = {
  manager: { bg: 'bg-[#7C3AED]', text: 'text-white', label: 'Super Admin' },
  sales: { bg: 'bg-[#2563EB]', text: 'text-white', label: 'Sales' },
  production: { bg: 'bg-[#059669]', text: 'text-white', label: 'Production' },
  inventory: { bg: 'bg-[#D97706]', text: 'text-white', label: 'Inventory' },
  dispatch: { bg: 'bg-[#0891B2]', text: 'text-white', label: 'Dispatch' },
};

export function PortalLayout({ children, expectedRole, title }: { children: React.ReactNode, expectedRole: string, title: string }) {
  const { user, logout } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== expectedRole) {
      navigate({ to: '/' });
    }
  }, [user, expectedRole, navigate]);

  if (!user || user.role !== expectedRole) return null;

  const accent = ROLE_ACCENT[user.role] || ROLE_ACCENT.sales;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1E3A5F] text-white border-b border-[#BFDBFE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LayoutDashboard className="h-6 w-6 text-white" />
            <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
            <span className={`${accent.bg} ${accent.text} text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider`}>
              {accent.label}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium text-white/80">User: <span className="text-white capitalize">{user.username}</span></div>
            <Button onClick={() => { logout(); navigate({ to: '/' }); }} variant="outline" size="sm" 
              className="border-white/20 text-white hover:bg-white hover:text-[#1E3A5F] transition-colors rounded-lg flex items-center space-x-2 px-3 py-1.5 h-auto">
              <LogOut className="h-4 w-4" /><span>Logout</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
