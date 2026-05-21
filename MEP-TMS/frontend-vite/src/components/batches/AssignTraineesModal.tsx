import React, { useState } from 'react';
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

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500,
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2d3436' }}>Intelligent Trainee Assignment</h2>
            <p style={{ fontSize: 13, color: '#636e72', marginTop: 4 }}>Upload the roster from Admin to auto-map trainees.</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#b2bec3' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <AnimatePresence mode="wait">
            {!results ? (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ 
                  border: '2px dashed #e0e0e0', borderRadius: 12, padding: 40, textAlign: 'center',
                  background: '#f8f9fa', position: 'relative', cursor: 'pointer' 
                }}>
                  <input 
                    type="file" 
                    accept=".xlsx,.csv" 
                    onChange={handleFileChange}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                  />
                  <FileSpreadsheet size={48} color={file ? "#4caf50" : "#b2bec3"} style={{ margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#2d3436' }}>
                    {file ? file.name : 'Select Trainee Roster Excel'}
                  </h3>
                  <p style={{ fontSize: 13, color: '#b2bec3', marginTop: 8 }}>Click or drag file here to upload</p>
                </div>

                <button 
                  onClick={handleSimulateUpload}
                  disabled={!file || isProcessing}
                  style={{
                    padding: '14px', borderRadius: 10, border: 'none',
                    background: file ? '#5b5fc7' : '#e0e0e0', color: file ? '#fff' : '#9e9e9e',
                    fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: file && !isProcessing ? 'pointer' : 'not-allowed', transition: 'background 0.2s'
                  }}
                >
                  {isProcessing ? (
                     <div style={{ width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <><Upload size={18} /> Parse & Analyze File</>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: '#e8f5e9', padding: 16, borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Users size={24} color="#2e7d32" />
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2e7d32' }}>Analysis Complete</h3>
                    <p style={{ fontSize: 13, color: '#388e3c', marginTop: 4 }}>Found {results.reduce((acc, r) => acc + r.count, 0)} trainees across {results.length} skill categories.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#2d3436' }}>Detected Skill Sets:</p>
                  {results.map((res, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8f9fa', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                      <span style={{ fontWeight: 600, color: '#2d3436' }}>{res.category}</span>
                      <span style={{ color: '#5b5fc7', fontWeight: 600 }}>{res.count} Trainees</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#fff3e0', padding: 16, borderRadius: 12 }}>
                  <p style={{ fontSize: 13, color: '#e65100', lineHeight: 1.5 }}>
                    <strong>Overflow Resolution Rule (Option B):</strong> If the number of trainees exceeds the existing batch limits, the system will automatically create overflow batches (e.g., "Batch 2") for you.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button onClick={() => setResults(null)} style={{ flex: 1, padding: '14px', borderRadius: 10, background: '#f0f0f0', color: '#636e72', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleConfirmAssignment} style={{ flex: 2, padding: '14px', borderRadius: 10, background: '#5b5fc7', color: '#fff', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                    Confirm Intelligent Mapping <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
