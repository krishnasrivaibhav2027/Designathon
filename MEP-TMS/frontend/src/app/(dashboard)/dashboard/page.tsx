"use client";

import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Users, BookOpen, TrendingUp, AlertCircle, Calendar, Target, Award } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  const isTrainee = user?.role === 'TRAINEE';

  const adminStats = [
    { title: 'Total Candidates', value: '1,240', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Active Batches', value: '12', icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Clearance Rate', value: '85%', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Alerts', value: '3', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  ];

  const traineeStats = [
    { title: 'My Attendance', value: '92%', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Average Score', value: '88%', icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Assessments Passed', value: '4/5', icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Missed Days', value: '2', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  const stats = isTrainee ? traineeStats : adminStats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {isTrainee ? 'Trainee Dashboard' : 'Dashboard'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, {user?.fullName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50"
          >
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placeholder for charts/tables */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 h-96 flex flex-col items-center justify-center"
        >
          {isTrainee ? (
            <>
              <Calendar className="w-16 h-16 text-indigo-200 dark:text-indigo-900/50 mb-4" />
              <p className="text-slate-500 font-medium">Your Attendance History</p>
            </>
          ) : (
            <>
              <TrendingUp className="w-16 h-16 text-indigo-200 dark:text-indigo-900/50 mb-4" />
              <p className="text-slate-500 font-medium">Global Attendance Overview</p>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 h-96 flex flex-col items-center justify-center"
        >
          {isTrainee ? (
            <>
              <Award className="w-16 h-16 text-emerald-200 dark:text-emerald-900/50 mb-4" />
              <p className="text-slate-500 font-medium">Recent Assessment Scores</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-rose-200 dark:text-rose-900/50 mb-4" />
              <p className="text-slate-500 font-medium">System Alerts & Notifications</p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
