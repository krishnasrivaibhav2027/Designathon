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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2d3436' }}>Assessment Tracker</h1>
        <p style={{ fontSize: 14, color: '#b2bec3', marginTop: 4 }}>Upload and manage assessment scores</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 8 }}>Select Batch</label>
                <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e0e0e0',
                    outline: 'none', fontSize: 14, color: '#2d3436', background: '#fafffe', transition: 'border 0.2s'
                  }}>
                  <option value="">-- Choose Batch --</option>
                  {trainerBatches.map(b => <option key={b._id} value={b._id}>{b.batchName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 8 }}>Assessment Type</label>
                <div style={{ position: 'relative' }}>
                  <ClipboardList size={18} color="#b2bec3" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                  <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid #e0e0e0',
                      outline: 'none', fontSize: 14, color: '#2d3436', background: '#fafffe', transition: 'border 0.2s'
                    }}>
                    <option value="">-- Choose Type --</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card" style={{ height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(91,95,199,0.03), rgba(38,198,218,0.03))', pointerEvents: 'none' }} />
            
            <motion.div whileHover={{ scale: 1.05 }} style={{ width: 80, height: 80, borderRadius: '50%', background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Upload size={32} color="#42a5f5" />
            </motion.div>
            
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2d3436', marginBottom: 8 }}>Upload Scores</h3>
            <p style={{ fontSize: 14, color: '#636e72', maxWidth: 300, marginBottom: 32, lineHeight: 1.5 }}>
              Select an Excel file containing the assessment scores. The scores will be mapped automatically.
            </p>

            <label style={{
              position: 'relative', cursor: (!selectedBatch || !assessmentType) ? 'not-allowed' : 'pointer',
              background: (!selectedBatch || !assessmentType) ? '#e0e0e0' : 'linear-gradient(135deg, #42a5f5, #26c6da)',
              color: (!selectedBatch || !assessmentType) ? '#9e9e9e' : '#fff', padding: '14px 28px', borderRadius: 12,
              fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: (!selectedBatch || !assessmentType) ? 'none' : '0 4px 16px rgba(66,165,245,0.3)', transition: 'transform 0.15s'
            }}>
              <input type="file" accept=".xlsx,.xls,.csv" style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }} onChange={handleFileUpload} disabled={!selectedBatch || !assessmentType} />
              <CheckCircle2 size={20} />
              Select Excel File
            </label>
            {(!selectedBatch || !assessmentType) && <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 16, fontWeight: 500 }}>Please select batch and assessment type first</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
