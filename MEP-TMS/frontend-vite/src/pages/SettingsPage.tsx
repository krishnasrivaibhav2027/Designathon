import React, { useState, useEffect } from 'react';
import { Settings, Clock, BellRing, Award, Activity, Loader2, RefreshCw, Sliders } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'preferences' | 'activity'>('preferences');
  
  // Dashboard preferences states (persisted locally since we have read-only DB schema tables)
  const [attendanceCutoff, setAttendanceCutoff] = useState(() => localStorage.getItem('mep-attendance-cutoff') || '09:30 AM');
  const [absentThreshold, setAbsentThreshold] = useState(() => Number(localStorage.getItem('mep-absent-threshold')) || 3);
  const [topperPercentage, setTopperPercentage] = useState(() => Number(localStorage.getItem('mep-topper-percentage')) || 10);
  const [aiTopicsCount, setAiTopicsCount] = useState(() => Number(localStorage.getItem('mep-ai-topics-count')) || 5);
  const [aiSubtopicsCount, setAiSubtopicsCount] = useState(() => Number(localStorage.getItem('mep-ai-subtopics-count')) || 6);

  // Trainer preferences states
  const [passThreshold, setPassThreshold] = useState(() => Number(localStorage.getItem('mep-trainer-pass-threshold')) || 70);
  const [aiDifficulty, setAiDifficulty] = useState(() => localStorage.getItem('mep-trainer-ai-difficulty') || 'Intermediate');
  const [remindLate, setRemindLate] = useState(() => {
    const val = localStorage.getItem('mep-trainer-remind-late');
    return val === null ? true : val === 'true';
  });
  const [absentNotify, setAbsentNotify] = useState(() => {
    const val = localStorage.getItem('mep-trainer-absent-notify');
    return val === null ? false : val === 'true';
  });

  // Activity logs states
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

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

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (user?.role === 'COORDINATOR' || user?.role === 'ADMIN') {
        localStorage.setItem('mep-attendance-cutoff', attendanceCutoff);
        localStorage.setItem('mep-absent-threshold', absentThreshold.toString());
        localStorage.setItem('mep-topper-percentage', topperPercentage.toString());
        localStorage.setItem('mep-ai-topics-count', aiTopicsCount.toString());
        localStorage.setItem('mep-ai-subtopics-count', aiSubtopicsCount.toString());
        toast.success('Coordinator preferences saved successfully!');
        
        try {
          await api.post('/notifications', {
            type: 'SETTING_CHANGE',
            message: `Coordinator ${user.fullName} updated system preferences.`
          });
        } catch (notifErr) {
          console.warn('Failed to log setting change notification:', notifErr);
        }
      } else if (user?.role === 'TRAINER') {
        localStorage.setItem('mep-trainer-pass-threshold', passThreshold.toString());
        localStorage.setItem('mep-trainer-ai-difficulty', aiDifficulty);
        localStorage.setItem('mep-trainer-remind-late', remindLate.toString());
        localStorage.setItem('mep-trainer-absent-notify', absentNotify.toString());
        toast.success('Trainer preferences saved successfully!');
        
        try {
          await api.post('/notifications', {
            type: 'SETTING_CHANGE',
            message: `Trainer ${user.fullName} updated classroom preferences.`
          });
        } catch (notifErr) {
          console.warn('Failed to log setting change notification:', notifErr);
        }
      } else {
        toast.error('You do not have permissions to modify dashboard settings.');
      }
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
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Configure role-based dashboard preferences and view real-time system activity logs.</p>
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
        <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 650 }}>
          {user?.role === 'COORDINATOR' || user?.role === 'ADMIN' ? (
            /* Coordinator preferences card */
            <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Settings size={20} color="var(--powder-blue)" />
                Coordinator Settings
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

              {/* AI Generation Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award size={15} />
                    AI Topics Count
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="12"
                    value={aiTopicsCount}
                    onChange={(e) => setAiTopicsCount(Number(e.target.value))}
                    className="glass-input"
                    style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Default number of topic groups to generate.</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={15} />
                    AI Subtopics Count
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="15"
                    value={aiSubtopicsCount}
                    onChange={(e) => setAiSubtopicsCount(Number(e.target.value))}
                    className="glass-input"
                    style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Default number of subtopics per topic group.</span>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: 12 }}>
                Save Coordinator Preferences
              </button>
            </div>
          ) : user?.role === 'TRAINER' ? (
            /* Trainer preferences card */
            <div className="card card-glow-orange" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Settings size={20} color="var(--pale-orange)" />
                Trainer Settings
              </h3>

              {/* Passing score threshold */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={15} />
                  Assessment Passing Score Threshold
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={passThreshold}
                    onChange={(e) => setPassThreshold(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--pale-orange)', height: 6, borderRadius: 3 }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', width: 45, textAlign: 'right' }}>{passThreshold}%</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Minimum score percentage required for a trainee to pass assessments.</span>
              </div>

              {/* AI MCQ Difficulty */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sliders size={15} />
                  AI MCQ Difficulty Preference
                </label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14 }}
                >
                  <option value="Beginner">Beginner (Foundational concepts)</option>
                  <option value="Intermediate">Intermediate (Core applications & analysis)</option>
                  <option value="Advanced">Advanced (Complex debugging & design patterns)</option>
                </select>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Default complexity level when generating automatic quiz questions.</span>
              </div>

              {/* Checkboxes / Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="checkbox"
                    id="remindLate"
                    checked={remindLate}
                    onChange={(e) => setRemindLate(e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      cursor: 'pointer',
                      accentColor: 'var(--pale-orange)'
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="remindLate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      Auto-Remind Trainees for Late Submissions
                    </label>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Send automated reminder emails to trainees with pending/late assessments.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="checkbox"
                    id="absentNotify"
                    checked={absentNotify}
                    onChange={(e) => setAbsentNotify(e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      cursor: 'pointer',
                      accentColor: 'var(--pale-orange)'
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="absentNotify" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      Attendance Alert Notification
                    </label>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Send daily email summary of absent trainees in my assigned cohorts.</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: 12 }}>
                Save Trainer Preferences
              </button>
            </div>
          ) : (
            /* Trainee / Other Roles information card */
            <div className="card card-glow-yellow" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Settings size={20} color="var(--yellow)" />
                Dashboard Settings
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                As a trainee, you can view your system activity logs using the tab above. Dashboard configurations and thresholds are managed by your trainer and batch coordinator.
              </p>
            </div>
          )}
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
