"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Lock, Mail, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const [demoRole, setDemoRole] = useState('COORDINATOR');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // MOCK DATABASE BYPASS
    setTimeout(() => {
      login("mock-jwt-token-12345", {
        id: "mock-user-id",
        email: email,
        fullName: demoRole === 'TRAINEE' ? "Demo Trainee" : "Demo Staff",
        role: demoRole
      });
      toast.success(`Successfully logged in as ${demoRole} (Demo Mode)!`);
      setLoading(false);
    }, 800);
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
              className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/30"
            >
              <Lock className="text-white w-8 h-8" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-500 dark:from-indigo-400 dark:to-cyan-300">
              MEP-TMS
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Maverick Execution Platform
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:text-slate-100"
                  placeholder="Email Address"
                  required
                />
              </div>
            </div>

            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:text-slate-100"
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-2 font-medium">Demo Mode Login As:</p>
              <select
                value={demoRole}
                onChange={(e) => setDemoRole(e.target.value)}
                className="block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-700 dark:text-slate-200 text-sm"
              >
                <option value="ADMIN">Admin</option>
                <option value="COORDINATOR">Coordinator</option>
                <option value="TRAINER">Trainer</option>
                <option value="TRAINEE">Trainee</option>
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
            
            <div className="text-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Don't have an account?{' '}
                <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
