import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, Trophy, BookOpen, ClipboardCheck, BarChart3, 
  MessageSquare, Settings, LogOut, Users, Zap, Bot,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  const getNavItems = () => {
    const items = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ];

    if (user?.role === 'ADMIN' || user?.role === 'COORDINATOR') {
      items.push(
        { name: 'Leaderboard', href: '/reports', icon: Trophy },
        { name: 'Batches', href: '/batches', icon: BookOpen },
        { name: 'Users', href: '/users', icon: Users },
        { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
        { name: 'Assessments', href: '/assessments', icon: BarChart3 },
        { name: 'Feedback', href: '/feedback', icon: MessageSquare },
      );
    }
    if (user?.role === 'TRAINER') {
      items.push(
        { name: 'Batches', href: '/batches', icon: BookOpen },
        { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
        { name: 'Assessments', href: '/assessments', icon: BarChart3 },
      );
    }
    if (user?.role === 'TRAINEE') {
      items[0].name = 'My Trainings';
      items.push(
        { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
        { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
        { name: 'Analytics', href: '/analytics', icon: BarChart3 },
        { name: 'Assessments', href: '/assessments', icon: BookOpen },
      );
    }

    // Add Persistent Chatbot to all user dashboards
    items.push({ name: 'AI Assistant', href: '/chat', icon: Bot });
    items.push({ name: 'Settings', href: '/settings', icon: Settings });
    return items;
  };

  return (
    <aside style={{
      width: isCollapsed ? 80 : 260,
      minHeight: '100vh',
      background: '#131313',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      padding: isCollapsed ? '28px 12px' : '28px 20px',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 40,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Brand Header & Toggle */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isCollapsed ? 'center' : 'space-between', 
        marginBottom: 40,
        padding: isCollapsed ? '0' : '0 8px',
        position: 'relative'
      }}>
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #f9a51b, #fac95a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(249, 165, 27, 0.3)',
            flexShrink: 0
          }}>
            <Zap size={20} color="#131313" strokeWidth={2.5} />
          </div>
          
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#f9f9f8', letterSpacing: -0.5, lineHeight: 1.1 }}>MEP-TMS</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#f9a51b', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>Execution</span>
            </div>
          )}
        </Link>

        {/* Collapsible Action Button */}
        {!isCollapsed && (
          <button 
            onClick={onToggle}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: 8,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#919a9f',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f9a51b';
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#919a9f';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* When collapsed, show expand chevron cleanly */}
      {isCollapsed && (
        <button 
          onClick={onToggle}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: 8,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#f9a51b',
            margin: '-20px auto 30px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          title="Expand Sidebar"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Nav Menu */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {getNavItems().map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.name + item.href} to={item.href} style={{ textDecoration: 'none' }} title={isCollapsed ? item.name : ''}>
              <div style={{
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? 0 : 14,
                padding: '12px 16px', borderRadius: 14,
                background: isActive ? '#f9a51b' : 'transparent',
                color: isActive ? '#131313' : '#919a9f',
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                position: 'relative',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                boxShadow: isActive ? '0 4px 14px rgba(249, 165, 27, 0.25)' : 'none',
                transform: isActive && !isCollapsed ? 'translateX(4px)' : 'none',
              }}
              onMouseEnter={(e) => { 
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(250, 201, 90, 0.08)';
                  e.currentTarget.style.color = '#f9f9f8';
                  if (!isCollapsed) e.currentTarget.style.transform = 'translateX(4px)';
                }
              }}
              onMouseLeave={(e) => { 
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#919a9f';
                  if (!isCollapsed) e.currentTarget.style.transform = 'none';
                }
              }}
              >
                <item.icon size={20} style={{ 
                  transition: 'transform 0.2s', 
                  transform: isActive ? 'scale(1.1)' : 'none',
                  flexShrink: 0
                }} />
                
                {!isCollapsed && (
                  <span style={{ animation: 'fadeIn 0.2s ease' }}>{item.name}</span>
                )}
                
                {/* Glowing status dot */}
                {isActive && !isCollapsed && (
                  <div style={{
                    position: 'absolute', right: 12, width: 6, height: 6,
                    borderRadius: '50%', background: '#131313',
                  }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Profile & Sign Out Footer */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(249, 165, 27, 0.08) 0%, rgba(250, 201, 90, 0.03) 100%)',
        border: '1px solid rgba(249, 165, 27, 0.15)',
        borderRadius: 20, 
        padding: isCollapsed ? '12px 6px' : '18px', 
        color: '#f9f9f8', 
        textAlign: 'center',
        marginTop: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      title={isCollapsed ? `${user?.fullName} (${user?.role})` : ''}
      >
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'rgba(249, 165, 27, 0.15)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto',
          border: '2px solid #f9a51b',
          transition: 'all 0.3s',
        }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#f9a51b' }}>
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        
        {!isCollapsed && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#f9f9f8', marginTop: 10 }}>{user?.fullName || 'User'}</p>
            <p style={{ fontSize: 10, color: '#fac95a', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>
              {user?.role}
            </p>
            <button onClick={logout} style={{
              marginTop: 14, padding: '10px 18px', borderRadius: 12,
              background: '#f9a51b', color: '#131313', border: 'none',
              fontWeight: 700, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, margin: '14px auto 0',
              transition: 'all 0.2s',
              boxShadow: '0 4px 10px rgba(249, 165, 27, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = '#fac95a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = '#f9a51b';
            }}
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
