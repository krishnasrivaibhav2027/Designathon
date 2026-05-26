import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, ChevronRight, Loader2, Zap, HelpCircle, Eye, EyeOff, Sparkles, TrendingUp, Activity, User, Phone, Check, X, Info, ChevronDown, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';

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
    } catch {}
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Carousel slideshow states
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: <Activity size={36} style={{ color: 'var(--powder-blue)', filter: 'drop-shadow(0 0 8px var(--powder-blue-glow))' }} />,
      title: 'Training Execution Hub',
      description: 'Coordinate batches, manage daily sessions, track attendance, and assign roles for Coordinators, Trainers, and Trainees in one centralized workspace.'
    },
    {
      icon: <TrendingUp size={36} style={{ color: 'var(--pale-orange)', filter: 'drop-shadow(0 0 8px var(--pale-orange-glow))' }} />,
      title: 'Gamified Leaderboards',
      description: 'Keep trainees engaged and motivated using customizable grading scales, real-time assessments, automated feedback, and a live achievements leaderboard.'
    },
    {
      icon: <Sparkles size={36} style={{ color: 'var(--yellow)', filter: 'drop-shadow(0 0 8px var(--yellow-glow))' }} />,
      title: 'AI-Powered Learning',
      description: 'Accelerate learning outcomes with instant AI chat support, semantic code evaluation, and automated performance reviews.'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: loginEmail,
        password: loginPassword
      });

      if (response.data) {
        const { accessToken, user } = response.data;
        login(accessToken, user);
        toast.success(`Welcome back, ${user.fullName}!`);
      }
    } catch (error: any) {
      console.error('[Login Error]', error);
      const errorMsg = error.response?.data?.detail || 'Invalid email or password. Please try again.';
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: theme === 'dark'
        ? 'radial-gradient(circle at 75% 25%, rgba(255, 160, 89, 0.12) 0%, transparent 45%), radial-gradient(circle at 25% 75%, rgba(112, 214, 255, 0.18) 0%, transparent 50%), linear-gradient(135deg, #07090e 0%, #0f1420 100%)'
        : 'radial-gradient(circle at 75% 25%, rgba(255, 176, 124, 0.18) 0%, transparent 45%), radial-gradient(circle at 25% 75%, rgba(135, 206, 235, 0.28) 0%, transparent 50%), linear-gradient(135deg, #eef6ff 0%, #dbeafe 100%)',
      transition: 'background 0.5s ease-in-out',
      width: '100vw',
      position: 'relative',
      overflow: 'hidden'
    }}>
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
        .flip-card-face {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--powder-blue);
        }
        @media (max-width: 768px) {
          .auth-left-panel {
            display: none !important;
          }
          .auth-right-panel {
            padding: 24px 16px !important;
            width: 100% !important;
          }
        }
      `}</style>

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
          padding: '60px 48px',
          overflow: 'hidden',
          borderRight: '1px solid var(--border-color)',
          transition: 'all 0.5s ease-in-out',
        }}
      >
        {/* Internal Glow Accents */}
        <div style={{ position: 'absolute', top: '-20%', left: '-20%', width: 300, height: 300, borderRadius: '50%', background: 'var(--powder-blue-glow)', filter: 'blur(60px)', opacity: 0.5, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-20%', width: 300, height: 300, borderRadius: '50%', background: 'var(--pale-orange-glow)', filter: 'blur(60px)', opacity: 0.5, pointerEvents: 'none' }} />

        {/* SVG Mesh wavy overlay */}
        <svg 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            opacity: theme === 'dark' ? 0.08 : 0.15, 
            pointerEvents: 'none',
            transition: 'opacity 0.5s ease-in-out'
          }}
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
        >
          <path d="M0,30 Q25,50 50,30 T100,30 L100,100 L0,100 Z" fill="url(#wave-grad)" />
          <defs>
            <linearGradient id="wave-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--powder-blue)" />
              <stop offset="100%" stopColor="var(--pale-orange)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

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

        {/* Slider Slides */}
        <div style={{ position: 'relative', height: 180, zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {slides.map((slide, idx) => {
            const isActive = idx === currentSlide;
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? 'translateX(0)' : 'translateX(16px)',
                  transition: 'all 0.5s ease-in-out',
                  pointerEvents: isActive ? 'auto' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div className={isActive ? 'animate-float' : ''} style={{ marginBottom: 16 }}>
                  {slide.icon}
                </div>
                <h2 style={{ 
                  fontSize: 22, 
                  fontWeight: 800, 
                  color: theme === 'dark' ? '#ffffff' : '#121824', 
                  marginBottom: 8, 
                  fontFamily: 'Outfit, sans-serif', 
                  letterSpacing: -0.3,
                  transition: 'color 0.5s ease-in-out'
                }}>
                  {slide.title}
                </h2>
                <p style={{ 
                  fontSize: 13.5, 
                  color: theme === 'dark' ? '#94a3b8' : '#475569', 
                  lineHeight: '1.5', 
                  maxWidth: 320,
                  transition: 'color 0.5s ease-in-out'
                }}>
                  {slide.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Left Panel Pagination Dots */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 6 }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              style={{
                width: idx === currentSlide ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: idx === currentSlide 
                  ? 'var(--powder-blue)' 
                  : (theme === 'dark' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)'),
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Right Form Panel */}
      <div 
        className="auth-right-panel"
        style={{
          flex: 1.1,
          padding: '40px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'transparent',
        }}
      >
        {/* Auth Glass Card */}
        <div 
          style={{
            width: '100%',
            maxWidth: 440,
            background: 'var(--bg-card)',
            backdropFilter: 'var(--card-blur)',
            WebkitBackdropFilter: 'var(--card-blur)',
            border: '1px solid var(--border-color)',
            borderRadius: 24,
            padding: '36px 36px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Form Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', letterSpacing: -0.5 }}>
              Welcome back
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, fontWeight: 500 }}>
              The training management system (TMS)
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {/* Email Input */}
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="email" 
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)} 
                placeholder="Email Address" 
                required
                style={{ 
                  width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12, 
                  border: '1px solid var(--border-color)', fontSize: 13.5, outline: 'none', 
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
              <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                placeholder="Password" 
                required
                style={{ 
                  width: '100%', padding: '12px 42px 12px 42px', borderRadius: 12, 
                  border: '1px solid var(--border-color)', fontSize: 13.5, outline: 'none', 
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
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  padding: 0, color: 'var(--text-muted)', transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loginLoading} 
              style={{
                width: 'fit-content', padding: '10px 24px', borderRadius: 12, border: 'none', fontSize: 13.5, fontWeight: 700,
                background: 'linear-gradient(135deg, #1d4ed8 0%, var(--powder-blue) 100%)',
                color: '#ffffff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)', transition: 'all 0.2s',
                opacity: loginLoading ? 0.75 : 1, marginTop: 4,
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
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ChevronRight size={16} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>
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
    </div>
  );
}
