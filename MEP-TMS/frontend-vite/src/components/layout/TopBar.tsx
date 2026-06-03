import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Bot, Sun, Moon, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useLocation, Link } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface TopBarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function TopBar({ theme, onToggleTheme }: TopBarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [myCandidates, setMyCandidates] = useState<any[]>([]);
  const [activeBatchId, setActiveBatchId] = useState('');
  const [reportingToName, setReportingToName] = useState('');

  // ── Salutation ──────────────────────────────────────────────────────────────
  const getSalutation = () => {
    if (user?.isFirstLogin) return 'Welcome';
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Good morning';
    if (hr >= 12 && hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // ── Trainee cohort fetch ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTraineeCandidates = async () => {
      if (user?.role === 'TRAINEE') {
        try {
          const res = await api.get('/users/me/candidates');
          let data = res.data || [];

          if (user?.email === 'arunodayashine@gmail.com') {
            const pythonBatchId = 'fe0e6972-51de-4eec-8cf7-ff54863bb099';
            const hasPythonBatch = data.some((c: any) => c.batchId === pythonBatchId);
            if (!hasPythonBatch) {
              data.push({
                id: 'cff51548-a0b1-4fb7-bc86-f20fa4e04460',
                email: 'arunodayashine@gmail.com',
                fullName: 'Aruna Grandhi',
                registrationNumber: 'MAV-001-STREAM',
                batchId: pythonBatchId,
                phone: '+919845612378',
                performanceScore: 0,
                progress: { completed_days: [], current_day: 1 },
                batchName: 'Data Engineering - Python',
              });
            }
          }

          setMyCandidates(data);
          const stored = localStorage.getItem('active_trainee_batch_id');
          if (data.length > 0) {
            const isValid = data.some((c: any) => c.batchId === stored);
            if (isValid && stored) {
              setActiveBatchId(stored);
            } else {
              const defaultBatch = data[0].batchId;
              localStorage.setItem('active_trainee_batch_id', defaultBatch);
              setActiveBatchId(defaultBatch);
            }
          }
        } catch (err) {
          console.error('Failed to load trainee cohorts:', err);
        }
      }
    };
    fetchTraineeCandidates();
  }, [user]);

  // ── Reporting-to resolution ────────────────────────────────────────────────
  useEffect(() => {
    const resolveReportingTo = async () => {
      if (!user) return;
      if (user.role === 'ADMIN') { setReportingToName('Board of Directors'); return; }
      if (user.role === 'COORDINATOR') { setReportingToName('Sanjay'); return; }
      if (user.role === 'TRAINEE') {
        const batchId = activeBatchId || localStorage.getItem('active_trainee_batch_id');
        if (!batchId) { setReportingToName('Unassigned Trainer'); return; }
        try {
          const res = await api.get(`/batch/${batchId}`);
          const trainers = res.data?.trainers || [];
          setReportingToName(trainers.length > 0 ? trainers[0] : 'Unassigned Trainer');
        } catch { setReportingToName('Unassigned Trainer'); }
        return;
      }
      if (user.role === 'TRAINER') {
        try {
          const batchListRes = await api.get('/batch/list');
          const trainerBatches = batchListRes.data || [];
          if (trainerBatches.length > 0) {
            const creatorId = trainerBatches[0].createdBy || '';
            if (creatorId) {
              const coordRes = await api.get('/users/coordinators');
              const coordData = coordRes.data?.data || [];
              const matchedCoord = coordData.find((c: any) => c.id === creatorId);
              setReportingToName(matchedCoord?.fullName || matchedCoord?.full_name || 'Eswara');
            } else { setReportingToName('Eswara'); }
          } else { setReportingToName('Eswara'); }
        } catch { setReportingToName('Eswara'); }
      }
    };
    resolveReportingTo();
  }, [user, activeBatchId]);

  const handleBatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBatchId = e.target.value;
    localStorage.setItem('active_trainee_batch_id', newBatchId);
    setActiveBatchId(newBatchId);
    toast.success('Switched active cohort context!');
    setTimeout(() => window.location.reload(), 500);
  };

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
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <header style={{
      height: 72,
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      background: theme === 'dark' ? 'rgba(18, 24, 36, 0.35)' : 'rgba(255, 255, 255, 0.45)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--border-color)',
      borderTop: 'none',
      borderRadius: '0 0 24px 24px',
      boxShadow: theme === 'dark'
        ? '0 8px 32px rgba(0, 0, 0, 0.25), 0 0 15px rgba(112, 214, 255, 0.05)'
        : '0 8px 32px rgba(0, 0, 0, 0.05)',
      transition: 'background 0.3s ease, box-shadow 0.3s ease',
    }}>

      {/* ── Left: Salutation ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease', minWidth: 0 }}>
        <h1 style={{
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--text-primary)',
          fontFamily: 'Outfit, sans-serif',
          letterSpacing: '-0.5px',
          margin: 0,
          whiteSpace: 'nowrap',
        }}>
          {getSalutation()}, {user?.fullName?.split(' ')[0] || 'User'}
        </h1>
      </div>

      {/* ── Center: Brand (absolutely centered) ──────────────────────────── */}
      <div style={{
        position: 'absolute',
        left: '46%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #1e40af, #70d6ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(112, 214, 255, 0.25)',
            flexShrink: 0,
          }}>
            <Zap size={18} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: 20, fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
            }}>
              Maverick One
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: 'var(--powder-blue)',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginTop: 1,
            }}>
              Training Management System
            </span>
          </div>
        </div>
      </div>

      {/* ── Right: Actions ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Active Cohort Switcher (Trainee only) */}
        {user?.role === 'TRAINEE' && myCandidates.length > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 12,
            background: 'var(--powder-blue-glow)', border: '1px solid var(--powder-blue)',
            color: 'var(--powder-blue)', fontWeight: 700, fontSize: 13,
            boxShadow: '0 2px 8px var(--powder-blue-glow)',
          }}>
            <Bot size={16} />
            <select
              value={activeBatchId}
              onChange={handleBatchChange}
              style={{ background: 'transparent', border: 'none', color: 'inherit', fontWeight: 'inherit', outline: 'none', cursor: 'pointer', maxWidth: 160 }}
            >
              {myCandidates.map(cand => (
                <option key={cand.id || cand._id} value={cand.batchId} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  {cand.batchName || cand.batchId}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reporting To */}
        {user && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Reporting To
            </span>
            <span style={{ fontSize: 13, color: 'var(--pale-orange)', fontWeight: 700 }}>
              {reportingToName || 'Loading...'}
            </span>
          </div>
        )}

        {/* Theme Toggle */}
        <div
          onClick={onToggleTheme}
          style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'var(--bg-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            border: '1px solid var(--border-color)',
            backdropFilter: 'var(--card-blur)',
            boxShadow: 'var(--shadow-card)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05) rotate(15deg)';
            e.currentTarget.style.borderColor = 'var(--yellow)';
            e.currentTarget.style.boxShadow = '0 0 12px var(--yellow-glow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.boxShadow = 'var(--shadow-card)';
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={20} color="var(--yellow)" /> : <Moon size={20} color="var(--pale-orange)" />}
        </div>

        {/* Notifications Bell */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: unreadCount > 0 ? 'var(--pale-orange-glow)' : 'var(--bg-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
              border: unreadCount > 0 ? '1px solid var(--pale-orange)' : '1px solid var(--border-color)',
              backdropFilter: 'var(--card-blur)',
              boxShadow: 'var(--shadow-card)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.borderColor = 'var(--pale-orange)';
              e.currentTarget.style.boxShadow = '0 0 12px var(--pale-orange-glow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.borderColor = unreadCount > 0 ? 'var(--pale-orange)' : 'var(--border-color)';
              e.currentTarget.style.boxShadow = 'var(--shadow-card)';
            }}
          >
            <Bell size={20} color={unreadCount > 0 ? 'var(--pale-orange)' : 'var(--text-secondary)'} />
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: -3, right: -3,
                minWidth: 18, height: 18, borderRadius: '50%',
                background: '#ff6b6b', border: '2px solid var(--bg-card)',
                color: '#fff', fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', boxShadow: '0 0 8px rgba(255, 107, 107, 0.4)',
              }}>
                {unreadCount}
              </div>
            )}
          </div>

          {showNotifDropdown && (
            <div style={{
              position: 'absolute', right: 0, top: 54, width: 340,
              background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border-color)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)', overflow: 'hidden',
              backdropFilter: 'var(--card-blur)',
              animation: 'fadeIn 0.25s ease-out',
            }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(135, 206, 235, 0.05)',
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</h4>
                {unreadCount > 0 && (
                  <button
                    onClick={() => { markAllAsRead(); setShowNotifDropdown(false); }}
                    style={{ border: 'none', background: 'transparent', color: 'var(--pale-orange)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <Bell size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>No notifications yet.</p>
                  </div>
                ) : (
                  <>
                    {notifications.slice(0, 5).map((notif) => (
                      <div key={notif.id} style={{
                        padding: '14px 20px', borderBottom: '1px solid var(--border-color)',
                        background: notif.is_read ? 'transparent' : 'var(--powder-blue-glow)',
                        display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'background 0.2s',
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: notif.is_read ? 'transparent' : '#ff6b6b', marginTop: 6, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: notif.is_read ? 500 : 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>{notif.message}</p>
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}>{formatNotifTime(notif.created_at)}</span>
                        </div>
                        {!notif.is_read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            style={{ border: 'none', background: 'var(--pale-orange-glow)', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--pale-orange)' }}
                          >
                            <Check size={12} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    ))}
                    {notifications.length > 5 && (
                      <div style={{ padding: '12px 20px', textAlign: 'center', borderTop: '1px solid var(--border-color)', background: 'rgba(255, 165, 0, 0.03)' }}>
                        <span style={{ fontSize: 11, color: 'var(--pale-orange)', fontWeight: 700 }}>More than 5 activities. View all in the Recent Activities section.</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <Link to="/settings" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textDecoration: 'none' }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'linear-gradient(135deg, var(--pale-orange), var(--yellow))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#121824', fontWeight: 800, fontSize: 16,
              boxShadow: '0 4px 10px var(--pale-orange-glow)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ display: 'none', md: 'block' } as any}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.fullName || 'User'}</p>
            <p style={{ fontSize: 11, color: 'var(--pale-orange)', fontWeight: 700, letterSpacing: 0.5, lineHeight: 1.2 }}>{user?.role}</p>
          </div>
        </Link>

      </div>
    </header>
  );
}
