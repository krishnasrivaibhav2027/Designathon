import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, ChevronRight, Loader2, Zap, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Execute REAL JWT login request to FastAPI backend
      const response = await api.post('/auth/login', {
        email,
        password
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
      setLoading(false);
    }
  };

  const handlePrefill = (prefilledEmail: string) => {
    setEmail(prefilledEmail);
    setPassword('Password123'); // Standard testing password
    toast.success(`Prefilled test account: ${prefilledEmail}`);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f9f9f8 0%, #dbdbd9 100%)',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative Brand Gradients */}
      <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 450, height: 450, borderRadius: '50%', background: 'rgba(249,165,27,0.06)', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: 450, height: 450, borderRadius: '50%', background: 'rgba(250,201,90,0.06)', filter: 'blur(60px)' }} />

      <div style={{
        width: '100%', maxWidth: 420, background: '#ffffff', borderRadius: 24, padding: '40px 36px',
        boxShadow: '0 8px 40px rgba(19, 19, 19, 0.04)', border: '1px solid rgba(19, 19, 19, 0.05)', position: 'relative', zIndex: 1,
      }}>
        
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #f9a51b, #fac95a)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, boxShadow: '0 4px 16px rgba(249,165,27,0.2)',
          }}>
            <Zap size={28} color="#131313" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#131313', fontFamily: 'Outfit, sans-serif', letterSpacing: -0.5 }}>
            MEP-TMS
          </h1>
          <p style={{ color: '#919a9f', fontSize: 13.5, marginTop: 4, fontWeight: 500 }}>
            Maverick Execution Platform
          </p>
        </div>

        {/* Real Form submission */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Email Input */}
          <div style={{ position: 'relative' }}>
            <Mail size={18} color="#919a9f" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Email Address" 
              required
              style={{ 
                width: '100%', padding: '13px 14px 13px 42px', borderRadius: 12, 
                border: '1px solid #dbdbd9', fontSize: 14, outline: 'none', 
                background: '#f9f9f8', color: '#131313', fontWeight: 500,
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#f9a51b'} 
              onBlur={(e) => e.target.style.borderColor = '#dbdbd9'} 
            />
          </div>

          {/* Password Input */}
          <div style={{ position: 'relative' }}>
            <Lock size={18} color="#919a9f" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Password" 
              required
              style={{ 
                width: '100%', padding: '13px 14px 13px 42px', borderRadius: 12, 
                border: '1px solid #dbdbd9', fontSize: 14, outline: 'none', 
                background: '#f9f9f8', color: '#131313', fontWeight: 500,
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#f9a51b'} 
              onBlur={(e) => e.target.style.borderColor = '#dbdbd9'} 
            />
          </div>

          {/* Action Trigger */}
          <button 
            type="submit" 
            disabled={loading} 
            style={{
              width: '100%', padding: 13, borderRadius: 12, border: 'none', fontSize: 14.5, fontWeight: 700,
              background: '#f9a51b', color: '#131313', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(249,165,27,0.2)', transition: 'all 0.2s',
              opacity: loading ? 0.75 : 1, marginTop: 4
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.background = '#fac95a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = '#f9a51b';
            }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ChevronRight size={16} strokeWidth={2.5} />
              </>
            )}
          </button>

          {/* Prefill Testing Credentials Panel */}
          <div style={{ 
            background: 'rgba(249, 165, 27, 0.05)', 
            padding: '12px 14px', 
            borderRadius: 12, 
            border: '1px solid rgba(249, 165, 27, 0.15)',
            marginTop: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <HelpCircle size={14} color="#f9a51b" />
              <span style={{ fontSize: 11, color: '#f9a51b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick Prefill Roles</span>
            </div>
            
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button 
                type="button"
                onClick={() => handlePrefill('coordinator@mep.com')}
                style={{
                  background: '#ffffff', border: '1px solid #dbdbd9', borderRadius: 8,
                  padding: '5px 8px', fontSize: 11, fontWeight: 600, color: '#131313',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f9a51b'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#dbdbd9'}
              >
                Coordinator
              </button>
              <button 
                type="button"
                onClick={() => handlePrefill('trainer@mep.com')}
                style={{
                  background: '#ffffff', border: '1px solid #dbdbd9', borderRadius: 8,
                  padding: '5px 8px', fontSize: 11, fontWeight: 600, color: '#131313',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f9a51b'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#dbdbd9'}
              >
                Trainer
              </button>
              <button 
                type="button"
                onClick={() => handlePrefill('trainee@mep.com')}
                style={{
                  background: '#ffffff', border: '1px solid #dbdbd9', borderRadius: 8,
                  padding: '5px 8px', fontSize: 11, fontWeight: 600, color: '#131313',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#f9a51b'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#dbdbd9'}
              >
                Trainee
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <div style={{ textAlign: 'center', marginTop: 10, paddingTop: 16, borderTop: '1px solid #dbdbd9' }}>
            <p style={{ fontSize: 13, color: '#919a9f', fontWeight: 500 }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: '#f9a51b', fontWeight: 700, textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>
                Sign up
              </Link>
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}
