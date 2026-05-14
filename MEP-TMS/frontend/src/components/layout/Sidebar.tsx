"use client";

import { useAuth } from '@/context/AuthContext';
import { Home, Users, BookOpen, CheckSquare, BarChart, LogOut, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const getNavItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: '/dashboard', icon: Home }
    ];

    if (user?.role === 'COORDINATOR' || user?.role === 'ADMIN') {
      baseItems.push(
        { name: 'Batches', href: '/batches', icon: BookOpen },
        { name: 'Users', href: '/users', icon: Users },
        { name: 'Reports', href: '/reports', icon: BarChart },
        { name: 'Feedback', href: '/feedback', icon: MessageSquare }
      );
    }

    if (user?.role === 'TRAINER') {
      baseItems.push(
        { name: 'Batches', href: '/batches', icon: BookOpen },
        { name: 'Attendance', href: '/attendance', icon: CheckSquare },
        { name: 'Assessments', href: '/assessments', icon: CheckSquare }
      );
    }

    if (user?.role === 'COORDINATOR') {
      baseItems.push(
        { name: 'Attendance', href: '/attendance', icon: CheckSquare },
        { name: 'Assessments', href: '/assessments', icon: CheckSquare }
      );
    }

    if (user?.role === 'TRAINEE') {
      baseItems.push(
        { name: 'My Attendance', href: '/attendance', icon: CheckSquare },
        { name: 'My Assessments', href: '/assessments', icon: CheckSquare },
        { name: 'Provide Feedback', href: '/feedback', icon: MessageSquare }
      );
    }

    return baseItems;
  };

  return (
    <div className="w-64 flex-shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-lg z-10 relative">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-500">
          MEP-TMS
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
          {user?.fullName}
        </p>
        <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
          {user?.role}
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto mt-4">
        {getNavItems().map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.name} href={item.href}>
              <span
                className={clsx(
                  'group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative',
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className="mr-3 h-5 w-5 relative z-10" aria-hidden="true" />
                <span className="relative z-10">{item.name}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={logout}
          className="group flex w-full items-center px-3 py-2.5 text-sm font-medium rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );
}
