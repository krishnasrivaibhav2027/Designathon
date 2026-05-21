import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Globe, Clock, Check, Trash2, Bot } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSimulatedTime, SimulatedTime } from '@/context/TimeContext';
import { useNotifications, NotificationItem } from '@/context/NotificationContext';
import { useLocation, Link } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/batches': 'Batches',
  '/attendance': 'Attendance',
  '/assessments': 'Assessments',
  '/reports': 'Leaderboard',
  '/feedback': 'Feedback',
  '/users': 'Users',
  '/chat': 'AI Assistant',
  '/settings': 'Settings',
};

export default function TopBar() {
  const { user } = useAuth();
  const location = useLocation();
  const { simulatedTime, setSimulatedTime } = useSimulatedTime();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const title = pageTitles[location.pathname] || 'Dashboard';
  
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSimulatedTime(e.target.value as SimulatedTime);
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatNotifTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <header style={{
      height: 80, padding: '0 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'transparent',
      borderBottom: '1px solid rgba(19, 19, 19, 0.04)',
      position: 'relative',
      zIndex: 30,
    }}>
      {/* Left: Page Title */}
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#131313', fontFamily: 'Outfit, sans-serif' }}>{title}</h1>

      {/* Center: Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#ffffff', borderRadius: 16, padding: '10px 18px',
        width: 320, boxShadow: '0 4px 12px rgba(19, 19, 19, 0.02)',
        border: '1px solid #dbdbd9',
      }}>
        <Search size={18} color="#919a9f" />
        <input
          type="text" placeholder="Search operations..."
          style={{
            border: 'none', outline: 'none', flex: 1, fontSize: 13,
            color: '#131313', background: 'transparent',
            fontWeight: 500,
          }}
        />
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Time Simulator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 12,
          background: 'rgba(249, 165, 27, 0.1)', border: '1px solid rgba(249, 165, 27, 0.2)',
          color: '#f9a51b', fontWeight: 700, fontSize: 13,
        }}>
          <Clock size={16} />
          <select 
            value={simulatedTime} 
            onChange={handleTimeChange}
            style={{ 
              background: 'transparent', border: 'none', color: 'inherit', 
              fontWeight: 'inherit', outline: 'none', cursor: 'pointer' 
            }}
          >
            <option value="08:30">08:30 AM</option>
            <option value="09:00">09:00 AM</option>
            <option value="09:30">09:30 AM</option>
            <option value="09:45">09:45 AM</option>
            <option value="10:05">10:05 AM</option>
          </select>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 12,
          background: '#ffffff', fontSize: 13, color: '#919a9f', fontWeight: 600,
          border: '1px solid #dbdbd9', cursor: 'pointer',
        }}>
          <Globe size={16} />
          <span>Eng (US)</span>
        </div>

        {/* Global Notifications Bell Popover */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div 
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: unreadCount > 0 ? 'rgba(249, 165, 27, 0.1)' : '#ffffff',
              display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
              border: unreadCount > 0 ? '1px solid rgba(249, 165, 27, 0.3)' : '1px solid #dbdbd9',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Bell size={20} color={unreadCount > 0 ? '#f9a51b' : '#919a9f'} />
            
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: -3, right: -3,
                minWidth: 18, height: 18, borderRadius: '50%',
                background: '#ff6b6b', border: '2px solid #ffffff',
                color: '#fff', fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px',
              }}>
                {unreadCount}
              </div>
            )}
          </div>

          {/* Elegant Popover Panel */}
          {showNotifDropdown && (
            <div style={{
              position: 'absolute', right: 0, top: 54, width: 340,
              background: '#ffffff', borderRadius: 18, border: '1px solid #dbdbd9',
              boxShadow: '0 8px 30px rgba(19, 19, 19, 0.1)', overflow: 'hidden',
              animation: 'fadeIn 0.2s ease',
            }}>
              {/* Header */}
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid #dbdbd9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f9f9f8',
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#131313' }}>System Activity Alerts</h4>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => { markAllAsRead(); setShowNotifDropdown(false); }}
                    style={{
                      border: 'none', background: 'transparent', color: '#f9a51b',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Scrollable Notifications list */}
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <Bell size={28} color="#dbdbd9" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 13, color: '#919a9f', fontWeight: 500 }}>You have no notifications yet.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid rgba(19,19,19,0.04)',
                        background: notif.is_read ? 'transparent' : 'rgba(250, 201, 90, 0.04)',
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: notif.is_read ? 'transparent' : '#ff6b6b',
                        marginTop: 6, flexShrink: 0
                      }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: notif.is_read ? 500 : 700, color: '#131313', lineHeight: 1.4 }}>
                          {notif.message}
                        </p>
                        <span style={{ fontSize: 10, color: '#919a9f', display: 'block', marginTop: 4 }}>
                          {formatNotifTime(notif.created_at)}
                        </span>
                      </div>
                      {!notif.is_read && (
                        <button 
                          onClick={() => markAsRead(notif.id)}
                          style={{
                            border: 'none', background: 'rgba(249, 165, 27, 0.1)',
                            width: 20, height: 20, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#f9a51b',
                          }}
                        >
                          <Check size={12} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info Capsule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #f9a51b, #fac95a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#131313', fontWeight: 800, fontSize: 16,
            boxShadow: '0 4px 10px rgba(249, 165, 27, 0.15)',
          }}>
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ display: 'none', md: 'block' } as any}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#131313', lineHeight: 1.2 }}>{user?.fullName || 'User'}</p>
            <p style={{ fontSize: 11, color: '#fac95a', fontWeight: 700, letterSpacing: 0.5, lineHeight: 1.2 }}>{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
