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

  // Agent Modal States
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [selectedAgentBatch, setSelectedAgentBatch] = useState<Batch | null>(null);
  const [agentName, setAgentName] = useState('');
  const [modelName, setModelName] = useState('gpt-5.4-mini');
  const [temperature, setTemperature] = useState(0.7);
  const [promptInstruction, setPromptInstruction] = useState('');
  const [additionalInstruction, setAdditionalInstruction] = useState('');

  const openAgentModal = (batch: Batch) => {
    setSelectedAgentBatch(batch);
    if (batch.agent) {
      setAgentName(batch.agent.agentName || '');
      setModelName(batch.agent.modelName);
      setTemperature(batch.agent.temperature);
      setPromptInstruction(batch.agent.promptInstruction || '');
      setAdditionalInstruction(batch.agent.additionalInstruction || '');
    } else {
      setAgentName('');
      setModelName('gpt-5.4-mini');
      setTemperature(0.7);
      setPromptInstruction('');
      setAdditionalInstruction('');
    }
    setIsAgentModalOpen(true);
  };

  const handleCreateAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentBatch) return;
    try {
      await createAgent(selectedAgentBatch._id, {
        agentName: agentName.trim() || `${selectedAgentBatch.batchName} Agent`,
        modelName,
        temperature,
        promptInstruction: promptInstruction || null,
        additionalInstruction: additionalInstruction || null
      });
      toast.success(`AI Teaching Agent appointed! Redirecting to My Agents...`);
      setIsAgentModalOpen(false);
      setSelectedAgentBatch(null);
      navigate('/my-agents');
    } catch (err: any) {
      console.error("Failed to create agent:", err);
      toast.error(err.message || "Failed to create agent.");
    }
  };
  
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

  const filteredBatches = batches.filter(batch => 
    batch.batchName.toLowerCase().includes(search.toLowerCase()) || 
    batch.batchId.toLowerCase().includes(search.toLowerCase()) ||
    (batch.trainer && batch.trainer.toLowerCase().includes(search.toLowerCase()))
  );

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
                            onClick={() => openAgentModal(batch)}
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

      {/* Configure Agent Modal */}
      {isAgentModalOpen && selectedAgentBatch && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.25)', zIndex: 1000,
          backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
        }}>
          <div className="card card-glow-orange fade-in" style={{
            background: 'var(--bg-card)', width: '100%', maxWidth: 550, position: 'relative',
            display: 'flex', flexDirection: 'column', gap: 20, pointerEvents: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bot size={22} color="var(--pale-orange)" />
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Appoint AI Trainer Agent
                </h3>
              </div>
              <button 
                onClick={() => { setIsAgentModalOpen(false); setSelectedAgentBatch(null); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Appoint an AI teaching assistant for <strong>{selectedAgentBatch.batchName}</strong>. The agent will read your curriculum topics and subtopics to generate standard lessons.
            </p>

            <form onSubmit={handleCreateAgentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Agent Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)' }}>Agent Name</label>
                <input
                  type="text"
                  required
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Aisha the Full Stack AI Trainer"
                  className="glass-input"
                  style={{ width: '100%', padding: 10, borderRadius: 10, fontSize: 13.5 }}
                />
              </div>
                {/* Model Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)' }}>LLM Model Choice</label>
                  <CustomSelect 
                    value={modelName} 
                    onChange={setModelName}
                    options={[
                      { value: 'gpt-5.4-mini', label: 'Azure GPT-5.4-mini (Recommended)' },
                    ]}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Temperature */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)' }}>Creativity (Temperature)</label>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    style={{ accentColor: 'var(--pale-orange)', height: 6, borderRadius: 3 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                    <span>Strict & Precise (0.0)</span>
                    <span>Balanced (0.7)</span>
                    <span>Creative & Varied (1.0)</span>
                  </div>
                </div>

                {/* Write Own Prompt */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)' }}>Write Your Own Prompt (Overrides Default)</label>
                  <textarea
                    rows={2}
                    value={promptInstruction}
                    onChange={(e) => setPromptInstruction(e.target.value)}
                    placeholder="Enter custom instructions to completely override the default teaching prompt. Leave blank to use system defaults."
                    className="glass-input"
                    style={{ width: '100%', padding: 10, borderRadius: 10, fontSize: 13, resize: 'vertical' }}
                  />
                </div>

                {/* Additional Instructions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)' }}>Additional Instructions (Appended)</label>
                  <textarea
                    rows={2}
                    value={additionalInstruction}
                    onChange={(e) => setAdditionalInstruction(e.target.value)}
                    placeholder="Add specific guidelines, e.g. 'focus on practical code blocks', 'explain with simple metaphors'. This appends to the active prompt."
                    className="glass-input"
                    style={{ width: '100%', padding: 10, borderRadius: 10, fontSize: 13, resize: 'vertical' }}
                  />
                </div>

                {/* Modal Actions */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button 
                    type="button" 
                    onClick={() => { setIsAgentModalOpen(false); setSelectedAgentBatch(null); }}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    style={{ padding: '8px 20px', fontSize: 13 }}
                  >
                    Create & Appoint Agent
                  </button>
                </div>
              </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

