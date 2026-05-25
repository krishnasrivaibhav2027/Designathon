import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, User, Eye, EyeOff, Loader2, Sparkles, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function TraineeLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('mep-theme') as 'light' | 'dark') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
      localStorage.setItem('mep-theme', theme);
    } catch {}
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/trainee-login', {
        username,
        password
      });

      if (response.data) {
        const { accessToken, user } = response.data;
        login(accessToken, user);
        toast.success(`Welcome to Maverick One, ${user.fullName}!`);
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('[Trainee Login Error]', error);
      const errorMsg = error.response?.data?.detail || 'Invalid credentials or access denied.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: theme === 'dark'
        ? 'radial-gradient(circle at 75% 25%, rgba(249, 165, 27, 0.08) 0%, transparent 45%), radial-gradient(circle at 25% 75%, rgba(14, 165, 233, 0.12) 0%, transparent 50%), linear-gradient(135deg, #07090e 0%, #0f1420 100%)'
        : 'radial-gradient(circle at 75% 25%, rgba(249, 165, 27, 0.12) 0%, transparent 45%), radial-gradient(circle at 25% 75%, rgba(14, 165, 233, 0.18) 0%, transparent 50%), linear-gradient(135deg, #eef6ff 0%, #dbeafe 100%)',
      transition: 'background 0.5s ease-in-out',
      width: '100vw',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Outfit, sans-serif',
      padding: '24px'
    }}>
      
      {/* Theme Switcher */}
      <button 
        onClick={handleToggleTheme}
        style={{
          position: 'absolute', top: 24, right: 24,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '50%', width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.3s', zIndex: 10
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {theme === 'dark' ? <Sun size={20} color="#f9a51b" /> : <Moon size={20} color="#0f172a" />}
      </button>

      {/* Main Glassmorphic Card */}
      <div style={{
        background: theme === 'dark' ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(20px)',
        borderRadius: '32px',
        border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.06)',
        width: '100%',
        maxWidth: '460px',
        padding: '48px 40px',
        boxShadow: theme === 'dark' 
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(14, 165, 233, 0.03)' 
          : '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 5
      }}>
        
        {/* Logo / Sparkles */}
        <div style={{
          width: 56, height: 56, borderRadius: '18px',
          background: 'linear-gradient(135deg, #f9a51b, #fac95a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(249, 165, 27, 0.25)',
          marginBottom: 24
        }}>
          <Sparkles size={24} color="#131313" strokeWidth={2.5} />
        </div>

        <h1 style={{
          fontSize: '28px', fontWeight: 800,
          color: theme === 'dark' ? '#f8fafc' : '#0f172a',
          margin: '0 0 8px 0', textAlign: 'center',
          letterSpacing: '-0.02em'
        }}>Trainee Portal</h1>
        
        <p style={{
          fontSize: '14px', color: theme === 'dark' ? '#94a3b8' : '#64748b',
          margin: '0 0 36px 0', textAlign: 'center', fontWeight: 500
        }}>
          Enter your onboarding credentials to access the training hub.
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Employee ID or Email Input */}
          <div>
            <label style={{
              display: 'block', fontSize: '11px', fontWeight: 700,
              color: theme === 'dark' ? '#94a3b8' : '#475569',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8
            }}>
              Employee ID or Email
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', color: '#94a3b8'
              }}>
                <User size={18} />
              </div>
              <input
                type="text"
                placeholder="e.g. MAV-001 or trainee@email.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%', padding: '14px 16px 14px 48px', borderRadius: '14px',
                  border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                  background: theme === 'dark' ? 'rgba(15,23,42,0.3)' : '#f8fafc',
                  color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                  fontSize: '14px', fontWeight: 500, outline: 'none', transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#f9a51b';
                  e.target.style.boxShadow = '0 0 0 3px rgba(249,165,27,0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label style={{
              display: 'block', fontSize: '11px', fontWeight: 700,
              color: theme === 'dark' ? '#94a3b8' : '#475569',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', color: '#94a3b8'
              }}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '14px 48px 14px 48px', borderRadius: '14px',
                  border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                  background: theme === 'dark' ? 'rgba(15,23,42,0.3)' : '#f8fafc',
                  color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                  fontSize: '14px', fontWeight: 500, outline: 'none', transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#f9a51b';
                  e.target.style.boxShadow = '0 0 0 3px rgba(249,165,27,0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #f9a51b, #fac95a)',
              color: '#131313', border: 'none', fontWeight: 700,
              fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', marginTop: 12,
              boxShadow: '0 8px 20px rgba(249, 165, 27, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>

        {/* Footer info / Back to portal */}
        <button
          onClick={() => navigate('/login')}
          style={{
            marginTop: 32, background: 'transparent', border: 'none',
            color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#f9a51b'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
        >
          Are you a Trainer or Coordinator? Login here
        </button>
      </div>
    </div>
  );
}
