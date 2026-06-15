import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Zap, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import MorphLoader from '@/components/MorphLoader';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenError, setTokenError] = useState(!token);

  // Password strength
  const strength = (() => {
    if (newPassword.length === 0) return 0;
    let s = 0;
    if (newPassword.length >= 8) s++;
    if (/[A-Z]/.test(newPassword)) s++;
    if (/[0-9]/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Reset failed. The link may have expired.';
      toast.error(msg);
      if (err?.response?.status === 400) setTokenError(true);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '13px 44px',
    borderRadius: 12,
    border: `1px solid ${focused ? 'var(--powder-blue)' : 'var(--border-color)'}`,
    boxShadow: focused ? '0 0 10px var(--powder-blue-glow)' : 'none',
    fontSize: 14,
    outline: 'none',
    background: 'var(--bg-main)',
    color: 'var(--text-primary)',
    fontWeight: 500,
    transition: 'all 0.2s',
  });

  const [focusNew, setFocusNew] = useState(false);
  const [focusConfirm, setFocusConfirm] = useState(false);

  // ── Invalid / missing token ──────────────────────────────────────────────
  if (tokenError) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-page-gradient)',
        padding: 24,
      }}>
        <div style={{
          maxWidth: 420, width: '100%', background: 'var(--bg-card)',
          border: '1px solid var(--border-color)', borderRadius: 24, padding: '40px 36px',
          boxShadow: 'var(--shadow-card)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <AlertCircle size={48} color="#ef4444" />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Invalid or Expired Link
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            This password reset link is invalid or has already expired. Reset links are valid for 1 hour.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
            style={{ marginTop: 8, padding: '12px 28px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <ArrowLeft size={16} /> Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-page-gradient)',
        padding: 24,
      }}>
        <div style={{
          maxWidth: 420, width: '100%', background: 'var(--bg-card)',
          border: '1px solid var(--border-color)', borderRadius: 24, padding: '40px 36px',
          boxShadow: 'var(--shadow-card)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle size={36} color="#22c55e" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Password Updated!
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
            style={{ marginTop: 8, padding: '12px 28px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            Sign In Now
          </button>
        </div>
      </div>
    );
  }

  // ── Reset form ───────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-page-gradient)',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 440, width: '100%', background: 'var(--bg-card)',
        backdropFilter: 'var(--card-blur)', border: '1px solid var(--border-color)',
        borderRadius: 24, padding: '40px 36px', boxShadow: 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--powder-blue), var(--pale-orange))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px var(--powder-blue-glow)',
          }}>
            <Zap size={18} color="#121824" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: 0 }}>
              Set New Password
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
              MEP-TMS · Maverick One
            </p>
          </div>
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          Choose a strong password. It must be at least 8 characters long.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* New Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                style={inputStyle(focusNew)}
                onFocus={() => setFocusNew(true)}
                onBlur={() => setFocusNew(false)}
              />
              <button
                type="button"
                onClick={() => setShowNew(p => !p)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength bar */}
            {newPassword.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: i <= strength ? strengthColor : 'var(--border-color)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                style={{
                  ...inputStyle(focusConfirm),
                  borderColor: confirmPassword && confirmPassword !== newPassword ? '#ef4444' : (focusConfirm ? 'var(--powder-blue)' : 'var(--border-color)'),
                }}
                onFocus={() => setFocusConfirm(true)}
                onBlur={() => setFocusConfirm(false)}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(p => !p)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Passwords do not match</span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || newPassword !== confirmPassword || newPassword.length < 8}
            style={{
              padding: '13px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700,
              background: 'var(--powder-blue)',
              color: '#ffffff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: 'none', transition: 'all 0.2s',
              opacity: (loading || newPassword !== confirmPassword || newPassword.length < 8) ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {loading ? <MorphLoader inline /> : <Lock size={16} />}
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>

        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={14} /> Back to Login
        </button>
      </div>
    </div>
  );
}
