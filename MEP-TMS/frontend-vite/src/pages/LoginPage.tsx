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

  // Manage flipping internally to ensure smooth 3D CSS transition without remounting the component
  const [isFlipped, setIsFlipped] = useState(initialFlipped);

  // Sync state if initialFlipped prop changes (e.g. direct url change or back button)
  useEffect(() => {
    setIsFlipped(initialFlipped);
  }, [initialFlipped]);

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup states
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'TRAINER',
    password: '',
    confirmPassword: ''
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  // Carousel slideshow states
  const [currentSlide, setCurrentSlide] = useState(0);

  const rolesList = [
    { value: 'TRAINER', label: 'Register as Trainer' },
    { value: 'COORDINATOR', label: 'Register as Coordinator' },
    { value: 'ADMIN', label: 'Register as Admin' }
  ];

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

  const handleToggle = (mode: 'login' | 'signup') => {
    const targetFlipped = mode === 'signup';
    setIsFlipped(targetFlipped);
    
    // Update browser history and address bar without unmounting
    const targetPath = targetFlipped ? '/signup' : '/login';
    window.history.pushState(null, '', targetPath);
  };

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

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Real-time password validation logic
  const signupPassword = signupForm.password;
  const confirmPassword = signupForm.confirmPassword;

  const criteria = [
    { label: 'At least 8 characters', met: signupPassword.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(signupPassword) },
    { label: 'At least one number', met: /[0-9]/.test(signupPassword) },
    { label: 'At least one special character (@$!%*?&)', met: /[@$!%*?&._\-#]/.test(signupPassword) }
  ];

  const score = criteria.filter(c => c.met).length;
  const isPasswordValid = score === criteria.length;
  const passwordsMatch = signupPassword && confirmPassword && signupPassword === confirmPassword;
  const showMatchIndicator = confirmPassword.length > 0;

  const getStrengthInfo = (s: number) => {
    if (s === 0) return { label: 'Empty', color: 'var(--text-muted)', width: '0%' };
    if (s <= 2) return { label: 'Weak', color: '#ff6b6b', width: '33%' };
    if (s === 3) return { label: 'Medium', color: 'var(--yellow)', width: '66%' };
    return { label: 'Strong', color: 'var(--powder-blue)', width: '100%' };
  };

  const strength = getStrengthInfo(score);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      toast.error('Password must meet all safety requirements.');
      return;
    }
    if (!passwordsMatch) {
      toast.error('Passwords do not match.');
      return;
    }

    setSignupLoading(true);
    try {
      const response = await api.post('/auth/register', {
        email: signupForm.email,
        fullName: signupForm.fullName,
        password: signupForm.password,
        phone: signupForm.phone || null,
        role: signupForm.role
      });

      if (response.data) {
        toast.success(`Successfully registered as ${signupForm.role}! Proceeding to Login.`);
        setIsFlipped(false);
        window.history.pushState(null, '', '/login');
      }
    } catch (error: any) {
      console.error('[Signup Error]', error);
      const errorMsg = error.response?.data?.detail || 'Failed to complete registration. Try again.';
      toast.error(errorMsg);
    } finally {
      setSignupLoading(false);
    }
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
        {/* Auth Glass Card 3D Perspective Box */}
        <div 
          className="auth-card-perspective"
          style={{
            perspective: '1500px',
            width: '100%',
            maxWidth: 440,
            height: isFlipped 
              ? (signupForm.password.length > 0 
                  ? (signupForm.confirmPassword.length > 0 ? 710 : 675) 
                  : 580) 
              : 390,
            position: 'relative',
            transition: 'height 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
          }}
        >
          {/* Rotating Double-sided Card Container */}
          <div style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.8s cubic-bezier(0.4, 0.2, 0.2, 1)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}>
            
            {/* ================= CARD FRONT: LOGIN ================= */}
            <div 
              className="flip-card-face"
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'var(--bg-card)',
                backdropFilter: 'var(--card-blur)',
                WebkitBackdropFilter: 'var(--card-blur)',
                border: '1px solid var(--border-color)',
                borderRadius: 24,
                padding: '36px 36px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-card)',
                zIndex: isFlipped ? 1 : 2,
                pointerEvents: isFlipped ? 'none' : 'auto',
              }}
            >
              <div>
                {/* Segmented Switch Control */}
                <div style={{
                  display: 'flex',
                  background: 'var(--bg-main)',
                  padding: 4,
                  borderRadius: 12,
                  border: '1px solid var(--border-color)',
                  marginBottom: 24,
                }}>
                  <button 
                    type="button"
                    onClick={() => handleToggle('login')}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    Sign In
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleToggle('signup')}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid transparent',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    Sign Up
                  </button>
                </div>

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

            {/* ================= CARD BACK: SIGNUP ================= */}
            <div 
              className="flip-card-face"
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                transform: 'rotateY(180deg)',
                background: 'var(--bg-card)',
                backdropFilter: 'var(--card-blur)',
                WebkitBackdropFilter: 'var(--card-blur)',
                border: '1px solid var(--border-color)',
                borderRadius: 24,
                padding: '30px 30px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-card)',
                zIndex: isFlipped ? 2 : 1,
                pointerEvents: isFlipped ? 'auto' : 'none',
                overflow: 'hidden',
              }}
            >
              {/* Segmented Switch Control */}
              <div style={{
                display: 'flex',
                background: 'var(--bg-main)',
                padding: 4,
                borderRadius: 12,
                border: '1px solid var(--border-color)',
                marginBottom: 16,
                flexShrink: 0,
              }}>
                <button 
                  type="button"
                  onClick={() => handleToggle('login')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid transparent',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  Sign In
                </button>
                <button 
                  type="button"
                  onClick={() => handleToggle('signup')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  Sign Up
                </button>
              </div>

              {/* Form Header */}
              <div style={{ marginBottom: 12, flexShrink: 0 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
                  Create Account
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                  The training management system (TMS)
                </p>
              </div>

              {/* Signup Form */}
              <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                
                {/* Full Name */}
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    name="fullName" 
                    value={signupForm.fullName} 
                    onChange={handleSignupChange} 
                    placeholder="Full Name" 
                    required
                    style={{ 
                      width: '100%', padding: '9px 14px 9px 38px', borderRadius: 12, 
                      border: '1px solid var(--border-color)', fontSize: 13, outline: 'none', 
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

                {/* Email Address */}
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="email" 
                    name="email" 
                    value={signupForm.email} 
                    onChange={handleSignupChange} 
                    placeholder="Email Address" 
                    required
                    style={{ 
                      width: '100%', padding: '9px 14px 9px 38px', borderRadius: 12, 
                      border: '1px solid var(--border-color)', fontSize: 13, outline: 'none', 
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

                {/* Phone Number */}
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="tel" 
                    name="phone" 
                    value={signupForm.phone} 
                    onChange={handleSignupChange} 
                    placeholder="Phone Number (Optional)" 
                    style={{ 
                      width: '100%', padding: '9px 14px 9px 38px', borderRadius: 12, 
                      border: '1px solid var(--border-color)', fontSize: 13, outline: 'none', 
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

                {/* Custom Dropdown Role */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    style={{ 
                      width: '100%', padding: '9px 14px', borderRadius: 12, 
                      border: isRoleDropdownOpen ? '1px solid var(--powder-blue)' : '1px solid var(--border-color)', 
                      fontSize: 13, outline: 'none', 
                      background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                    onBlur={() => {
                      setTimeout(() => setIsRoleDropdownOpen(false), 200);
                    }}
                  >
                    <span>{rolesList.find(r => r.value === signupForm.role)?.label}</span>
                    <ChevronDown 
                      size={14} 
                      style={{ 
                        transform: isRoleDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        color: 'var(--text-secondary)'
                      }} 
                    />
                  </button>

                  {/* Options */}
                  {isRoleDropdownOpen && (
                    <div style={{
                      position: 'absolute', bottom: '105%', left: 0, right: 0, zIndex: 100,
                      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                      borderRadius: 12, boxShadow: 'var(--shadow-card)',
                      marginBottom: 6, backdropFilter: 'var(--card-blur)', overflow: 'hidden',
                      padding: '4px 0', animation: 'slideDownIn 0.2s ease-out'
                    }}>
                      {rolesList.map((item) => {
                        const isSelected = signupForm.role === item.value;
                        return (
                          <div
                            key={item.value}
                            onMouseDown={() => {
                              setSignupForm(prev => ({ ...prev, role: item.value }));
                              setIsRoleDropdownOpen(false);
                            }}
                            style={{
                              padding: '8px 16px', cursor: 'pointer',
                              fontSize: 12.5, fontWeight: isSelected ? 700 : 600,
                              color: isSelected ? 'var(--powder-blue)' : 'var(--text-primary)',
                              background: isSelected ? 'var(--powder-blue-glow)' : 'transparent',
                              transition: 'all 0.15s',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'var(--powder-blue-glow)';
                                e.currentTarget.style.color = 'var(--powder-blue)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }
                            }}
                          >
                            <span>{item.label}</span>
                            {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--powder-blue)' }} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Password field */}
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type={showSignupPassword ? 'text' : 'password'}
                    name="password" 
                    value={signupForm.password} 
                    onChange={handleSignupChange} 
                    placeholder="Password" 
                    required
                    style={{ 
                      width: '100%', padding: '9px 38px 9px 38px', borderRadius: 12, 
                      border: '1px solid var(--border-color)', fontSize: 13, outline: 'none', 
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
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      padding: 0, color: 'var(--text-muted)', transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Checklist & strength */}
                {signupPassword.length > 0 && (
                  <div style={{
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    animation: 'fadeIn 0.2s ease-out'
                  }}>
                    {/* Strength Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontSize: 9.5, color: 'var(--text-secondary)', fontWeight: 600 }}>Password Strength</span>
                        <span style={{ fontSize: 9.5, color: strength.color, fontWeight: 700, transition: 'color 0.3s ease' }}>{strength.label}</span>
                      </div>
                      <div style={{ width: '100%', height: 3, background: 'var(--bg-card)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: strength.width,
                          height: '100%',
                          background: strength.color,
                          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease',
                          borderRadius: 2
                        }} />
                      </div>
                    </div>
                    {/* Criteria */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                      {criteria.map((item, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 6, 
                            fontSize: 10.5,
                            color: item.met ? 'var(--powder-blue)' : 'var(--text-muted)',
                            transition: 'all 0.2s ease',
                            fontWeight: item.met ? 600 : 500
                          }}
                        >
                          <span style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            border: item.met ? 'none' : '1px solid var(--border-color)',
                            background: item.met ? 'var(--powder-blue)' : 'transparent',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                          }}>
                            {item.met ? (
                              <Check size={8} color="#121824" strokeWidth={4} />
                            ) : (
                              <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-muted)' }} />
                            )}
                          </span>
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="password" 
                    name="confirmPassword" 
                    value={signupForm.confirmPassword} 
                    onChange={handleSignupChange} 
                    placeholder="Confirm Password" 
                    required
                    style={{ 
                      width: '100%', padding: '9px 14px 9px 38px', borderRadius: 12, 
                      border: '1px solid var(--border-color)', fontSize: 13, outline: 'none', 
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

                {/* Matching indicator badge */}
                {showMatchIndicator && (
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: passwordsMatch ? 'var(--powder-blue)' : '#ff6b6b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 6px',
                    borderRadius: 6,
                    background: passwordsMatch ? 'var(--powder-blue-glow)' : 'rgba(255, 107, 107, 0.1)',
                    border: `1px solid ${passwordsMatch ? 'var(--powder-blue)' : 'rgba(255, 107, 107, 0.3)'}`,
                    width: 'fit-content',
                    animation: 'fadeIn 0.2s ease-out'
                  }}>
                    {passwordsMatch ? (
                      <>
                        <Check size={11} strokeWidth={3.5} />
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <>
                        <X size={11} strokeWidth={3.5} />
                        <span>Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}

                {/* Trainee Tip Info */}
                <div style={{
                  background: 'var(--powder-blue-glow)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 12,
                  padding: '8px 10px',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'flex-start'
                }}>
                  <Info size={13} color="var(--powder-blue)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                    Trainees receive accounts directly. Check your email for details.
                  </span>
                </div>

                {/* Submit button */}
                <button 
                  type="submit" 
                  disabled={signupLoading} 
                  style={{
                    width: 'fit-content', padding: '10px 24px', borderRadius: 12, border: 'none', fontSize: 13.5, fontWeight: 700,
                    background: 'linear-gradient(135deg, #1d4ed8 0%, var(--powder-blue) 100%)',
                    color: '#ffffff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)', transition: 'all 0.2s',
                    opacity: signupLoading ? 0.75 : 1, marginTop: 4, flexShrink: 0,
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
                  {signupLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span>Sign Up</span>
                      <ChevronRight size={16} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </form>
            </div>
            
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
    </div>
  );
}
