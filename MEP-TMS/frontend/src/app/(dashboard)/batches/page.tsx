"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, MoreVertical, Calendar, Users, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface Batch {
  _id: string;
  batchId: string;
  batchName: string;
  startDate: string;
  endDate: string;
  status: string;
  candidatesCount: number;
}

export default function BatchesPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchBatches = async () => {
    // MOCK DATABASE BYPASS
    setTimeout(() => {
      setBatches([
        {
          _id: "1",
          batchId: "BATCH-A1B2",
          batchName: "Frontend React/Next.js Cohort",
          startDate: "2026-06-01T00:00:00Z",
          endDate: "2026-08-30T00:00:00Z",
          status: "RUNNING",
          candidatesCount: 45
        },
        {
          _id: "2",
          batchId: "BATCH-C3D4",
          batchName: "Backend Python/FastAPI Cohort",
          startDate: "2026-07-15T00:00:00Z",
          endDate: "2026-09-15T00:00:00Z",
          status: "PLANNED",
          candidatesCount: 30
        }
      ]);
      setLoading(false);
    }, 600);
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const filteredBatches = batches.filter(batch => 
    batch.batchName.toLowerCase().includes(search.toLowerCase()) || 
    batch.batchId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Batches</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all training batches</p>
        </div>
        
        {(user?.role === 'ADMIN' || user?.role === 'COORDINATOR') && (
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-indigo-500/30">
            <Plus className="w-5 h-5" />
            <span>Create Batch</span>
          </button>
        )}
      </div>

      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search batches by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500">No batches found</p>
            </div>
          ) : (
            filteredBatches.map((batch, idx) => (
              <motion.div
                key={batch._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 hover:shadow-md transition-shadow group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{batch.batchName}</h3>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 block">{batch.batchId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      batch.status === 'RUNNING' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      batch.status === 'PLANNED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {batch.status}
                    </span>
                    {(user?.role === 'ADMIN' || user?.role === 'COORDINATOR') && (
                      <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                    <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                    <span>{new Date(batch.startDate).toLocaleDateString()} - {new Date(batch.endDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                    <Users className="w-4 h-4 mr-2 text-indigo-500" />
                    <span>{batch.candidatesCount} Candidates</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                     View Details
                   </button>
                   {(user?.role === 'ADMIN' || user?.role === 'COORDINATOR') && (
                     <div className="flex gap-2">
                       <button className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors">
                         <Edit className="w-4 h-4" />
                       </button>
                       <button className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
