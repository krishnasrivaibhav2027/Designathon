import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { useAuth } from '@/context/AuthContext';
import FirstTimePasswordReset from '@/components/FirstTimePasswordReset';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('mep-theme') as 'light' | 'dark') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    try {
      localStorage.setItem('mep-theme', theme);
    } catch {}
  }, [theme]);

  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      localStorage.setItem('sidebar_collapsed', String(newState));
    } catch {}
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (user?.isFirstLogin && user?.role !== 'ADMIN') {
    return <FirstTimePasswordReset />;
  }


  return (
    <ProtectedRoute>
      <div style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        background: 'var(--bg-main)', 
        color: 'var(--text-primary)',
        transition: 'background 0.3s ease, color 0.3s ease'
      }}>
        <Sidebar isCollapsed={isCollapsed} onToggle={handleToggleCollapse} theme={theme} />
        <div style={{ 
          flex: 1, 
          marginLeft: isCollapsed ? 120 : 300, 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <TopBar theme={theme} onToggleTheme={handleToggleTheme} />
          <main style={{ flex: 1, padding: '24px 32px 32px', overflow: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

