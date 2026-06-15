import React, { useState } from 'react';
import { ShieldAlert, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import toast from 'react-hot-toast';
import MorphLoader from '@/components/MorphLoader';

export default function FirstTimePasswordReset() {
  const { user, updateUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Toggle visibility of fields
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password rules checks
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasLetter = /[a-zA-Z]/.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Please enter your current temporary password.');
      return;
    }

    if (!hasMinLength || !hasNumber || !hasLetter) {
      toast.error('Your new password does not meet the complexity requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      toast.error('New password cannot be the same as your temporary password.');
      return;
    }

    setLoading(true);
    try {
      await api.put('/users/me/change-password', {
        currentPassword,
        newPassword,
      });

      toast.success('Password updated successfully! Welcome to Maverick One.');
      
      // Update the user context state to indicate first login is completed
      updateUser({ isFirstLogin: false });
    } catch (err: any) {
      console.error('Password reset failed:', err);
      const errMsg = err.response?.data?.detail || 'Failed to update password. Please check your current password.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(circle at 10% 20%, rgba(112, 214, 255, 0.08) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(255, 160, 89, 0.06) 0%, transparent 45%), linear-gradient(135deg, #0d0f12 0%, #15181e 100%)',
      color: 'var(--text-primary)',
      fontFamily: 'Plus Jakarta Sans, sans-serif'
    }}>
      <div className="card card-glow-orange fade-in" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '40px',
        background: 'rgba(22, 26, 33, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '28px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Warning Badge */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'rgba(255, 160, 89, 0.12)',
            border: '2px solid var(--pale-orange)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(255, 160, 89, 0.25)'
          }}>
            <ShieldAlert size={32} color="var(--pale-orange)" />
          </div>
        </div>

        {/* Header Text */}
        <h2 style={{
          fontSize: '26px',
          fontWeight: 800,
          textAlign: 'center',
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px'
        }}>
          Mandatory Password Update
        </h2>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          marginTop: '10px',
          lineHeight: '1.6'
        }}>
          Welcome, <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{user?.fullName}</span>! Because this is your first time logging in, you must change your temporary password immediately to activate and secure your account.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
          
          {/* Current Temporary Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Temporary Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter temporary password"
                className="glass-input"
                required
                style={{
                  width: '100%',
                  padding: '12px 46px 12px 42px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  height: '46px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '13px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                className="glass-input"
                required
                style={{
                  width: '100%',
                  padding: '12px 46px 12px 42px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  height: '46px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '13px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Confirm New Password
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="glass-input"
                required
                style={{
                  width: '100%',
                  padding: '12px 46px 12px 42px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  height: '46px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '13px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Password complexity hints */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasMinLength ? 'var(--powder-blue)' : 'var(--text-muted)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: hasMinLength ? 'var(--powder-blue)' : 'var(--text-muted)' }} />
              At least 8 characters long
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasLetter ? 'var(--powder-blue)' : 'var(--text-muted)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: hasLetter ? 'var(--powder-blue)' : 'var(--text-muted)' }} />
              Must contain letters (a-z)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasNumber ? 'var(--powder-blue)' : 'var(--text-muted)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: hasNumber ? 'var(--powder-blue)' : 'var(--text-muted)' }} />
              Must contain numbers (0-9)
            </div>
          </div>

          {/* Submit / Logout Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            <button
              type="submit"
              disabled={loading || !hasMinLength || !hasNumber || !hasLetter}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                height: '46px',
                fontSize: '14px',
                opacity: (loading || !hasMinLength || !hasNumber || !hasLetter) ? 0.6 : 1,
                cursor: (loading || !hasMinLength || !hasNumber || !hasLetter) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <>
                  <MorphLoader inline />
                  Updating Password...
                </>
              ) : (
                'Activate Account'
              )}
            </button>

            <button
              type="button"
              onClick={logout}
              className="btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'center',
                height: '46px',
                fontSize: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              Cancel & Sign Out
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
