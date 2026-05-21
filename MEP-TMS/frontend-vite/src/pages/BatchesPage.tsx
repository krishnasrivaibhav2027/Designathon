import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, MoreVertical, Calendar, Users, Edit, Trash2, BookOpen, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBatches } from '@/context/BatchContext';
import CreateBatchModal from '@/components/batches/CreateBatchModal';
import AssignTraineesModal from '@/components/batches/AssignTraineesModal';

export default function BatchesPage() {
  const { user } = useAuth();
  const { batches, updateBatchStatus } = useBatches();
  
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const filteredBatches = batches.filter(batch => 
    batch.batchName.toLowerCase().includes(search.toLowerCase()) || 
    batch.batchId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Batches</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Manage all training batches and assignments.</p>
        </div>
        
        {(user?.role === 'ADMIN' || user?.role === 'COORDINATOR') && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={() => setIsAssignModalOpen(true)}
              className="btn-secondary"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', fontSize: 14,
              }}
            >
              <UserPlus size={18} color="var(--powder-blue)" />
              <span>Assign Trainees (Excel)</span>
            </button>
            
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', fontSize: 14,
              }}
            >
              <Plus size={18} />
              <span>Create Batch</span>
            </button>
          </div>
        )}
      </div>

      <div className="card card-glow-blue" style={{ padding: '16px 24px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search batches by name or ID..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input"
            style={{
              width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12,
              border: '1px solid var(--border-color)', outline: 'none', fontSize: 14, color: 'var(--text-primary)',
              background: 'var(--bg-main)', transition: 'border 0.2s',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
        <AnimatePresence>
          {filteredBatches.length === 0 ? (
            <div style={{ 
              gridColumn: '1 / -1', textAlign: 'center', padding: 48, 
              background: 'var(--bg-card)', borderRadius: 16, 
              border: '1px dashed var(--border-color)' 
            }}>
              <BookOpen size={48} color="var(--text-secondary)" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600 }}>No batches found matching your search.</p>
            </div>
          ) : (
            filteredBatches.map((batch, idx) => {
              const badgeClass = batch.status === 'RUNNING'
                ? 'badge-glow-blue'
                : batch.status === 'PLANNED'
                  ? 'badge-glow-orange'
                  : batch.status === 'COMPLETED'
                    ? 'badge-glow-green'
                    : 'badge-glow-red'; // CLOSED

              // Alternate glow classes for variation
              const cardGlowClass = idx % 3 === 0 
                ? 'card-glow-blue' 
                : idx % 3 === 1 
                  ? 'card-glow-orange' 
                  : 'card-glow-yellow';

              return (
                <motion.div 
                  key={batch._id} 
                  layout 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }} 
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className={`card ${cardGlowClass}`} 
                  style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
                >
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: 'var(--powder-blue-glow)', borderRadius: '50%', filter: 'blur(20px)', opacity: 0.5 }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, zIndex: 1 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{batch.batchName}</h3>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: 4, display: 'block', fontWeight: 600 }}>{batch.batchId}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {(user?.role === 'ADMIN' || user?.role === 'COORDINATOR') ? (
                        <select
                          value={batch.status}
                          onChange={(e) => updateBatchStatus(batch._id, e.target.value as any)}
                          className={badgeClass}
                          style={{
                            padding: '4px 24px 4px 10px',
                            borderRadius: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            appearance: 'none',
                            backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 8px center',
                            backgroundSize: '10px',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <option value="PLANNED" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>PLANNED</option>
                          <option value="RUNNING" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>RUNNING</option>
                          <option value="COMPLETED" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>COMPLETED</option>
                          <option value="CLOSED" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>CLOSED</option>
                        </select>
                      ) : (
                        <span className={badgeClass} style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                        }}>{batch.status}</span>
                      )}
                      {(user?.role === 'ADMIN' || user?.role === 'COORDINATOR') && (
                        <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                          <MoreVertical size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                      <Calendar size={16} color="var(--powder-blue)" />
                      <span>{new Date(batch.startDate).toLocaleDateString()} - {new Date(batch.endDate).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                      <Users size={16} color="var(--pale-orange)" />
                      <span>
                        {batch.candidatesCount} 
                        {batch.sizeLimit ? ` / ${batch.sizeLimit}` : ''} Candidates
                      </span>
                    </div>
                    {batch.trainer && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <BookOpen size={16} color="var(--yellow)" />
                        <span>Trainer: {batch.trainer}</span>
                      </div>
                    )}
                    
                    {/* Topics Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {batch.topics.slice(0, 3).map((topic, i) => (
                        <span key={i} style={{ padding: '4px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: 11, borderRadius: 8, fontWeight: 600 }}>
                          {topic}
                        </span>
                      ))}
                      {batch.topics.length > 3 && (
                        <span style={{ padding: '4px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--pale-orange)', fontSize: 11, borderRadius: 8, fontWeight: 700 }}>
                          +{batch.topics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                    <button style={{ 
                      background: 'transparent', border: 'none', 
                      color: 'var(--powder-blue)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      View Details
                    </button>
                    {(user?.role === 'ADMIN' || user?.role === 'COORDINATOR') && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ 
                          padding: 8, borderRadius: 10, border: '1px solid var(--powder-blue)', 
                          background: 'var(--powder-blue-glow)', color: 'var(--powder-blue)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'var(--powder-blue)'; e.currentTarget.style.color = '#121824'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--powder-blue-glow)'; e.currentTarget.style.color = 'var(--powder-blue)'; }}
                        >
                          <Edit size={14} />
                        </button>
                        <button style={{ 
                          padding: 8, borderRadius: 10, border: '1px solid #ff6b6b', 
                          background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#ff6b6b'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'; e.currentTarget.style.color = '#ff6b6b'; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <CreateBatchModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <AssignTraineesModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} />
    </div>
  );
}

