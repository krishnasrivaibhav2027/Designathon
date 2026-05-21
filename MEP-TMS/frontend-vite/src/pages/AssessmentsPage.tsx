import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, ClipboardList, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useBatches } from '@/context/BatchContext';
import { useAuth } from '@/context/AuthContext';

export default function AssessmentsPage() {
  const [selectedBatch, setSelectedBatch] = useState('');
  const [assessmentType, setAssessmentType] = useState('');
  const { batches } = useBatches();
  const { user } = useAuth();
  
  const trainerBatches = user?.role === 'TRAINER'
    ? batches.filter(b => b.trainer?.toLowerCase() === user?.fullName?.toLowerCase())
    : batches;

  const types = [{ id: 'SPRINT_REVIEW', name: 'Sprint Review' }, { id: 'API_CODING', name: 'API & Coding' }, { id: 'PROJECT', name: 'Project Evaluation' }];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) toast.success(`Score file ${file.name} ready for upload.`);
  };

  const isFormValid = selectedBatch && assessmentType;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto' }} className="fade-in">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Assessment Tracker</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Upload and manage assessment scores</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card card-glow-blue">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Select Batch</label>
                <select 
                  value={selectedBatch} 
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="glass-input"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-color)',
                    outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-main)', 
                    transition: 'border 0.2s'
                  }}
                >
                  <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>-- Choose Batch --</option>
                  {trainerBatches.map(b => (
                    <option key={b._id} value={b._id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      {b.batchName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Assessment Type</label>
                <div style={{ position: 'relative' }}>
                  <ClipboardList size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                  <select 
                    value={assessmentType} 
                    onChange={(e) => setAssessmentType(e.target.value)}
                    className="glass-input"
                    style={{
                      width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid var(--border-color)',
                      outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-main)', 
                      transition: 'border 0.2s'
                    }}
                  >
                    <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>-- Choose Type --</option>
                    {types.map(t => (
                      <option key={t.id} value={t.id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card card-glow-orange" style={{ height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--powder-blue-glow) 0%, var(--pale-orange-glow) 100%)', pointerEvents: 'none' }} />
            
            <motion.div whileHover={{ scale: 1.05 }} style={{ 
              width: 80, height: 80, borderRadius: '50%', 
              background: 'var(--powder-blue-glow)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              marginBottom: 24, border: '1px solid var(--powder-blue)'
            }}>
              <Upload size={32} color="var(--powder-blue)" />
            </motion.div>
            
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'Outfit, sans-serif' }}>Upload Scores</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 300, marginBottom: 32, lineHeight: 1.5 }}>
              Select an Excel file containing the assessment scores. The scores will be mapped automatically.
            </p>

            <label style={{
              position: 'relative', cursor: !isFormValid ? 'not-allowed' : 'pointer',
              background: !isFormValid ? 'var(--border-color)' : 'linear-gradient(135deg, var(--pale-orange), var(--yellow))',
              color: !isFormValid ? 'var(--text-muted)' : '#121824', padding: '14px 28px', borderRadius: 12,
              fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: !isFormValid ? 'none' : '0 4px 16px var(--pale-orange-glow)', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (isFormValid) {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.filter = 'brightness(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (isFormValid) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'none';
              }
            }}
            >
              <input type="file" accept=".xlsx,.xls,.csv" style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }} onChange={handleFileUpload} disabled={!isFormValid} />
              <CheckCircle2 size={20} />
              Select Excel File
            </label>
            {!isFormValid && <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 16, fontWeight: 700 }}>Please select batch and assessment type first</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

