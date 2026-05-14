"use client";

import { motion } from 'framer-motion';
import { Download, Filter, FileSpreadsheet, Trophy } from 'lucide-react';

export default function ReportsPage() {
  const reports = [
    { title: 'Batch-wise Attendance', description: 'Consolidated attendance report across all selected batches.', icon: FileSpreadsheet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Assessment Scores', description: 'Detailed view of sprint, API, and project evaluation scores.', icon: FileSpreadsheet, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Topper List', description: 'Automatically generated top performers based on config.', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Consolidated Batch Report', description: 'Overall metrics including discontinued and offered status.', icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reports & Downloads</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Generate and export platform analytics</p>
        </div>
        
        <button className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl transition-colors shadow-sm">
          <Filter className="w-5 h-5" />
          <span>Global Filters</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, idx) => (
          <motion.div
            key={report.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start gap-4">
              <div className={`p-4 rounded-xl ${report.bg}`}>
                <report.icon className={`w-6 h-6 ${report.color}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{report.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{report.description}</p>
                <div className="mt-4 flex gap-3">
                  <button className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    <Download className="w-4 h-4" />
                    Export Excel
                  </button>
                  <button className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:underline">
                    <Download className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
