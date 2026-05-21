import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

export default function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      localStorage.setItem('sidebar_collapsed', String(newState));
    } catch {}
  };

  return (
    <ProtectedRoute>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f9f9f8' }}>
        <Sidebar isCollapsed={isCollapsed} onToggle={handleToggleCollapse} />
        <div style={{ 
          flex: 1, 
          marginLeft: isCollapsed ? 80 : 260, 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <TopBar />
          <main style={{ flex: 1, padding: '24px 32px 32px', overflow: 'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
