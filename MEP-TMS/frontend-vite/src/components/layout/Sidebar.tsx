import { useAuth } from '@/context/AuthContext';
import {
  BarChart3,
  BookOpen,
  Bot,
  ChevronLeft, ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  MessageSquare, Settings,
  Trophy,
  UserPlus,
  Users, Zap
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  theme: 'light' | 'dark';
}

export default function Sidebar({ isCollapsed, onToggle, theme }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  const getNavItems = () => {
    if (user?.role === 'ADMIN') {
      return [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Assistant Chat', href: '/assistant-chat', icon: Bot },
        { name: 'Batches', href: '/batches', icon: BookOpen },
        { name: 'Users', href: '/users', icon: Users },
        { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
        { name: 'Settings & Diagnostics', href: '/settings-diagnostics', icon: Settings }
      ];
    }

    const items = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ];

    if (user?.role === 'COORDINATOR') {
      items.push(
        { name: 'Onboarding', href: '/onboarding', icon: UserPlus },
        { name: 'Assistant Chat', href: '/assistant-chat', icon: Bot },
        { name: 'Reports', href: '/reports', icon: Trophy },
        { name: 'Batches', href: '/batches', icon: BookOpen },
        { name: 'Users', href: '/users', icon: Users },
        { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
        { name: 'Feedback', href: '/feedback', icon: MessageSquare },
      );
    }
    if (user?.role === 'TRAINER') {
      items.push(
        { name: 'Batches', href: '/batches', icon: BookOpen },
        { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
        { name: 'Assessments', href: '/assessments', icon: BarChart3 },
        { name: 'My Agents', href: '/my-agents', icon: Bot },
      );
    }
    if (user?.role === 'TRAINEE') {
      items.push(
        { name: 'My Trainings', href: '/my-trainings', icon: BookOpen },
        { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
        { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
        { name: 'Assessments', href: '/assessments', icon: Zap },
      );
    }

    // Add settings page
    items.push({ name: 'Settings', href: '/settings', icon: Settings });
    return items;
  };

  return (
    <aside style={{
      width: isCollapsed ? 80 : 260,
      height: 'calc(100vh - 40px)',
      background: theme === 'dark' ? 'rgba(18, 24, 36, 0.35)' : 'rgba(255, 255, 255, 0.45)',
      border: '1px solid var(--border-color)',
      borderRadius: 24,
      display: 'flex',
      flexDirection: 'column',
      padding: isCollapsed ? '24px 12px' : '24px 20px',
      position: 'fixed',
      top: 20,
      left: 20,
      zIndex: 40,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: theme === 'dark'
        ? '0 8px 32px rgba(0, 0, 0, 0.25), 0 0 15px rgba(112, 214, 255, 0.03)'
        : '0 8px 32px rgba(0, 0, 0, 0.05), 0 0 15px rgba(112, 214, 255, 0.01)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      overflow: 'hidden',
    }}>
      {/* Header & Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: isCollapsed ? 24 : 40,
        padding: isCollapsed ? '0' : '0 8px',
        position: 'relative',
        flexShrink: 0,
        height: 40
      }}>
        {isCollapsed ? (
          <div style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            animation: 'fadeIn 0.2s ease'
          }}>
            <img
              src="/hexaware-favicon.png"
              alt="Hexaware Logo"
              style={{
                height: '32px',
                width: '32px',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease', transform: 'translateX(-15px)' }}>
              <img
                src="/hexaware-logo.png"
                alt="Hexaware Logo"
                style={{
                  height: '120px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: theme === 'dark' ? 'invert(1) hue-rotate(180deg) brightness(1.8) contrast(1.2)' : 'none',
                  display: 'block'
                }}
              />
            </div>

            <button
              onClick={onToggle}
              style={{
                position: 'absolute',
                right: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: 8,
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--powder-blue)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
            >
              <ChevronLeft size={16} />
            </button>
          </>
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
            color: 'var(--powder-blue)',
            margin: '0 auto 20px',
            transition: 'all 0.2s',
            flexShrink: 0
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          title="Expand Sidebar"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Nav Menu */}
      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: isCollapsed ? 0 : 4,
        }}
        className="custom-scrollbar"
      >
        {getNavItems().map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.name + item.href} to={item.href} style={{ textDecoration: 'none' }} title={isCollapsed ? item.name : ''}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? 0 : 14,
                padding: '12px 20px',
                borderRadius: 9999,
                background: isActive ? 'linear-gradient(135deg, #1e40af, #70d6ff)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                position: 'relative',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                boxShadow: isActive ? '0 4px 14px rgba(112, 214, 255, 0.35)' : 'none',
                border: isActive ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                transform: isActive && !isCollapsed ? 'translateX(4px)' : 'none',
              }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--powder-blue-glow)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    if (!isCollapsed) e.currentTarget.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'transparent';
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
                    position: 'absolute', right: 16, width: 6, height: 6,
                    borderRadius: '50%', background: '#ffffff',
                    boxShadow: '0 0 8px #ffffff'
                  }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Profile & Sign Out Footer */}
      <div style={{
        background: 'linear-gradient(135deg, var(--powder-blue-glow) 0%, rgba(255, 255, 255, 0.02) 100%)',
        border: '1px solid var(--border-color)',
        borderRadius: 20,
        padding: isCollapsed ? '12px 6px' : '18px',
        color: 'var(--text-primary)',
        textAlign: 'center',
        marginTop: 16,
        boxShadow: 'var(--shadow-card)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0
      }}
        title={isCollapsed ? `${user?.fullName} (${user?.role})` : ''}
      >
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'var(--powder-blue-glow)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto',
          border: '2px solid var(--powder-blue)',
          transition: 'all 0.3s',
        }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>

        {!isCollapsed && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginTop: 10 }}>{user?.fullName || 'User'}</p>
            <p style={{ fontSize: 10, color: 'var(--powder-blue)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>
              {user?.role}
            </p>
            <button onClick={logout} style={{
              marginTop: 14, padding: '10px 18px', borderRadius: 9999,
              background: 'linear-gradient(135deg, #1e40af, #70d6ff)',
              color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.15)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, margin: '14px auto 0',
              transition: 'all 0.2s',
              boxShadow: '0 4px 10px rgba(112, 214, 255, 0.25)',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.filter = 'brightness(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 15px rgba(112, 214, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'none';
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(112, 214, 255, 0.25)';
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
