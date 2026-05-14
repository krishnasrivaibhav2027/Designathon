"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeedbackPage() {
  const [selectedBatch, setSelectedBatch] = useState('');

  // Mock data
  const batches = [
    { id: 'BATCH-001', name: 'Frontend React/Next.js' },
    { id: 'BATCH-002', name: 'Backend FastAPI' },
  ];

  const handleTriggerFeedback = () => {
    if (!selectedBatch) {
      toast.error('Please select a batch first');
      return;
    }
    toast.success('Feedback emails triggered successfully to all candidates in the batch!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Feedback Management</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Trigger feedback collection for batches</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50"
      >
        <div className="flex flex-col items-center text-center space-y-6 max-w-lg mx-auto">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/20 rounded-full flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-indigo-500" />
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Initiate Feedback</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Select a batch to trigger automated email requests to all candidates. They will receive a link to evaluate training content and trainer effectiveness.
            </p>
          </div>

          <div className="w-full space-y-4">
            <select 
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white text-center appearance-none"
            >
              <option value="">-- Choose Batch to Request Feedback --</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <button 
              onClick={handleTriggerFeedback}
              disabled={!selectedBatch}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              Trigger Emails
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
