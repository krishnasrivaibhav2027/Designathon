"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, ClipboardList, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssessmentsPage() {
  const [selectedBatch, setSelectedBatch] = useState('');
  const [assessmentType, setAssessmentType] = useState('');

  // Mock data
  const batches = [
    { id: 'BATCH-001', name: 'Frontend React/Next.js' },
    { id: 'BATCH-002', name: 'Backend FastAPI' },
  ];

  const types = [
    { id: 'SPRINT_REVIEW', name: 'Sprint Review' },
    { id: 'API_CODING', name: 'API & Coding' },
    { id: 'PROJECT', name: 'Project Evaluation' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`Score file ${file.name} ready for upload.`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Assessment Tracker</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Upload and manage assessment scores</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-1 space-y-6"
        >
          {/* Controls */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Batch</label>
                <select 
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Batch --</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assessment Type</label>
                <div className="relative">
                  <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select 
                    value={assessmentType}
                    onChange={(e) => setAssessmentType(e.target.value)}
                    className="w-full pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                  >
                    <option value="">-- Choose Type --</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2"
        >
          {/* Upload Area */}
          <div className="h-full min-h-[400px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 flex flex-col items-center justify-center relative overflow-hidden group">
            
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mb-6"
            >
              <Upload className="w-10 h-10 text-indigo-500" />
            </motion.div>
            
            <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">Upload Scores</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-8">
              Select an Excel file containing the assessment scores. The scores will be mapped automatically to the candidates.
            </p>

            <label className="relative cursor-pointer bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 overflow-hidden">
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={!selectedBatch || !assessmentType}
              />
              <CheckCircle2 className="w-5 h-5" />
              Select Excel File
            </label>
            {(!selectedBatch || !assessmentType) && (
              <p className="text-xs text-rose-500 mt-3 font-medium">Please select batch and assessment type first</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
