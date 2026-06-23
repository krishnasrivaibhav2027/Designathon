import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Lock, Activity, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ProfileDropdownProps {
  onClose: () => void;
}

export default function ProfileDropdown({ onClose }: ProfileDropdownProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNavigate = (tab: 'profile' | 'security' | 'activity') => {
    if (user?.role === 'ADMIN' || user?.role === 'TRAINER' || user?.role === 'COORDINATOR') {
      const paths = {
        profile: '/profile',
        security: '/change-password',
        activity: '/activity-logs'
      };
      navigate(paths[tab]);
    } else {
      navigate('/settings', { state: { activeTab: tab } });
    }
    onClose();
  };

  return (
    <div style={{
      position: 'absolute', right: 0, top: 54, width: 320,
      background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border-color)',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)', overflow: 'hidden',
      backdropFilter: 'var(--card-blur)',
      animation: 'fadeIn 0.25s ease-out',
      zIndex: 50,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      fontFamily: 'Plus Jakarta Sans, sans-serif'
    }}>
      {/* User Info Header */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border-color)'
      }}>
        <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {user?.fullName || 'User'}
        </h4>
        {user?.employeeId && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            ID: {user.employeeId}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {user?.email}
        </span>
      </div>

      {/* Navigation Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Personal Profile Option */}
        <button
          onClick={() => handleNavigate('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: 10,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            transition: 'background 0.2s, transform 0.1s'
          }}
          className="profile-dropdown-item"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--powder-blue-glow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserIcon size={16} color="var(--powder-blue)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Personal Profile</span>
          </div>
          <ChevronRight size={14} color="var(--text-secondary)" />
        </button>

        {/* Change Password Option */}
        <button
          onClick={() => handleNavigate('security')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: 10,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
            transition: 'background 0.2s, transform 0.1s'
          }}
          className="profile-dropdown-item"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--powder-blue-glow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={16} color="var(--powder-blue)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Change Password</span>
          </div>
          <ChevronRight size={14} color="var(--text-secondary)" />
        </button>

        {/* User Activity Logs (Admins, Coordinators, Trainers only) */}
        {user?.role !== 'TRAINEE' && (
          <button
            onClick={() => handleNavigate('activity')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.2s, transform 0.1s'
            }}
            className="profile-dropdown-item"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--powder-blue-glow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={16} color="var(--powder-blue)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>User Activity Logs</span>
            </div>
            <ChevronRight size={14} color="var(--text-secondary)" />
          </button>
        )}
      </div>
    </div>
  );
}
