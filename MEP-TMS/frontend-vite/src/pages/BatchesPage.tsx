import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, MoreVertical, Calendar, Users, Edit, Trash2, BookOpen, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBatches } from '@/context/BatchContext';
import CreateBatchModal from '@/components/batches/CreateBatchModal';
import AssignTraineesModal from '@/components/batches/AssignTraineesModal';

export default function BatchesPage() {
  const { user } = useAuth();
  const { batches } = useBatches();
  
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const filteredBatches = batches.filter(batch => 
    batch.batchName.toLowerCase().includes(search.toLowerCase()) || 
    batch.batchId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2d3436' }}>Batches</h1>
          <p style={{ fontSize: 14, color: '#b2bec3', marginTop: 4 }}>Manage all training batches and assignments.</p>
        </div>
        
        {(user?.role === 'ADMIN' || user?.role === 'COORDINATOR') && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={() => setIsAssignModalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 12, border: '1px solid #e0e0e0',
                background: '#fff', color: '#2d3436', fontSize: 14, fontWeight: 600, cursor: 'pointer'
              }}
            >
              <UserPlus size={18} color="#5b5fc7" /><span>Assign Trainees (Excel)</span>
            </button>
            
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 12, border: 'none',
                background: '#5b5fc7', color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(91,95,199,0.2)',
              }}
            >
              <Plus size={18} /><span>Create Batch</span>
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '16px 24px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
          <Search size={18} color="#b2bec3" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" placeholder="Search batches by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12,
              border: '1px solid #e0e0e0', outline: 'none', fontSize: 14, color: '#2d3436',
              background: '#fafffe', transition: 'border 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#5b5fc7'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
        <AnimatePresence>
          {filteredBatches.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, background: '#fff', borderRadius: 16, border: '1px dashed #e0e0e0' }}>
              <BookOpen size={48} color="#b2bec3" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#636e72', fontSize: 15 }}>No batches found matching your search.</p>
            </div>
          ) : (
            filteredBatches.map((batch, idx) => (
              <motion.div key={batch._id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, delay: idx * 0.05 }}
                className="card" style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: 'rgba(91,95,199,0.04)', borderRadius: '50%' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d3436' }}>{batch.batchName}</h3>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#b2bec3', marginTop: 4, display: 'block' }}>{batch.batchId}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      background: batch.status === 'RUNNING' ? '#e8f5e9' : batch.status === 'PLANNED' ? '#fff3e0' : '#f5f5f5',
                      color: batch.status === 'RUNNING' ? '#66bb6a' : batch.status === 'PLANNED' ? '#ffa726' : '#636e72'
                    }}>{batch.status}</span>
                    {(user?.role === 'ADMIN' || user?.role === 'COORDINATOR') && (
                      <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#b2bec3' }}>
                        <MoreVertical size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#636e72' }}>
                    <Calendar size={16} color="#5b5fc7" />
                    <span>{new Date(batch.startDate).toLocaleDateString()} - {new Date(batch.endDate).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#636e72' }}>
                    <Users size={16} color="#5b5fc7" />
                    <span>
                      {batch.candidatesCount} 
                      {batch.sizeLimit ? ` / ${batch.sizeLimit}` : ''} Candidates
                    </span>
                  </div>
                  {batch.trainer && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#636e72' }}>
                      <BookOpen size={16} color="#5b5fc7" />
                      <span>Trainer: {batch.trainer}</span>
                    </div>
                  )}
                  {/* Topics Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {batch.topics.slice(0, 3).map((topic, i) => (
                      <span key={i} style={{ padding: '2px 8px', background: '#f0f0f0', color: '#636e72', fontSize: 11, borderRadius: 4, fontWeight: 500 }}>
                        {topic}
                      </span>
                    ))}
                    {batch.topics.length > 3 && (
                      <span style={{ padding: '2px 8px', background: '#f0f0f0', color: '#636e72', fontSize: 11, borderRadius: 4, fontWeight: 500 }}>
                        +{batch.topics.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button style={{ background: 'transparent', border: 'none', color: '#5b5fc7', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>View Details</button>
                  {(user?.role === 'ADMIN' || user?.role === 'COORDINATOR') && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ padding: 6, borderRadius: 8, border: 'none', background: '#e3f2fd', color: '#42a5f5', cursor: 'pointer' }}><Edit size={14} /></button>
                      <button style={{ padding: 6, borderRadius: 8, border: 'none', background: '#ffeaea', color: '#ff6b6b', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <CreateBatchModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <AssignTraineesModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} />
    </div>
  );
}
