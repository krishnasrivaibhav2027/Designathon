"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, User, Phone, ChevronRight, Loader2, KeyRound } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'TRAINER' // default role
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // MOCK DATABASE BYPASS
    setTimeout(() => {
      toast.success('Successfully registered (Demo Mode)! You can now log in.');
      setLoading(false);
      router.push('/login');
    }, 800);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/20 dark:bg-purple-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-500/20 dark:bg-cyan-600/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-slate-700/30">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-emerald-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-cyan-500/30"
            >
              <KeyRound className="text-white w-8 h-8" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-emerald-500 dark:from-cyan-400 dark:to-emerald-300">
              Create Account
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Join MEP-TMS Platform
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                </div>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:text-slate-100"
                  placeholder="Full Name"
                  required
                />
              </div>
            </div>

            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:text-slate-100"
                  placeholder="Email Address"
                  required
                />
              </div>
            </div>

            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:text-slate-100"
                  placeholder="Phone Number (Optional)"
                />
              </div>
            </div>

            <div>
              <div className="relative group">
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="block w-full pl-4 pr-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all text-slate-700 dark:text-slate-200"
                >
                  <option value="TRAINER">Trainer</option>
                  <option value="COORDINATOR">Coordinator</option>
                  <option value="ADMIN">Admin</option>
                  <option value="TRAINEE">Trainee</option>
                </select>
              </div>
            </div>

            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:text-slate-100"
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 mt-2 bg-gradient-to-r from-cyan-600 to-emerald-500 hover:from-cyan-700 hover:to-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign Up
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
            
            <div className="text-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
