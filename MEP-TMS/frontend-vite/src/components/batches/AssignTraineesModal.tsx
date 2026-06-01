import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileSpreadsheet, Users, ArrowRight } from 'lucide-react';
import { useBatches } from '@/context/BatchContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface AssignTraineesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AssignTraineesModal({ isOpen, onClose }: AssignTraineesModalProps) {
  const { assignTrainees } = useBatches();
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ category: string, count: number }[] | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSimulateUpload = () => {
    if (!file) {
      toast.error('Please select an Excel file first.');
      return;
    }

    setIsProcessing(true);

    // Simulate server parsing Excel and finding trainees
    setTimeout(() => {
      // Mock data representing what the Excel parsed out
      const parsedData = [
        { category: 'React', count: 180 }, // Example: Overflow condition
        { category: 'Python', count: 40 },
        { category: 'DevOps', count: 60 }
      ];
      setResults(parsedData);
      setIsProcessing(false);
    }, 1500);
  };

  const handleConfirmAssignment = () => {
    if (!results) return;

    // Execute Option B intelligent assignment logic for each category
    results.forEach(result => {
      assignTrainees(result.category, result.count);
    });

    toast.success('Trainees intelligently assigned to batches successfully!');
    onClose();
    
    // Reset state
    setTimeout(() => {
      setFile(null);
      setResults(null);
    }, 300);
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      backdropFilter: 'blur(4px)', overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex', minHeight: '100%', width: '100%',
        justifyContent: 'center', alignItems: 'center', padding: '40px 24px'
      }}>
        <div style={{
          background: 'var(--bg-dropdown)', border: '1px solid var(--border-color)', borderRadius: 16, width: '100%', maxWidth: 500,
          display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-card)'
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Intelligent Trainee Assignment</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Upload the roster from Admin to auto-map trainees.</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <AnimatePresence mode="wait">
            {!results ? (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ 
                  border: '2px dashed var(--border-color)', borderRadius: 12, padding: 40, textAlign: 'center',
                  background: 'var(--bg-card)', position: 'relative', cursor: 'pointer' 
                }}>
                  <input 
                    type="file" 
                    accept=".xlsx,.csv" 
                    onChange={handleFileChange}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                  />
                  <FileSpreadsheet size={48} color={file ? "var(--green)" : "var(--text-muted)"} style={{ margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {file ? file.name : 'Select Trainee Roster Excel'}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>Click or drag file here to upload</p>
                </div>

                <button 
                  onClick={handleSimulateUpload}
                  disabled={!file || isProcessing}
                  style={{
                    padding: '14px', borderRadius: 10, border: 'none',
                    background: file ? 'linear-gradient(135deg, var(--pale-orange) 0%, var(--yellow) 100%)' : 'var(--border-color)',
                    color: file ? '#121824' : 'var(--text-muted)',
                    fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: file && !isProcessing ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                    boxShadow: file ? '0 4px 15px var(--pale-orange-glow)' : 'none'
                  }}
                >
                  {isProcessing ? (
                     <div style={{ width: 18, height: 18, border: '2px solid var(--text-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <><Upload size={18} /> Parse & Analyze File</>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: 'rgba(46, 204, 113, 0.1)', padding: 16, borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12, border: '1px solid rgba(46, 204, 113, 0.2)' }}>
                  <Users size={24} color="var(--green)" />
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>Analysis Complete</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Found {results.reduce((acc, r) => acc + r.count, 0)} trainees across {results.length} skill categories.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Detected Skill Sets:</p>
                  {results.map((res, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{res.category}</span>
                      <span style={{ color: 'var(--powder-blue)', fontWeight: 600 }}>{res.count} Trainees</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'var(--pale-orange-glow)', padding: 16, borderRadius: 12, border: '1px solid var(--pale-orange)' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    <strong>Overflow Resolution Rule (Option B):</strong> If the number of trainees exceeds the existing batch limits, the system will automatically create overflow batches (e.g., "Batch 2") for you.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button onClick={() => setResults(null)} className="btn-secondary" style={{ flex: 1, padding: '14px', borderRadius: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    Cancel
                  </button>
                  <button onClick={handleConfirmAssignment} className="btn-primary" style={{ flex: 2, padding: '14px', borderRadius: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                    Confirm Intelligent Mapping <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>,
  document.body
);
}
