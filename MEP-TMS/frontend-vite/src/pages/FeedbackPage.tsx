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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }} className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Feedback Management</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Trigger feedback collection for batches</p>
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="card card-glow-orange" 
        style={{ padding: 40 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ 
            width: 80, height: 80, borderRadius: '50%', 
            background: 'var(--pale-orange-glow)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            marginBottom: 24, border: '1px solid var(--pale-orange)'
          }}>
            <MessageSquare size={32} color="var(--pale-orange)" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'Outfit, sans-serif' }}>Initiate Feedback</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.5 }}>
            Select a batch to trigger automated email requests to all candidates. They will receive a link to evaluate training content and trainer effectiveness.
          </p>
          
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <select 
              value={selectedBatch} 
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="glass-input"
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-color)',
                outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-main)', textAlign: 'center', 
                transition: 'border 0.2s'
              }}
            >
              <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>-- Choose Batch to Request Feedback --</option>
              {batches.map(b => (
                <option key={b.id} value={b.id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  {b.name}
                </option>
              ))}
            </select>
            
            <button 
              onClick={handleTriggerFeedback} 
              disabled={!selectedBatch}
              className={selectedBatch ? "btn-primary" : ""}
              style={{
                width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                background: !selectedBatch ? 'var(--border-color)' : 'linear-gradient(135deg, var(--pale-orange), var(--yellow))',
                color: !selectedBatch ? 'var(--text-muted)' : '#121824', 
                fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, 
                cursor: !selectedBatch ? 'not-allowed' : 'pointer',
                boxShadow: !selectedBatch ? 'none' : '0 4px 16px var(--pale-orange-glow)', 
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedBatch) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.filter = 'brightness(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedBatch) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.filter = 'none';
                }
              }}
            >
              <Send size={18} /> Trigger Emails
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

