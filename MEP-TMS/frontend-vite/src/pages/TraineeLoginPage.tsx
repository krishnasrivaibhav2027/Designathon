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
        background: 'var(--bg-page-gradient)',
        transition: 'background 0.3s ease-in-out',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Plus Jakarta Sans, sans-serif'
      }}
    >
      {/* Background shapes for premium visual design */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        opacity: theme === 'light' ? 0.75 : 0.25,
        transition: 'opacity 0.3s ease'
      }}>
        {/* Subtle grid pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: theme === 'light' 
            ? 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 1.5px, transparent 1.5px)' 
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }} />

        {/* Large soft color blobs */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '50vw',
          height: '50vw',
          borderRadius: '50%',
          background: theme === 'light' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(59, 130, 246, 0.03)',
          filter: 'blur(100px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '60vw',
          height: '60vw',
          borderRadius: '50%',
          background: theme === 'light' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(96, 165, 250, 0.02)',
          filter: 'blur(120px)',
        }} />

        {/* Abstract SVG shapes */}
        <svg style={{
          position: 'absolute',
          top: '20%',
          left: '3%',
          width: '120px',
          height: '120px',
          opacity: 0.8,
          color: theme === 'light' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.02)'
        }} fill="none" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
        </svg>

        <svg style={{
          position: 'absolute',
          bottom: '20%',
          right: '5%',
          width: '160px',
          height: '160px',
          opacity: 0.8,
          color: theme === 'light' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.015)'
        }} fill="none" viewBox="0 0 100 100">
          <rect x="10" y="10" width="80" height="80" rx="10" stroke="currentColor" strokeWidth="2" strokeDasharray="10 5" transform="rotate(15 50 50)" />
        </svg>

        <svg style={{
          position: 'absolute',
          top: '45%',
          right: '20%',
          width: '80px',
          height: '80px',
          opacity: 0.6,
          color: theme === 'light' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.02)'
        }} fill="none" viewBox="0 0 100 100">
          <polygon points="50,15 90,85 10,85" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" transform="rotate(45 50 50)" />
        </svg>
      </div>

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
          background: theme === 'light' ? '#3C2CDA' : 'transparent',
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
            background: theme === 'dark' ? '#1e293b' : '#ffffff',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 48px',
            overflow: 'hidden',
            borderRight: '1px solid var(--border-color)',
            transition: 'all 0.3s ease-in-out',
          }}
        >
          {/* Internal Glow Accents Removed */}

          {/* Left Panel Top Header */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--powder-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'none',
            }}>
              <Sparkles size={18} color="#ffffff" strokeWidth={2.5} />
            </div>
            <span style={{ 
              fontSize: 18, 
              fontWeight: 900, 
              color: theme === 'dark' ? '#ffffff' : '#121824', 
              letterSpacing: -0.5, 
              fontFamily: 'Plus Jakarta Sans, sans-serif',
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
                fontFamily: 'Plus Jakarta Sans, sans-serif',
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
                  background: 'var(--powder-blue-glow)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <User size={18} color="var(--powder-blue)" />
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
                  background: 'var(--powder-blue-glow)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Lock size={18} color="var(--powder-blue)" />
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
                  background: 'var(--pale-orange-glow)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Sparkles size={18} color="var(--pale-orange)" />
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
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: -0.5 }}>
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
                      e.target.style.borderColor = 'var(--powder-blue)';
                      e.target.style.boxShadow = '0 0 0 2px var(--powder-blue-glow)';
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
                      e.target.style.borderColor = 'var(--powder-blue)';
                      e.target.style.boxShadow = '0 0 0 2px var(--powder-blue-glow)';
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
                    fontSize: 12.5, color: 'var(--powder-blue)', fontWeight: 600,
                    padding: 0, transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--powder-blue)'}
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
                  background: 'var(--powder-blue)',
                  color: '#ffffff', border: 'none', fontWeight: 600,
                  fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', marginTop: 8,
                  boxShadow: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
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
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--powder-blue)'}
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
                      onFocus={e => { e.target.style.borderColor = 'var(--powder-blue)'; e.target.style.boxShadow = '0 0 0 2px var(--powder-blue-glow)'; }}
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
                        background: 'var(--powder-blue)',
                        color: '#ffffff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
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
                    background: 'var(--powder-blue)',
                    color: '#ffffff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
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
