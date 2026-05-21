import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeedbackPage() {
  const [selectedBatch, setSelectedBatch] = useState('');
  const batches = [{ id: 'BATCH-001', name: 'Frontend React/Next.js' }, { id: 'BATCH-002', name: 'Backend FastAPI' }];

  const handleTriggerFeedback = () => {
    if (!selectedBatch) { toast.error('Please select a batch first'); return; }
    toast.success('Feedback emails triggered successfully to all candidates in the batch!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2d3436' }}>Feedback Management</h1>
        <p style={{ fontSize: 14, color: '#b2bec3', marginTop: 4 }}>Trigger feedback collection for batches</p>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <MessageSquare size={32} color="#ffa726" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2d3436', marginBottom: 8 }}>Initiate Feedback</h2>
          <p style={{ fontSize: 14, color: '#636e72', marginBottom: 32, lineHeight: 1.5 }}>Select a batch to trigger automated email requests to all candidates. They will receive a link to evaluate training content and trainer effectiveness.</p>
          
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #e0e0e0',
                outline: 'none', fontSize: 14, color: '#2d3436', background: '#fafffe', textAlign: 'center', transition: 'border 0.2s'
              }}>
              <option value="">-- Choose Batch to Request Feedback --</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button onClick={handleTriggerFeedback} disabled={!selectedBatch}
              style={{
                width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                background: !selectedBatch ? '#e0e0e0' : 'linear-gradient(135deg, #ffa726, #ff9800)',
                color: !selectedBatch ? '#9e9e9e' : '#fff', fontSize: 15, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: !selectedBatch ? 'not-allowed' : 'pointer',
                boxShadow: !selectedBatch ? 'none' : '0 4px 16px rgba(255,167,38,0.3)', transition: 'transform 0.15s'
              }}>
              <Send size={18} /> Trigger Emails
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
