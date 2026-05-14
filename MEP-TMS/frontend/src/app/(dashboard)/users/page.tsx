"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Plus, Mail, Shield, UserX, Edit2 } from 'lucide-react';

export default function UsersPage() {
  const [users] = useState([
    {
      id: '1',
      fullName: 'Krishna Sri Vaibhav Grandhi',
      email: 'gksvaibav99@gmail.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      joinedAt: '2026-05-10'
    },
    {
      id: '2',
      fullName: 'Demo Coordinator',
      email: 'coordinator@mep-tms.com',
      role: 'COORDINATOR',
      status: 'ACTIVE',
      joinedAt: '2026-05-12'
    },
    {
      id: '3',
      fullName: 'John Doe',
      email: 'john.trainer@mep-tms.com',
      role: 'TRAINER',
      status: 'INACTIVE',
      joinedAt: '2026-05-13'
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage system administrators, coordinators, and trainers</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white">
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="COORDINATOR">Coordinator</option>
              <option value="TRAINER">Trainer</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="pb-3 px-4 font-semibold text-slate-500 dark:text-slate-400">User</th>
                <th className="pb-3 px-4 font-semibold text-slate-500 dark:text-slate-400">Role</th>
                <th className="pb-3 px-4 font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="pb-3 px-4 font-semibold text-slate-500 dark:text-slate-400">Joined</th>
                <th className="pb-3 px-4 font-semibold text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <motion.tr 
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                        {user.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{user.fullName}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      <Shield className="w-3 h-3" />
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      user.status === 'ACTIVE' 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                        : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-500 dark:text-slate-400 text-sm">
                    {user.joinedAt}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors">
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
