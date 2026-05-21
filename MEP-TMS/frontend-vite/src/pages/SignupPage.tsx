import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Phone, ChevronRight, Loader2, KeyRound, Zap, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'TRAINER'
  });
  
  const [loading, setLoading] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const rolesList = [
    { value: 'TRAINER', label: 'Register as Trainer' },
    { value: 'COORDINATOR', label: 'Register as Coordinator' },
    { value: 'TRAINEE', label: 'Register as Trainee' }
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Execute REAL backend user registration request
      const response = await api.post('/auth/register', {
        email: formData.email,
        fullName: formData.fullName,
        password: formData.password,
        phone: formData.phone || null,
        role: formData.role
      });

      if (response.data) {
        toast.success(`Successfully registered as ${formData.role}! Proceeding to Login.`);
        navigate('/login');
      }
    } catch (error: any) {
      console.error('[Signup Error]', error);
      const errorMsg = error.response?.data?.detail || 'Failed to complete registration. Try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f9f9f8 0%, #dbdbd9 100%)',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Inject custom drop animation in self-contained style block */}
      <style>{`
        @keyframes slideDownIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Premium Glassmorphic glowing circles */}
      <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 450, height: 450, borderRadius: '50%', background: 'rgba(249,165,27,0.06)', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: 450, height: 450, borderRadius: '50%', background: 'rgba(250,201,90,0.06)', filter: 'blur(60px)' }} />

      <div style={{
        width: '100%', maxWidth: 440, background: '#ffffff', borderRadius: 24, padding: '40px 32px',
        boxShadow: '0 8px 40px rgba(19, 19, 19, 0.04)', border: '1px solid rgba(19, 19, 19, 0.05)', position: 'relative', zIndex: 1,
      }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #f9a51b, #fac95a)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14, boxShadow: '0 4px 16px rgba(249,165,27,0.2)',
          }}>
            <Zap size={24} color="#131313" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#131313', fontFamily: 'Outfit, sans-serif', letterSpacing: -0.5 }}>
            Create Account
          </h1>
          <p style={{ color: '#919a9f', fontSize: 13, marginTop: 4, fontWeight: 500 }}>
            Join the MEP-TMS Platform
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Full Name */}
          <div style={{ position: 'relative' }}>
            <User size={18} color="#919a9f" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              name="fullName" 
              value={formData.fullName} 
              onChange={handleChange} 
              placeholder="Full Name" 
              required
              style={{ 
                width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12, 
                border: '1px solid #dbdbd9', fontSize: 13.5, outline: 'none', 
                background: '#f9f9f8', color: '#131313', fontWeight: 500,
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#f9a51b'} 
              onBlur={(e) => e.target.style.borderColor = '#dbdbd9'} 
            />
          </div>

          {/* Email Address */}
          <div style={{ position: 'relative' }}>
            <Mail size={18} color="#919a9f" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              placeholder="Email Address" 
              required
              style={{ 
                width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12, 
                border: '1px solid #dbdbd9', fontSize: 13.5, outline: 'none', 
                background: '#f9f9f8', color: '#131313', fontWeight: 500,
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#f9a51b'} 
              onBlur={(e) => e.target.style.borderColor = '#dbdbd9'} 
            />
          </div>

          {/* Phone Number */}
          <div style={{ position: 'relative' }}>
            <Phone size={18} color="#919a9f" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="tel" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              placeholder="Phone Number (Optional)" 
              style={{ 
                width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12, 
                border: '1px solid #dbdbd9', fontSize: 13.5, outline: 'none', 
                background: '#f9f9f8', color: '#131313', fontWeight: 500,
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#f9a51b'} 
              onBlur={(e) => e.target.style.borderColor = '#dbdbd9'} 
            />
          </div>

          {/* Custom State-Driven Premium Dropdown (Escapes native OS look!) */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              style={{ 
                width: '100%', padding: '12px 14px', borderRadius: 12, 
                border: isRoleDropdownOpen ? '1px solid #f9a51b' : '1px solid #dbdbd9', 
                fontSize: 13.5, outline: 'none', 
                background: '#f9f9f8', color: '#131313', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onBlur={() => {
                // Short timeout to allow mouse clicks on list options to complete first
                setTimeout(() => setIsRoleDropdownOpen(false), 200);
              }}
            >
              <span>{rolesList.find(r => r.value === formData.role)?.label}</span>
              <ChevronDown 
                size={18} 
                style={{ 
                  transform: isRoleDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: '#919a9f'
                }} 
              />
            </button>

            {/* Custom Luxury Floating Dropdown list */}
            {isRoleDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'rgba(255, 255, 255, 0.98)', border: '1px solid rgba(249, 165, 27, 0.2)',
                borderRadius: 12, boxShadow: '0 8px 24px rgba(19, 19, 19, 0.08)',
                marginTop: 6, backdropFilter: 'blur(8px)', overflow: 'hidden',
                padding: '4px 0', animation: 'slideDownIn 0.2s ease-out'
              }}>
                {rolesList.map((item) => {
                  const isSelected = formData.role === item.value;
                  return (
                    <div
                      key={item.value}
                      onMouseDown={() => {
                        setFormData(prev => ({ ...prev, role: item.value }));
                        setIsRoleDropdownOpen(false);
                      }}
                      style={{
                        padding: '11px 16px', cursor: 'pointer',
                        fontSize: 13, fontWeight: isSelected ? 700 : 600,
                        color: isSelected ? '#f9a51b' : '#131313',
                        background: isSelected ? 'rgba(249, 165, 27, 0.06)' : 'transparent',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(249, 165, 27, 0.04)';
                          e.currentTarget.style.color = '#f9a51b';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#131313';
                        }
                      }}
                    >
                      <span>{item.label}</span>
                      {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f9a51b' }} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <Lock size={18} color="#919a9f" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              placeholder="Password" 
              required
              style={{ 
                width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12, 
                border: '1px solid #dbdbd9', fontSize: 13.5, outline: 'none', 
                background: '#f9f9f8', color: '#131313', fontWeight: 500,
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#f9a51b'} 
              onBlur={(e) => e.target.style.borderColor = '#dbdbd9'} 
            />
          </div>

          {/* Submit Trigger */}
          <button 
            type="submit" 
            disabled={loading} 
            style={{
              width: '100%', padding: 13, borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700,
              background: '#f9a51b', color: '#131313', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(249,165,27,0.2)', transition: 'all 0.2s',
              opacity: loading ? 0.75 : 1, marginTop: 8
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
                <span>Sign Up</span>
                <ChevronRight size={16} strokeWidth={2.5} />
              </>
            )}
          </button>

          {/* Redirect to Login link */}
          <div style={{ textAlign: 'center', marginTop: 10, paddingTop: 16, borderTop: '1px solid #dbdbd9' }}>
            <p style={{ fontSize: 13, color: '#919a9f', fontWeight: 500 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#f9a51b', fontWeight: 700, textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>
                Log in
              </Link>
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}
