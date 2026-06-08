import MorphLoader from '@/components/MorphLoader';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Activity, ChevronRight, Eye, EyeOff, Lock, Mail, Moon, Sparkles, Sun, TrendingUp, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

interface LoginPageProps {
  initialFlipped?: boolean;
}

export default function LoginPage({ initialFlipped = false }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
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
    } catch { }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

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
      setForgotSent(true);
    } catch {
      // Always show success to avoid email enumeration
      setDevResetLink('');
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  };

  // Carousel slideshow states removed - static layout implemented below

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const credential = loginEmail.trim();
    const isEmail = credential.includes('@');
    try {
      let response;
      if (isEmail) {
        response = await api.post('/auth/login', {
          email: credential,
          password: loginPassword
        });
      } else {
        response = await api.post('/auth/trainee-login', {
          username: credential,
          password: loginPassword
        });
      }

      if (response.data) {
        const { accessToken, user } = response.data;
        login(accessToken, user);
        toast.success(`Welcome back, ${user.fullName}!`);
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('[Login Error]', error);
      const errorMsg = error.response?.data?.detail || 'Invalid email, employee ID, or password. Please try again.';
      toast.error(errorMsg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handlePrefill = (prefilledEmail: string) => {
    setLoginEmail(prefilledEmail);
    setLoginPassword('Password123'); // Standard testing password
    toast.success(`Prefilled test account: ${prefilledEmail}`);
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
          ? 'radial-gradient(circle at 75% 25%, rgba(255, 160, 89, 0.12) 0%, transparent 45%), radial-gradient(circle at 25% 75%, rgba(112, 214, 255, 0.18) 0%, transparent 50%), linear-gradient(135deg, #07090e 0%, #0f1420 100%)'
          : 'radial-gradient(circle at 75% 25%, rgba(255, 176, 124, 0.18) 0%, transparent 45%), radial-gradient(circle at 25% 75%, rgba(135, 206, 235, 0.28) 0%, transparent 50%), linear-gradient(135deg, #eef6ff 0%, #dbeafe 100%)',
        transition: 'background 0.5s ease-in-out',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Custom Styles */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        @keyframes slideDownIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
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
              ? 'radial-gradient(circle at 20% 20%, rgba(112, 214, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 160, 89, 0.1) 0%, transparent 50%), linear-gradient(135deg, #090c15 0%, #121824 100%)'
              : 'radial-gradient(circle at 20% 20%, rgba(135, 206, 235, 0.25) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 176, 124, 0.15) 0%, transparent 50%), linear-gradient(135deg, #e0f2fe 0%, #f0f7ff 100%)',
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
          <div style={{ position: 'absolute', top: '-20%', left: '-20%', width: 300, height: 300, borderRadius: '50%', background: 'var(--powder-blue-glow)', filter: 'blur(60px)', opacity: 0.5, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-20%', right: '-20%', width: 300, height: 300, borderRadius: '50%', background: 'var(--pale-orange-glow)', filter: 'blur(60px)', opacity: 0.5, pointerEvents: 'none' }} />

          {/* Left Panel Top Header */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--powder-blue), var(--pale-orange))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px var(--powder-blue-glow)',
            }}>
              <Zap size={18} color="#121824" strokeWidth={2.5} />
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

          {/* Static Briefing Text (Option 3) */}
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
                Enterprise Training,<br />Reimagined
              </h2>
              <p style={{
                fontSize: '14px',
                color: theme === 'dark' ? '#94a3b8' : '#475569',
                fontWeight: 500,
                lineHeight: 1.5,
              }}>
                Unleash the full potential of your cohort programs with our intelligent, data-driven platform.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Feature 1 */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: theme === 'dark' ? 'rgba(112, 214, 255, 0.1)' : 'rgba(135, 206, 235, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Activity size={18} color="var(--powder-blue)" />
                </div>
                <div>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Operations Hub</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Manage training sessions, record daily attendance, and assign roles for Coordinators, Trainers, and Trainees in one centralized workspace.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: theme === 'dark' ? 'rgba(255, 160, 89, 0.1)' : 'rgba(255, 176, 124, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <TrendingUp size={18} color="var(--pale-orange)" />
                </div>
                <div>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Gamified Engagement</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Motivate learning using customizable grading scales, real-time assessments, and live achievement leaderboards.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: theme === 'dark' ? 'rgba(255, 208, 0, 0.1)' : 'rgba(255, 215, 0, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Sparkles size={18} color="var(--yellow)" />
                </div>
                <div>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>AI Learning Companions</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Power comprehension with custom chat agents, semantic code evaluations, and automated performance summaries.
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
              maxWidth: '480px',
              background: 'var(--bg-card)',
              backdropFilter: 'var(--card-blur)',
              WebkitBackdropFilter: 'var(--card-blur)',
              border: '1px solid var(--border-color)',
              borderRadius: 24,
              padding: '52px 48px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Form Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 32 }}>
              {/* Maverick One Logo — matching TopBar alignment */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--powder-blue), var(--pale-orange))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px var(--powder-blue-glow)',
                  flexShrink: 0,
                }}>
                  <Zap size={20} color="#121824" strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: 'var(--text-primary)',
                    letterSpacing: -0.5,
                    fontFamily: 'Outfit, sans-serif',
                    lineHeight: 1.1,
                  }}>
                    Maverick One
                  </span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'var(--powder-blue)',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    marginTop: 2,
                  }}>
                    Training Management System
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, justifyContent: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'lowercase', fontStyle: 'italic' }}>
                  by
                </span>
                <img
                  src="/hexaware-logo.png"
                  alt="Hexaware Logo"
                  style={{
                    height: '100px',
                    width: 'auto',
                    objectFit: 'contain',
                    filter: theme === 'dark' ? 'invert(1) hue-rotate(180deg) brightness(1.6) contrast(1.2)' : 'none',
                    display: 'block',
                    marginTop: '-35px',
                    marginBottom: '-35px'
                  }}
                />
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Email/Employee ID Input */}
              <div style={{ position: 'relative' }}>
                <Mail size={20} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Email Address or Employee ID"
                  required
                  style={{
                    width: '100%', padding: '14px 16px 14px 46px', borderRadius: 14,
                    border: '1px solid var(--border-color)', fontSize: '14.5px', outline: 'none',
                    background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--powder-blue)';
                    e.target.style.boxShadow = '0 0 10px var(--powder-blue-glow)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Password Input */}
              <div style={{ position: 'relative' }}>
                <Lock size={20} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  required
                  style={{
                    width: '100%', padding: '14px 48px 14px 46px', borderRadius: 14,
                    border: '1px solid var(--border-color)', fontSize: '14.5px', outline: 'none',
                    background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--powder-blue)';
                    e.target.style.boxShadow = '0 0 10px var(--powder-blue-glow)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    padding: 0, color: 'var(--text-muted)', transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Forgot Password Link */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(true); setForgotSent(false); setForgotEmail(loginEmail); setDevResetLink(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13.5, color: 'var(--powder-blue)', fontWeight: 600,
                    padding: 0, transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  width: 'fit-content', padding: '11px 32px', borderRadius: 12, border: 'none', fontSize: '14.5px', fontWeight: 700,
                  background: 'linear-gradient(135deg, #1d4ed8 0%, var(--powder-blue) 100%)',
                  color: '#ffffff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)', transition: 'all 0.2s',
                  opacity: loginLoading ? 0.75 : 1, marginTop: 8,
                  alignSelf: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.015)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(37, 99, 235, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.4)';
                }}
              >
                {loginLoading ? (
                  <MorphLoader inline />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      {/* Floating Dark/Light Theme Toggle */}
      <div
        onClick={handleToggleTheme}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          zIndex: 50,
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
        {theme === 'dark' ? (
          <Sun size={20} color="var(--yellow)" />
        ) : (
          <Moon size={20} color="var(--pale-orange)" />
        )}
      </div>

      <Outlet />

      {/* ── Forgot Password Modal ─────────────────────────────────────── */}
      {showForgotModal && (
        <div
          onClick={() => setShowForgotModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 420,
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 20, padding: '32px 32px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex', flexDirection: 'column', gap: 20,
              animation: 'slideDownIn 0.2s ease',
            }}
          >
            {!forgotSent ? (
              <>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', margin: 0 }}>
                    Reset your password
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                    Enter your registered email address and we'll send you a reset link. Valid for 1 hour.
                  </p>
                </div>
                <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      style={{
                        width: '100%', padding: '12px 14px 12px 40px', borderRadius: 12,
                        border: '1px solid var(--border-color)', fontSize: 13.5, outline: 'none',
                        background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 500,
                        transition: 'all 0.2s',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--powder-blue)'; e.target.style.boxShadow = '0 0 10px var(--powder-blue-glow)'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      style={{
                        flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--border-color)',
                        background: 'transparent', color: 'var(--text-secondary)', fontSize: 13.5,
                        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      style={{
                        flex: 2, padding: '11px', borderRadius: 12, border: 'none',
                        background: 'linear-gradient(135deg, #1d4ed8 0%, var(--powder-blue) 100%)',
                        color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 4px 14px rgba(37,99,235,0.35)', transition: 'all 0.2s',
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
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', margin: 0 }}>
                    Check your inbox
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
                    If <strong style={{ color: 'var(--text-primary)' }}>{forgotEmail}</strong> is registered, a password reset link has been sent. Check your spam folder if you don't see it.
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
                  className="btn-primary"
                  style={{ padding: '10px 28px', borderRadius: 12 }}
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
