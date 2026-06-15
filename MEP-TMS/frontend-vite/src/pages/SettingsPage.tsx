import React, { useState, useEffect } from 'react';
import { 
  Settings, Clock, BellRing, Award, Activity, RefreshCw, 
  Sliders, Zap, Bell, User as UserIcon, Lock, Eye, EyeOff, Save,
  Mail, Phone, BookOpen, GraduationCap, ShieldAlert, Award as TrophyIcon
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import MorphLoader from '@/components/MorphLoader';
import { useAuth } from '@/context/AuthContext';
import { useBatches } from '@/context/BatchContext';
import CustomSelect from '@/components/CustomSelect';

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

interface CandidateDetails {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  batchId: string;
  batchName: string;
  registrationNumber: string;
  college?: string;
  foundationLanguage?: string;
  streamTraining?: string;
  performanceScore?: number;
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { batches } = useBatches();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'activity'>('profile');
  
  // Profile update states
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Trainee-specific candidate data state
  const [candidateData, setCandidateData] = useState<CandidateDetails | null>(null);
  const [loadingCandidate, setLoadingCandidate] = useState(false);

  // Security password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Dashboard preferences states (persisted locally)
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

  const [autoAlertsEnabled, setAutoAlertsEnabled] = useState(() => {
    const val = localStorage.getItem('mep-trainer-auto-alerts');
    return val === null ? true : val === 'true';
  });

  // Sync state with user context changes
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Fetch trainee candidate status if role is TRAINEE
  useEffect(() => {
    const fetchTraineeDetails = async () => {
      if (user?.role !== 'TRAINEE') return;
      setLoadingCandidate(true);
      try {
        const response = await api.get('/users/me/candidate');
        if (response.data) {
          setCandidateData(response.data);
          if (response.data.phone) {
            setPhone(response.data.phone);
          }
        }
      } catch (err) {
        console.error('Failed to fetch candidate details:', err);
      } finally {
        setLoadingCandidate(false);
      }
    };

    fetchTraineeDetails();
  }, [user?.role]);

  // Filter batches assigned to the current logged-in trainer
  const trainerBatches = batches.filter(b => 
    b.trainer?.toLowerCase() === user?.fullName?.toLowerCase()
  );

  const handleManualAlert = () => {
    if (trainerBatches.length === 0) {
      toast.error('You must have active assigned batches to send attendance alerts.');
      return;
    }
    toast.success('Manual attendance alert dispatched to all pending trainees in your cohorts!');
  };

  const toggleAutoAlerts = () => {
    const newVal = !autoAlertsEnabled;
    setAutoAlertsEnabled(newVal);
    localStorage.setItem('mep-trainer-auto-alerts', newVal.toString());
    toast.success(`Automatic alerts ${newVal ? 'enabled' : 'disabled'}.`);
  };

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
        localStorage.setItem('mep-trainer-auto-alerts', autoAlertsEnabled.toString());
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      const response = await api.put('/users/me/profile', {
        fullName,
        phone: phone || null
      });

      toast.success('Profile details updated successfully!');
      
      // Update local storage and context state
      updateUser({
        fullName: response.data.fullName,
        phone: response.data.phone
      });

      if (user?.role === 'TRAINEE') {
        // Refresh trainee candidate details card
        setCandidateData(prev => prev ? {
          ...prev,
          fullName: response.data.fullName,
          phone: response.data.phone
        } : null);
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      const errMsg = err.response?.data?.detail || 'Failed to save changes.';
      toast.error(errMsg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('New password cannot be identical to the current password.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/users/me/change-password', {
        currentPassword,
        newPassword
      });

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password reset failed:', err);
      const errMsg = err.response?.data?.detail || 'Failed to change password. Double check your current password.';
      toast.error(errMsg);
    } finally {
      setSavingPassword(false);
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

  const getAccentColor = () => {
    if (user?.role === 'ADMIN') return 'var(--powder-blue)';
    if (user?.role === 'COORDINATOR') return 'var(--powder-blue)';
    if (user?.role === 'TRAINER') return 'var(--pale-orange)';
    return 'var(--yellow)';
  };

  const getCardGlowClass = () => {
    if (user?.role === 'ADMIN') return 'card-glow-blue';
    if (user?.role === 'COORDINATOR') return 'card-glow-blue';
    if (user?.role === 'TRAINER') return 'card-glow-orange';
    return 'card-glow-yellow';
  };

  const getRoleBadgeClass = (role?: string) => {
    if (role === 'ADMIN') return 'badge-glow-blue';
    if (role === 'COORDINATOR') return 'badge-glow-blue';
    if (role === 'TRAINER') return 'badge-glow-orange';
    return 'badge-glow-yellow';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Title Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Platform Settings</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          {user?.role === 'TRAINEE'
            ? 'Configure personal credentials, security preferences, and dashboard settings.'
            : 'Configure personal credentials, password rules, role preferences, and view platform session audit logs.'}
        </p>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            background: activeTab === 'profile' ? 'var(--powder-blue-glow)' : 'transparent',
            color: activeTab === 'profile' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'profile' ? `1px solid ${getAccentColor()}` : '1px solid transparent',
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
          <UserIcon size={16} />
          Personal Profile
        </button>

        <button
          onClick={() => setActiveTab('security')}
          style={{
            background: activeTab === 'security' ? 'var(--powder-blue-glow)' : 'transparent',
            color: activeTab === 'security' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'security' ? `1px solid ${getAccentColor()}` : '1px solid transparent',
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
          <Lock size={16} />
          Security & Password
        </button>

        {user?.role !== 'TRAINEE' && user?.role !== 'ADMIN' && (
          <button
            onClick={() => setActiveTab('preferences')}
            style={{
              background: activeTab === 'preferences' ? 'var(--powder-blue-glow)' : 'transparent',
              color: activeTab === 'preferences' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: activeTab === 'preferences' ? '1px solid var(--border-color)' : '1px solid transparent',
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
        )}

        {user?.role !== 'TRAINEE' && (
          <button
            onClick={() => setActiveTab('activity')}
            style={{
              background: activeTab === 'activity' ? 'var(--powder-blue-glow)' : 'transparent',
              color: activeTab === 'activity' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: activeTab === 'activity' ? '1px solid var(--border-color)' : '1px solid transparent',
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
        )}
      </div>

      {/* Tab Contents */}
      
      {/* Tab 1: Personal Profile */}
      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: user?.role === 'TRAINEE' ? '1fr 1fr' : '1fr', gap: 24, maxWidth: '1100px' }} className="fade-in">
          {/* Profile Form Card */}
          <div className={`card ${getCardGlowClass()}`} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserIcon size={20} color={getAccentColor()} />
              Configure Personal Information
            </h3>
            
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Employee ID */}
              {(user?.employeeId || candidateData?.registrationNumber) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Employee / Registration ID
                  </label>
                  <input
                    type="text"
                    value={user?.employeeId || candidateData?.registrationNumber || ''}
                    disabled
                    className="glass-input"
                    style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14, opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>
              )}

              {/* Role */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Platform Role
                </label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className={getRoleBadgeClass(user?.role)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {user?.role}
                  </span>
                </div>
              </div>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="glass-input"
                    style={{ width: '100%', padding: '12px 42px 12px 12px', borderRadius: 12, fontSize: 14, opacity: 0.7, cursor: 'not-allowed' }}
                  />
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: 14 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Email address acts as login username and is not editable.</span>
              </div>


              {/* Full Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="glass-input"
                  required
                  style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14 }}
                />
              </div>

              {/* Phone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={15} />
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter contact number"
                  className="glass-input"
                  style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14 }}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={savingProfile} style={{ alignSelf: 'flex-start', marginTop: 12 }}>
                {savingProfile ? (
                  <>
                    <MorphLoader inline />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Profile Changes
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Trainee Program Status Card */}
          {user?.role === 'TRAINEE' && (
            <div className="card card-glow-yellow" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <GraduationCap size={20} color="var(--yellow)" />
                Cohort & Academic Status
              </h3>
              
              {loadingCandidate ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <MorphLoader text="Loading cohort status..." />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Batch details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Mapped Cohort</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>{candidateData?.batchName || 'Unassigned Cohort'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>College Source</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>{candidateData?.college || 'N/A'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Foundation Skill Set</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: 'rgba(255, 176, 124, 0.15)', border: '1px solid var(--pale-orange)', color: 'var(--text-primary)'
                      }}>
                        {candidateData?.foundationLanguage || 'Pending Allocation'}
                      </span>
                    </span>
                  </div>

                  {/* Performance Score */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrophyIcon size={15} color="var(--yellow)" />
                        Cumulative Grade Score
                      </span>
                      <span style={{ fontSize: 15, color: 'var(--yellow)', fontWeight: 800 }}>{candidateData?.performanceScore || 0}%</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${candidateData?.performanceScore || 0}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--pale-orange) 0%, var(--yellow) 100%)',
                        boxShadow: '0 0 10px var(--yellow-glow)'
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score represents the weighted average of all marked attendance and assessments.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'security' && (
        <div style={{ maxWidth: '650px' }} className="fade-in">
          <div className={`card ${getCardGlowClass()}`} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Lock size={20} color={getAccentColor()} />
              Update Account Password
            </h3>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Current Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Current Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="glass-input"
                    required
                    style={{ width: '100%', padding: '12px 42px 12px 12px', borderRadius: 12, fontSize: 14 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-input"
                    required
                    style={{ width: '100%', padding: '12px 42px 12px 12px', borderRadius: 12, fontSize: 14 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-input"
                    required
                    style={{ width: '100%', padding: '12px 42px 12px 12px', borderRadius: 12, fontSize: 14 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={savingPassword} style={{ alignSelf: 'flex-start', marginTop: 12 }}>
                {savingPassword ? (
                  <>
                    <MorphLoader inline />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Update Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Dashboard Preferences (Coordinator/Trainer Only) */}
      {activeTab === 'preferences' && user?.role !== 'TRAINEE' && user?.role !== 'ADMIN' && (
        <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 650 }}>
          {user?.role === 'COORDINATOR' ? (
            /* Coordinator preferences card */
            <div className="card card-glow-blue card-static" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                <CustomSelect
                  value={attendanceCutoff}
                  onChange={setAttendanceCutoff}
                  options={[
                    { value: '08:00 AM', label: '08:00 AM' },
                    { value: '08:30 AM', label: '08:30 AM' },
                    { value: '09:00 AM', label: '09:00 AM' },
                    { value: '09:30 AM', label: '09:30 AM' },
                    { value: '10:00 AM', label: '10:00 AM' },
                    { value: '10:30 AM', label: '10:30 AM' }
                  ]}
                  style={{ width: '100%' }}
                />
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
            /* Trainer preferences card layout */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
              <div className="card card-glow-orange card-static" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                  <CustomSelect
                    value={aiDifficulty}
                    onChange={setAiDifficulty}
                    options={[
                      { value: 'Beginner', label: 'Beginner (Foundational concepts)' },
                      { value: 'Intermediate', label: 'Intermediate (Core applications & analysis)' },
                      { value: 'Advanced', label: 'Advanced (Complex debugging & design patterns)' }
                    ]}
                    style={{ width: '100%' }}
                  />
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

              {/* Alert Management Section */}
              <div className="card card-glow-orange" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--pale-orange-glow) 100%)',
                flexWrap: 'wrap',
                gap: 16
              }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)', flexShrink: 0 }}>
                    <Bell size={24} color="var(--pale-orange)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Attendance Alert Management</h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Ensure trainees submit attendance between 9:00 AM and 10:00 AM. 
                      {autoAlertsEnabled ? ' Auto-alerts will fire at 9:45 AM.' : ' Auto-alerts are disabled.'}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Auto Alerts</span>
                    <div 
                      onClick={toggleAutoAlerts}
                      style={{
                        width: 44, height: 24, borderRadius: 12, background: autoAlertsEnabled ? 'var(--powder-blue)' : 'var(--text-muted)',
                        position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 2, left: autoAlertsEnabled ? 22 : 2,
                        transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleManualAlert}
                    className="btn-primary"
                    style={{ 
                      padding: '10px 20px', fontSize: 13,
                    }}>
                    <Zap size={16} /> Send Alert Now
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </form>
      )}

      {/* Tab 4: User Activity Logs (hidden from trainees) */}
      {activeTab === 'activity' && user?.role !== 'TRAINEE' && (
        <div className="card card-glow-blue fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>

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
                <MorphLoader inline />
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
            <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
              <MorphLoader text="Fetching activity records..." />
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
