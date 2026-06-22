import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Calendar, Users, Edit, Trash2, BookOpen, UserPlus, Zap, Bot, X, Database, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import MorphLoader from '@/components/MorphLoader';
import CustomSelect from '@/components/CustomSelect';
import { useBatches, Batch } from '@/context/BatchContext';
import CreateBatchModal from '@/components/batches/CreateBatchModal';
import EditBatchModal from '@/components/batches/EditBatchModal';
import BatchDetailsDrawer from '@/components/batches/BatchDetailsDrawer';

export default function BatchesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { batches, updateBatchStatus, deleteBatch, generateAssessment, generateCodingAssessment, createAgent, fetchBatches } = useBatches();
  
  useEffect(() => {
    fetchBatches();
  }, []);

  const [search, setSearch] = useState('');
  const [generatingMap, setGeneratingMap] = useState<Record<string, boolean>>({});
  const [generatingCodingMap, setGeneratingCodingMap] = useState<Record<string, boolean>>({});
  
  const [selectedPoolDate, setSelectedPoolDate] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Extract unique pool dates
  const poolDates = Array.from(
    new Set(
      (batches || [])
        .map(b => b.onboardingDate)
        .filter((d): d is string => !!d)
    )
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const poolDateOptions = [
    { value: 'ALL', label: 'All Pool Dates' },
    ...poolDates.map(date => ({
      value: date,
      label: new Date(date).toLocaleDateString()
    }))
  ];

  const categoryOptions = [
    { value: 'ALL', label: 'All Batch Types' },
    { value: 'SPARK', label: 'Spark' },
    { value: 'FOUNDATIONAL', label: 'Foundational' },
    { value: 'STREAM', label: 'Stream' }
  ];

  
  const handleGenerateAssessment = async (batchId: string) => {
    try {
      setGeneratingMap(prev => ({ ...prev, [batchId]: true }));
      await generateAssessment(batchId);
    } catch (err) {
      // Errors are already handled inside generateAssessment toast
    } finally {
      setGeneratingMap(prev => ({ ...prev, [batchId]: false }));
    }
  };

  const handleGenerateCodingAssessment = async (batchId: string) => {
    try {
      setGeneratingCodingMap(prev => ({ ...prev, [batchId]: true }));
      await generateCodingAssessment(batchId);
    } catch (err) {
      // Errors are already handled inside toast
    } finally {
      setGeneratingCodingMap(prev => ({ ...prev, [batchId]: false }));
    }
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Edit batch state
  const [selectedEditBatch, setSelectedEditBatch] = useState<Batch | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Detail drawer state
  const [selectedViewBatch, setSelectedViewBatch] = useState<Batch | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);

  const isBatchEditable = (batch: Batch) => {
    if (batch.status !== 'PLANNED') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(batch.startDate);
    start.setHours(0, 0, 0, 0);
    return start.getTime() > today.getTime();
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the batch "${name}"? This will also remove candidates and attendance records associated with it.`)) {
      deleteBatch(id);
    }
  };

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = 
      batch.batchName.toLowerCase().includes(search.toLowerCase()) || 
      batch.batchId.toLowerCase().includes(search.toLowerCase()) ||
      (batch.trainer && batch.trainer.toLowerCase().includes(search.toLowerCase()));

    const matchesPoolDate = selectedPoolDate === 'ALL' || batch.onboardingDate === selectedPoolDate;
    const matchesCategory = selectedCategory === 'ALL' || batch.category?.toUpperCase() === selectedCategory;

    return matchesSearch && matchesPoolDate && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Batches</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Manage all training batches and assignments.</p>
        </div>
        
        {user?.role === 'COORDINATOR' && (
          <div style={{ display: 'flex', gap: 12 }}>
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

      <div className="card card-glow-blue" style={{ padding: '16px 24px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260, maxWidth: 400 }}>
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search batches by name or ID..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input"
            style={{
              width: '100%', padding: '10px 16px 10px 44px', borderRadius: 12,
              border: '1px solid var(--border-color)', outline: 'none', fontSize: 14, color: 'var(--text-primary)',
              background: 'var(--bg-main)', transition: 'border 0.2s',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <CustomSelect
            value={selectedPoolDate}
            onChange={setSelectedPoolDate}
            options={poolDateOptions}
            placeholder="All Pool Dates"
            icon={Calendar}
            style={{ minWidth: 180 }}
            dropdownWidth={220}
          />
          <CustomSelect
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categoryOptions}
            placeholder="All Batch Types"
            icon={BookOpen}
            style={{ minWidth: 180 }}
            dropdownWidth={220}
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
                  style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', height: '100%', minHeight: 360 }}
                >
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: 'var(--powder-blue-glow)', borderRadius: '50%', filter: 'blur(20px)', opacity: 0.5 }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, zIndex: 1 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{batch.batchName}</h3>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: 4, display: 'block', fontWeight: 600 }}>{batch.batchId}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={badgeClass} style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                      }}>{batch.status}</span>
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
                    {batch.onboardingDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <Database size={16} color="var(--powder-blue)" />
                        <span>Pool Date: {new Date(batch.onboardingDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {batch.trainer && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <BookOpen size={16} color="var(--yellow)" />
                        <span>Trainer: {batch.trainer}</span>
                      </div>
                    )}
                    
                    {/* Topics Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {batch.topics.slice(0, 3).map((topic, i) => {
                        const displayTopic = topic.includes(':') ? topic.split(':')[0].trim() : topic;
                        return (
                          <span 
                            key={i} 
                            title={topic}
                            style={{ 
                              padding: '4px 10px', 
                              background: 'var(--bg-main)', 
                              border: '1px solid var(--border-color)', 
                              color: 'var(--text-primary)', 
                              fontSize: 11, 
                              borderRadius: 8, 
                              fontWeight: 600,
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              maxWidth: '100%'
                            }}
                          >
                            {displayTopic}
                          </span>
                        );
                      })}
                      {batch.topics.length > 3 && (
                        <span style={{ padding: '4px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--pale-orange)', fontSize: 11, borderRadius: 8, fontWeight: 700 }}>
                          +{batch.topics.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: 24, 
                    paddingTop: 16, 
                    borderTop: '1px solid var(--border-color)', 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    gap: 12,
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    zIndex: 1 
                  }}>
                    <button 
                      onClick={() => { setSelectedViewBatch(batch); setIsDetailsDrawerOpen(true); }}
                      style={{ 
                        background: 'transparent', border: 'none', 
                        color: 'var(--powder-blue)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        padding: '6px 0'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      View Details
                    </button>

                    {/* Trainer AI Agent Button */}
                    {user?.role === 'TRAINER' && batch.trainer?.toLowerCase() === user?.fullName?.toLowerCase() && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {batch.agent ? (
                          <button
                            onClick={() => navigate('/my-agents')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 10,
                              border: '1px solid var(--green)',
                              background: 'var(--green-glow)',
                              color: 'var(--green)',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.03)';
                              e.currentTarget.style.background = 'var(--green)';
                              e.currentTarget.style.color = '#121824';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.background = 'var(--green-glow)';
                              e.currentTarget.style.color = 'var(--green)';
                            }}
                          >
                            <Bot size={13} />
                            <span>Agent Appointed</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate('/my-agents', { state: { createBatchId: batch._id } })}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 10,
                              border: '1px solid var(--powder-blue)',
                              background: 'var(--powder-blue-glow)',
                              color: 'var(--powder-blue)',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.03)';
                              e.currentTarget.style.background = 'var(--powder-blue)';
                              e.currentTarget.style.color = '#121824';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.background = 'var(--powder-blue-glow)';
                              e.currentTarget.style.color = 'var(--powder-blue)';
                            }}
                          >
                            <Bot size={13} />
                            <span>Create my Agent</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* AI Assessment Questions Button */}
                    {user?.role === 'COORDINATOR' && (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          disabled={generatingMap[batch._id]}
                          onClick={() => handleGenerateAssessment(batch._id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 10,
                            border: batch.questions && batch.questions.length > 0 ? '1px solid var(--green)' : '1px solid var(--powder-blue)',
                            background: batch.questions && batch.questions.length > 0 ? 'var(--green-glow)' : 'var(--powder-blue-glow)',
                            color: batch.questions && batch.questions.length > 0 ? 'var(--green)' : 'var(--powder-blue)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s',
                            opacity: generatingMap[batch._id] ? 0.7 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!generatingMap[batch._id]) {
                              e.currentTarget.style.transform = 'scale(1.03)';
                              e.currentTarget.style.background = batch.questions && batch.questions.length > 0 ? 'var(--green)' : 'var(--powder-blue)';
                              e.currentTarget.style.color = '#121824';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = batch.questions && batch.questions.length > 0 ? 'var(--green-glow)' : 'var(--powder-blue-glow)';
                            e.currentTarget.style.color = batch.questions && batch.questions.length > 0 ? 'var(--green)' : 'var(--powder-blue)';
                          }}
                        >
                          {generatingMap[batch._id] ? (
                            <MorphLoader inline />
                          ) : (
                            <Zap size={13} strokeWidth={2.5} />
                          )}
                          <span>{batch.questions && batch.questions.length > 0 ? 'Regen MCQs' : 'AI MCQs'}</span>
                        </button>

                        {(batch.category === 'STREAM' || batch.category === 'FOUNDATIONAL') && (
                          <button
                            disabled={generatingCodingMap[batch._id]}
                            onClick={() => handleGenerateCodingAssessment(batch._id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 10,
                              border: batch.codingQuestions && batch.codingQuestions.length > 0 ? '1px solid var(--green)' : '1px solid var(--powder-blue)',
                              background: batch.codingQuestions && batch.codingQuestions.length > 0 ? 'var(--green-glow)' : 'var(--powder-blue-glow)',
                              color: batch.codingQuestions && batch.codingQuestions.length > 0 ? 'var(--green)' : 'var(--powder-blue)',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 0.2s',
                              opacity: generatingCodingMap[batch._id] ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (!generatingCodingMap[batch._id]) {
                                e.currentTarget.style.transform = 'scale(1.03)';
                                e.currentTarget.style.background = batch.codingQuestions && batch.codingQuestions.length > 0 ? 'var(--green)' : 'var(--powder-blue)';
                                e.currentTarget.style.color = '#121824';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.background = batch.codingQuestions && batch.codingQuestions.length > 0 ? 'var(--green-glow)' : 'var(--powder-blue-glow)';
                              e.currentTarget.style.color = batch.codingQuestions && batch.codingQuestions.length > 0 ? 'var(--green)' : 'var(--powder-blue)';
                            }}
                          >
                            {generatingCodingMap[batch._id] ? (
                              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <Database size={13} strokeWidth={2.5} />
                            )}
                            <span>{batch.codingQuestions && batch.codingQuestions.length > 0 ? 'Regen Coding' : 'AI Coding'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {user?.role === 'COORDINATOR' && (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button 
                          disabled={!isBatchEditable(batch)}
                          onClick={() => { if (isBatchEditable(batch)) { setSelectedEditBatch(batch); setIsEditModalOpen(true); } }}
                          title={!isBatchEditable(batch) ? "Batch edits are disabled once start date is reached or status is active" : "Edit Batch"}
                          style={{ 
                            padding: 8, borderRadius: 10, 
                            border: isBatchEditable(batch) ? '1px solid var(--powder-blue)' : '1px solid var(--text-muted)', 
                            background: isBatchEditable(batch) ? 'var(--powder-blue-glow)' : 'rgba(255, 255, 255, 0.02)', 
                            color: isBatchEditable(batch) ? 'var(--powder-blue)' : 'var(--text-muted)', 
                            cursor: isBatchEditable(batch) ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                            opacity: isBatchEditable(batch) ? 1 : 0.4
                          }}
                          onMouseEnter={(e) => { 
                            if (isBatchEditable(batch)) {
                              e.currentTarget.style.transform = 'scale(1.05)'; 
                              e.currentTarget.style.background = 'var(--powder-blue)'; 
                              e.currentTarget.style.color = '#121824'; 
                            }
                          }}
                          onMouseLeave={(e) => { 
                            if (isBatchEditable(batch)) {
                              e.currentTarget.style.transform = 'scale(1)'; 
                              e.currentTarget.style.background = 'var(--powder-blue-glow)'; 
                              e.currentTarget.style.color = 'var(--powder-blue)'; 
                            }
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(batch._id, batch.batchName)}
                          style={{ 
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
      <EditBatchModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} batch={selectedEditBatch} />
      <BatchDetailsDrawer 
        isOpen={isDetailsDrawerOpen} 
        onClose={() => setIsDetailsDrawerOpen(false)} 
        batch={(batches || []).find(b => b._id === selectedViewBatch?._id) || selectedViewBatch} 
      />
    </div>
  );
}

