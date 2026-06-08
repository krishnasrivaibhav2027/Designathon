import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, User, Eye, EyeOff, Sparkles, Sun, Moon, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';
import MorphLoader from '@/components/MorphLoader';

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

  // Forgot password states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [devResetLink, setDevResetLink] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      if (res.data?.debugLink) {
        setDevResetLink(res.data.debugLink);
      } else {
        setDevResetLink('');
      }
    } catch {
      // Always show success to avoid email enumeration
      setDevResetLink('');
    } finally {
      setForgotLoading(false);
      setForgotSent(true);
    }
  };

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
    <div 
      className="auth-outer-canvas"
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme === 'dark'
          ? 'radial-gradient(circle at 75% 25%, rgba(249, 165, 27, 0.08) 0%, transparent 45%), radial-gradient(circle at 25% 75%, rgba(14, 165, 233, 0.12) 0%, transparent 50%), linear-gradient(135deg, #07090e 0%, #0f1420 100%)'
          : 'radial-gradient(circle at 75% 25%, rgba(249, 165, 27, 0.12) 0%, transparent 45%), radial-gradient(circle at 25% 75%, rgba(14, 165, 233, 0.18) 0%, transparent 50%), linear-gradient(135deg, #eef6ff 0%, #dbeafe 100%)',
        transition: 'background 0.5s ease-in-out',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Outfit, sans-serif'
      }}
    >
      {/* Custom Styles */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .auth-outer-canvas {
          padding: 0;
        }
        @media (max-width: 960px) {
          .auth-outer-canvas {
            padding: 0 !important;
          }
          .auth-frame-container {
            border: none !important;
            border-radius: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            min-height: 100vh !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }
          .auth-left-panel {
            display: none !important;
          }
          .auth-right-panel {
            padding: 24px 16px !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Outer framed container */}
      <div 
        className="auth-frame-container"
        style={{
          width: '100vw',
          height: '100vh',
          background: theme === 'dark' ? 'rgba(22, 26, 33, 0.45)' : 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'var(--card-blur)',
          WebkitBackdropFilter: 'var(--card-blur)',
          border: 'none',
          borderRadius: 0,
          boxShadow: 'none',
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          transition: 'all 0.5s ease-in-out',
        }}
      >
        {/* Left Illustration / Slide Panel */}
        <div 
          className="auth-left-panel"
          style={{
            flex: 1,
            background: theme === 'dark' 
              ? 'radial-gradient(circle at 20% 20%, rgba(249, 165, 27, 0.06) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(14, 165, 233, 0.08) 0%, transparent 50%), linear-gradient(135deg, #090c15 0%, #121824 100%)'
              : 'radial-gradient(circle at 20% 20%, rgba(249, 165, 27, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(14, 165, 233, 0.12) 0%, transparent 50%), linear-gradient(135deg, #e0f2fe 0%, #f0f7ff 100%)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 48px',
            overflow: 'hidden',
            borderRight: '1px solid var(--border-color)',
            transition: 'all 0.5s ease-in-out',
          }}
        >
          {/* Internal Glow Accents */}
          <div style={{ position: 'absolute', top: '-20%', left: '-20%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(249, 165, 27, 0.05)', filter: 'blur(60px)', opacity: 0.5, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-20%', right: '-20%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(14, 165, 233, 0.08)', filter: 'blur(60px)', opacity: 0.5, pointerEvents: 'none' }} />

          {/* Left Panel Top Header */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #f9a51b, #fac95a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(249, 165, 27, 0.2)',
            }}>
              <Sparkles size={18} color="#121824" strokeWidth={2.5} />
            </div>
            <span style={{ 
              fontSize: 18, 
              fontWeight: 900, 
              color: theme === 'dark' ? '#ffffff' : '#121824', 
              letterSpacing: -0.5, 
              fontFamily: 'Outfit, sans-serif',
              transition: 'color 0.5s ease-in-out'
            }}>
              Maverick One
            </span>
          </div>

          {/* Static Briefing Text */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 28, margin: '40px 0' }}>
            <div>
              <h2 style={{
                fontSize: '28px',
                fontWeight: 900,
                color: theme === 'dark' ? '#ffffff' : '#121824',
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                fontFamily: 'Outfit, sans-serif',
                marginBottom: 8,
              }}>
                Accelerate Your Learning<br />Journey
              </h2>
              <p style={{
                fontSize: '14px',
                color: theme === 'dark' ? '#94a3b8' : '#475569',
                fontWeight: 500,
                lineHeight: 1.5,
              }}>
                Access onboarding tracks, compete on live leaderboards, and supercharge your coding skills with AI.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Feature 1 */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(249, 165, 27, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <User size={18} color="#f9a51b" />
                </div>
                <div>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Onboarding & Tracks</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Access your assigned courses, view daily session timelines, and submit onboarding records directly.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(14, 165, 233, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Lock size={18} color="#0ea5e9" />
                </div>
                <div>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Assessments & Leaderboards</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Take custom testing assignments, view graded feedback, and scale the real-time achievement ranking board.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(250, 201, 90, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Sparkles size={18} color="#fac95a" />
                </div>
                <div>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Intelligent AI Assistant</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Use the integrated AI chat companion for immediate tutoring, codebase context, and code evaluation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Panel Footer */}
          <div style={{ position: 'relative', zIndex: 2, fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
            © {new Date().getFullYear()} Maverick One. All rights reserved.
          </div>
        </div>

        {/* Right Form Panel */}
        <div 
          className="auth-right-panel"
          style={{
            flex: 1.1,
            padding: '48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'transparent',
          }}
        >
          {/* Auth Glass Card */}
          <div 
            style={{
              width: '100%',
              maxWidth: '400px',
              background: 'var(--bg-card)',
              backdropFilter: 'var(--card-blur)',
              WebkitBackdropFilter: 'var(--card-blur)',
              border: '1px solid var(--border-color)',
              borderRadius: 24,
              padding: '36px 32px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-card)',
              zIndex: 5
            }}
          >
            {/* Form Header */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', letterSpacing: -0.5 }}>
                Trainee Portal
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, fontWeight: 500 }}>
                Enter your onboarding credentials to access the hub.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Employee ID or Email Input */}
              <div>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6
                }}>
                  Employee ID or Email
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    display: 'flex', alignItems: 'center', color: 'var(--text-muted)'
                  }}>
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="MAV-001 or trainee@email.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px', fontWeight: 500, outline: 'none', transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#f9a51b';
                      e.target.style.boxShadow = '0 0 0 3px rgba(249,165,27,0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    display: 'flex', alignItems: 'center', color: 'var(--text-muted)'
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
                      width: '100%', padding: '12px 42px 12px 42px', borderRadius: 12,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px', fontWeight: 500, outline: 'none', transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#f9a51b';
                      e.target.style.boxShadow = '0 0 0 3px rgba(249,165,27,0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: -4 }}>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(true); setForgotSent(false); setForgotEmail(''); setDevResetLink(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600,
                    padding: 0, transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f9a51b'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f9a51b, #fac95a)',
                  color: '#131313', border: 'none', fontWeight: 700,
                  fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', marginTop: 8,
                  boxShadow: '0 8px 20px rgba(249, 165, 27, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(1.015)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {loading ? (
                  <>
                    <MorphLoader inline />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In to Dashboard</span>
                )}
              </button>
            </form>

            {/* Back to Coordinator / Trainer portal */}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--text-secondary)', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#f9a51b'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                Are you a Trainer or Coordinator? Login here
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Forgot Password Modal ─────────────────────────────────────── */}
      {showForgotModal && (
        <div
          onClick={() => setShowForgotModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 420,
              background: theme === 'dark' ? 'rgba(15,23,42,0.95)' : '#ffffff',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
              borderRadius: 20, padding: '32px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column', gap: 20,
            }}
          >
            {!forgotSent ? (
              <>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: theme === 'dark' ? '#f8fafc' : '#0f172a', margin: 0 }}>
                    Reset your password
                  </h3>
                  <p style={{ fontSize: 13, color: theme === 'dark' ? '#94a3b8' : '#64748b', marginTop: 6, lineHeight: 1.5 }}>
                    Enter your registered email address and we'll send you a reset link. Valid for 1 hour.
                  </p>
                </div>
                <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      style={{
                        width: '100%', padding: '12px 14px 12px 40px', borderRadius: 12,
                        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                        background: theme === 'dark' ? 'rgba(15,23,42,0.5)' : '#f8fafc',
                        color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                        fontSize: 14, outline: 'none', transition: 'all 0.2s',
                      }}
                      onFocus={e => { e.target.style.borderColor = '#f9a51b'; e.target.style.boxShadow = '0 0 0 3px rgba(249,165,27,0.15)'; }}
                      onBlur={e => { e.target.style.borderColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      style={{
                        flex: 1, padding: '11px', borderRadius: 12,
                        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                        background: 'transparent',
                        color: theme === 'dark' ? '#94a3b8' : '#64748b',
                        fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      style={{
                        flex: 2, padding: '11px', borderRadius: 12, border: 'none',
                        background: 'linear-gradient(135deg, #f9a51b, #fac95a)',
                        color: '#131313', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        opacity: forgotLoading ? 0.75 : 1,
                      }}
                    >
                      {forgotLoading ? <MorphLoader inline /> : null}
                      {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Mail size={26} color="#22c55e" />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: theme === 'dark' ? '#f8fafc' : '#0f172a', margin: 0 }}>
                    Check your inbox
                  </h3>
                  <p style={{ fontSize: 13, color: theme === 'dark' ? '#94a3b8' : '#64748b', marginTop: 8, lineHeight: 1.6 }}>
                    If <strong>{forgotEmail}</strong> is registered, a reset link has been sent. Check your spam folder too.
                  </p>
                </div>
                {devResetLink && (
                  <div style={{
                    alignSelf: 'stretch', marginTop: 8, padding: 12, borderRadius: 12,
                    background: 'rgba(249,165,27,0.1)', border: '1px dashed #f9a51b',
                    textAlign: 'left', fontSize: 12.5
                  }}>
                    <span style={{ color: '#f9a51b', fontWeight: 700, display: 'block', marginBottom: 4 }}>🔧 [Dev Mode] Bypass Link:</span>
                    <a href={devResetLink} style={{ color: 'var(--powder-blue)', wordBreak: 'break-all', fontWeight: 600 }}>
                      {devResetLink}
                    </a>
                  </div>
                )}
                <button
                  onClick={() => setShowForgotModal(false)}
                  style={{
                    padding: '10px 28px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #f9a51b, #fac95a)',
                    color: '#131313', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
