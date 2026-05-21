import React, { useState, useEffect } from 'react';
import { Settings, Clock, BellRing, Award, Activity, Sun, Moon, Loader2, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface ActivityLog {
  id: string;
  type: 'LOGIN_LOG' | 'LOGOUT_LOG';
  message: string;
  recipientId: string;
  isRead: boolean;
  createdAt: string;
  fullName: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'preferences' | 'activity'>('preferences');
  
  // Dashboard preferences states (persisted locally since we have read-only DB schema tables)
  const [attendanceCutoff, setAttendanceCutoff] = useState(() => localStorage.getItem('mep-attendance-cutoff') || '09:30 AM');
  const [absentThreshold, setAbsentThreshold] = useState(() => Number(localStorage.getItem('mep-absent-threshold')) || 3);
  const [topperPercentage, setTopperPercentage] = useState(() => Number(localStorage.getItem('mep-topper-percentage')) || 10);
  const [theme, setTheme] = useState(() => localStorage.getItem('mep-theme') || 'dark');

  // Activity logs states
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Apply theme to document element
  const toggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('mep-theme', newTheme);
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    toast.success(`${newTheme === 'dark' ? 'Dark' : 'Light'} theme applied!`);
  };

  // Fetch activity logs
  const fetchLogs = async (silent = false) => {
    if (!silent) setLoadingLogs(true);
    try {
      const response = await api.get('/users/activity-logs');
      if (response.data) {
        setLogs(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
      if (!silent) toast.error('Failed to load user activity logs.');
    } finally {
      if (!silent) setLoadingLogs(false);
    }
  };

  // Poll activity logs when tab is active
  useEffect(() => {
    if (activeTab === 'activity') {
      fetchLogs();
      const interval = setInterval(() => {
        fetchLogs(true);
      }, 10000); // refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('mep-attendance-cutoff', attendanceCutoff);
      localStorage.setItem('mep-absent-threshold', absentThreshold.toString());
      localStorage.setItem('mep-topper-percentage', topperPercentage.toString());
      toast.success('Preferences saved successfully!');
    } catch (err) {
      toast.error('Failed to save preferences.');
    }
  };

  const getBadgeClass = (type: string) => {
    return type === 'LOGIN_LOG' ? 'badge-glow-green' : 'badge-glow-red';
  };

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Title Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Platform Settings</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Configure coordinator rules, control theme appearances, and view real-time system login events.</p>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
        <button
          onClick={() => setActiveTab('preferences')}
          style={{
            background: activeTab === 'preferences' ? 'var(--powder-blue-glow)' : 'transparent',
            color: activeTab === 'preferences' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'preferences' ? '1px solid var(--powder-blue)' : '1px solid transparent',
            padding: '10px 20px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s'
          }}
        >
          <Settings size={16} />
          Dashboard Preferences
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          style={{
            background: activeTab === 'activity' ? 'var(--powder-blue-glow)' : 'transparent',
            color: activeTab === 'activity' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'activity' ? '1px solid var(--powder-blue)' : '1px solid transparent',
            padding: '10px 20px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s'
          }}
        >
          <Activity size={16} />
          User Activity Logs
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'preferences' ? (
        <form onSubmit={handleSavePreferences} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Main Settings Card */}
          <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Settings size={20} color="var(--powder-blue)" />
              Dashboard Settings
            </h3>
            
            {/* Cutoff Time */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={15} />
                Attendance Cutoff Time
              </label>
              <select
                value={attendanceCutoff}
                onChange={(e) => setAttendanceCutoff(e.target.value)}
                className="glass-input"
                style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14 }}
              >
                <option value="08:00 AM">08:00 AM</option>
                <option value="08:30 AM">08:30 AM</option>
                <option value="09:00 AM">09:00 AM</option>
                <option value="09:30 AM">09:30 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="10:30 AM">10:30 AM</option>
              </select>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Daily time limit for registering trainee check-ins before auto-absent alerts.</span>
            </div>

            {/* Absent Trigger threshold */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BellRing size={15} />
                Consecutive Absent Days Threshold
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={absentThreshold}
                onChange={(e) => setAbsentThreshold(Number(e.target.value))}
                className="glass-input"
                style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Trigger automated warning emails when trainee is absent for this many straight days.</span>
            </div>

            {/* Toppers display limit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award size={15} />
                Topper Cohort Percentage Limit
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={topperPercentage}
                  onChange={(e) => setTopperPercentage(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--powder-blue)', height: 6, borderRadius: 3 }}
                />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', width: 45, textAlign: 'right' }}>{topperPercentage}%</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Filter top performers list inside batch report visual stats.</span>
            </div>

            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: 12 }}>
              Save Dashboard Preferences
            </button>
          </div>

          {/* Theme appearance settings */}
          <div className="card card-glow-orange" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Theme Appearance</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Toggle between standard system visual appearance configurations.</p>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => toggleTheme('light')}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 16,
                  border: theme === 'light' ? '2px solid var(--pale-orange)' : '1px solid var(--border-color)',
                  background: theme === 'light' ? 'var(--pale-orange-glow)' : 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 700,
                  transition: 'all 0.2s'
                }}
              >
                <Sun size={24} color={theme === 'light' ? 'var(--pale-orange)' : 'var(--text-secondary)'} />
                Light Theme
              </button>
              
              <button
                type="button"
                onClick={() => toggleTheme('dark')}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 16,
                  border: theme === 'dark' ? '2px solid var(--powder-blue)' : '1px solid var(--border-color)',
                  background: theme === 'dark' ? 'var(--powder-blue-glow)' : 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 700,
                  transition: 'all 0.2s'
                }}
              >
                <Moon size={24} color={theme === 'dark' ? 'var(--powder-blue)' : 'var(--text-secondary)'} />
                Dark Theme
              </button>
            </div>
            
            <div style={{ background: 'var(--border-color)', padding: 12, borderRadius: 12, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Tip: The dark theme optimizes battery power and reduces strain in low-light coordinator rooms, while the light theme offers standard high contrast representation.
            </div>
          </div>
        </form>
      ) : (
        /* Activity Logs card */
        <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={20} color="var(--powder-blue)" />
              User Activity Logs
            </h3>
            <button
              onClick={() => fetchLogs()}
              disabled={loadingLogs}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              {loadingLogs ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Refresh Logs
            </button>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            This live feed shows the most recent login and logout activities recorded on the platform. It automatically updates every 10 seconds.
          </p>

          {loadingLogs && logs.length === 0 ? (
            <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" size={24} color="var(--powder-blue)" />
              <span>Fetching activity records...</span>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
              No user activity logs have been recorded in the platform session logs.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>Activity Time</th>
                    <th style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>Event</th>
                    <th style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>User Name</th>
                    <th style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>Email Address</th>
                    <th style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr 
                      key={log.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border-color)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span 
                          className={getBadgeClass(log.type)} 
                          style={{
                            padding: '4px 10px', 
                            borderRadius: 20, 
                            fontSize: 10, 
                            fontWeight: 700,
                            display: 'inline-block'
                          }}
                        >
                          {log.type === 'LOGIN_LOG' ? 'Login' : 'Logout'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {log.fullName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {log.email}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--powder-blue)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {log.role}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
