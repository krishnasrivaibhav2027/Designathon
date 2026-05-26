import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { 
  Bot, Loader2, Play, X, ChevronRight, ChevronLeft, Trash2, Sliders, Settings 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useBatches, Batch } from '@/context/BatchContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

export default function MyAgentsPage() {
  const location = useLocation();
  const { batches, fetchBatches } = useBatches();
  const { user } = useAuth();

  // Agent Modal States
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [agentName, setAgentName] = useState('');
  const [modelName, setModelName] = useState('gemini-3.5-flash');
  const [temperature, setTemperature] = useState(0.7);
  const [promptInstruction, setPromptInstruction] = useState('');
  const [additionalInstruction, setAdditionalInstruction] = useState('');

  // Slides Preview States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewBatch, setPreviewBatch] = useState<Batch | null>(null);
  const [activeTopicIdx, setActiveTopicIdx] = useState(0);
  const [activeSubtopicIdx, setActiveSubtopicIdx] = useState(0);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // Filter batches assigned to the current logged-in trainer
  const trainerBatches = batches.filter(b => 
    b.trainer?.toLowerCase() === user?.fullName?.toLowerCase()
  );

  const activeAgents = trainerBatches.filter(b => b.agent);

  useEffect(() => {
    fetchBatches();
  }, []);

  // Background polling for agents that are in 'preparing' state
  useEffect(() => {
    const hasPreparing = trainerBatches.some(b => b.agent?.status === 'preparing');
    if (hasPreparing) {
      const interval = setInterval(() => {
        fetchBatches();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [batches]);

  // Listen to navigation state to open modal automatically
  useEffect(() => {
    if (location.state && (location.state as any).createBatchId) {
      const batchId = (location.state as any).createBatchId;
      const targetBatch = trainerBatches.find(b => b._id === batchId);
      if (targetBatch) {
        openAgentModal(targetBatch);
      }
    }
  }, [location.state, batches]);

  const openAgentModal = (batch: Batch) => {
    setSelectedBatch(batch);
    if (batch.agent) {
      setAgentName(batch.agent.agentName || '');
      setModelName(batch.agent.modelName);
      setTemperature(batch.agent.temperature);
      setPromptInstruction(batch.agent.promptInstruction || '');
      setAdditionalInstruction(batch.agent.additionalInstruction || '');
    } else {
      setAgentName('');
      setModelName('gemini-3.5-flash');
      setTemperature(0.7);
      setPromptInstruction('');
      setAdditionalInstruction('');
    }
    setIsAgentModalOpen(true);
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    try {
      // Call background API endpoint
      await api.post(`/agent/create/${selectedBatch._id}`, {
        agentName: agentName.trim() || `${selectedBatch.batchName} Agent`,
        modelName,
        temperature,
        promptInstruction: promptInstruction || null,
        additionalInstruction: additionalInstruction || null
      });
      toast.success(`AI Teaching Agent appointed! Beginning curriculum slide generation...`);
      setIsAgentModalOpen(false);
      // Refresh list to show 'preparing' state
      fetchBatches();
    } catch (err: any) {
      console.error("Failed to create agent:", err);
      const errMsg = err.response?.data?.detail || "Failed to create agent.";
      toast.error(errMsg);
    }
  };

  const handleDeleteAgent = async (batchId: string) => {
    if (!window.confirm("Are you sure you want to remove this AI Teaching Agent? The generated slides will be deleted.")) return;
    try {
      const response = await api.delete(`/agent/${batchId}`);
      if (response.data) {
        toast.success("AI Teaching Agent removed successfully.");
        await fetchBatches();
      }
    } catch (err: any) {
      console.error("Failed to delete agent:", err);
      toast.error("Failed to remove agent.");
    }
  };

  const openSlidesPreview = (batch: Batch) => {
    if (!batch.agent?.content || batch.agent.content.length === 0) {
      toast.error("This agent has no slides generated.");
      return;
    }
    setPreviewBatch(batch);
    setActiveTopicIdx(0);
    setActiveSubtopicIdx(0);
    setActiveSlideIdx(0);
    setIsPreviewOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Title Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>My Agents</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Appoint AI teaching assistants to deliver curriculum slideshows to your trainees when you're not in the mood to teach.
        </p>
      </div>

      {activeAgents.length === 0 ? (
        /* Placeholder View */
        <div className="card card-glow-blue" style={{ textAlign: 'center', padding: '64px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'var(--powder-blue-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--powder-blue)', marginBottom: 12
          }}>
            <Bot size={32} color="var(--powder-blue)" />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
            Go and create your first agent
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 450, lineHeight: 1.6 }}>
            Appoint an AI teaching assistant to teach trainees. The agent will read curriculum topics and generate detailed learning slides. Select a cohort below to start.
          </p>

          {trainerBatches.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 500, marginTop: 24, textAlign: 'left' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Your Assigned Cohorts
              </h4>
              {trainerBatches.map(b => (
                <div key={b._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 18px', border: '1px solid var(--border-color)', borderRadius: 16,
                  background: 'var(--bg-card)'
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{b.batchName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{b.topics.length} Topic Group(s)</div>
                  </div>
                  <button
                    onClick={() => openAgentModal(b)}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: 12, borderRadius: 10 }}
                  >
                    Create Agent
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Grid of active Agent cards */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {activeAgents.map((b) => {
            const agent = b.agent!;
            const isPreparing = agent.status === 'preparing';
            const isFailed = agent.status === 'failed';
            
            return (
              <div 
                key={b._id} 
                className={`card ${isPreparing ? 'card-glow-blue animate-pulse' : 'card-glow-orange'}`} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 16, 
                  minHeight: 280,
                  border: isPreparing ? '1px dashed var(--powder-blue)' : '1px solid var(--border-color)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: isPreparing ? 'var(--powder-blue)' : 'var(--pale-orange)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {isPreparing ? 'AI Agent Initializing' : 'AI Teaching Assistant'}
                    </span>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4, fontFamily: 'Outfit, sans-serif' }}>
                      {agent.agentName || 'AI Teaching Assistant'}
                    </h4>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Cohort: {b.batchName}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      disabled={isPreparing}
                      onClick={() => openAgentModal(b)}
                      style={{
                        background: 'var(--powder-blue-glow)', border: '1px solid var(--powder-blue)',
                        width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--powder-blue)', cursor: isPreparing ? 'not-allowed' : 'pointer',
                        opacity: isPreparing ? 0.5 : 1
                      }}
                      title="Configure Agent"
                    >
                      <Settings size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteAgent(b._id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
                        width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ef4444', cursor: 'pointer'
                      }}
                      title="Delete Agent"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Status Indicator */}
                {isPreparing && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10, 
                    padding: '10px 14px', 
                    background: 'var(--powder-blue-glow)', 
                    border: '1px solid rgba(112, 214, 255, 0.2)', 
                    borderRadius: 12, 
                    color: 'var(--powder-blue)', 
                    fontSize: 12, 
                    fontWeight: 600 
                  }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Learning topics & generating slides...</span>
                  </div>
                )}
                
                {isFailed && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10, 
                    padding: '10px 14px', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                    borderRadius: 12, 
                    color: '#ef4444', 
                    fontSize: 12, 
                    fontWeight: 600 
                  }}>
                    <span>Generation failed. Reconfigure to retry.</span>
                  </div>
                )}

                {/* Meta parameters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '12px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>LLM Model:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{agent.modelName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Temperature:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{agent.temperature}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Created By:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{agent.createdBy}</strong>
                  </div>
                  {agent.createdAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Appointed Date:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{new Date(agent.createdAt).toLocaleDateString()}</strong>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: 12 }}>
                  <button
                    disabled={isPreparing || isFailed}
                    onClick={() => openSlidesPreview(b)}
                    className={isPreparing || isFailed ? "btn-secondary" : "btn-primary"}
                    style={{ 
                      flex: 1, 
                      padding: '10px 0', 
                      fontSize: 13, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: 8,
                      cursor: (isPreparing || isFailed) ? 'not-allowed' : 'pointer',
                      opacity: (isPreparing || isFailed) ? 0.6 : 1
                    }}
                  >
                    {isPreparing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Preparing Slides...
                      </>
                    ) : (
                      <>
                        <Play size={14} /> Preview Course Slides
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Configure Agent Modal */}
      {isAgentModalOpen && selectedBatch && createPortal(
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
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
                  Appoint AI Trainer Agent
                </h3>
              </div>
              <button 
                onClick={() => { setIsAgentModalOpen(false); setSelectedBatch(null); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Appoint an AI teaching assistant for <strong>{selectedBatch.batchName}</strong>. The agent will read your curriculum topics and subtopics to generate standard lessons.
            </p>

            <form onSubmit={handleCreateAgent} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  <select 
                    value={modelName} 
                    onChange={(e) => setModelName(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: 10, borderRadius: 10, fontSize: 13.5 }}
                  >
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Standard)</option>
                    <option value="gemini-3.0-flash">Gemini 3.0 Flash (Fast)</option>
                  </select>
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
                    onClick={() => { setIsAgentModalOpen(false); setSelectedBatch(null); }}
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

      {/* Slide Previewer Modal */}
      {isPreviewOpen && previewBatch && previewBatch.agent?.content && createPortal(
        <div className="preview-modal-overlay">
          <style>{`
            .preview-modal-overlay {
              position: fixed;
              inset: 0;
              background: rgba(15, 23, 42, 0.4);
              z-index: 1000;
              backdrop-filter: blur(20px);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 24px;
              transition: all 0.3s ease;
            }
            .dark .preview-modal-overlay {
              background: rgba(8, 12, 24, 0.85);
            }

            .preview-modal-card {
              background: rgba(255, 255, 255, 0.85);
              border: 1px solid rgba(168, 208, 230, 0.5);
              box-shadow: 0 25px 60px -15px rgba(135, 206, 235, 0.15);
              color: var(--text-primary);
              width: 90%;
              max-width: 1050px;
              height: 82vh;
              display: grid;
              grid-template-columns: 300px 1fr;
              gap: 24px;
              padding: 32px;
              position: relative;
              border-radius: 24px;
              backdrop-filter: blur(30px);
              font-family: 'Outfit', sans-serif;
              transition: all 0.3s ease;
              box-sizing: border-box;
              overflow: hidden;
            }
            .dark .preview-modal-card {
              background: rgba(23, 28, 41, 0.85);
              border-color: rgba(255, 255, 255, 0.08);
              box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
            }

            .preview-close-btn {
              position: absolute;
              top: 20px;
              right: 20px;
              background: rgba(0, 0, 0, 0.04);
              border: 1px solid rgba(0, 0, 0, 0.08);
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: var(--text-secondary);
              cursor: pointer;
              z-index: 100;
              transition: all 0.2s;
            }
            .preview-close-btn:hover {
              background: rgba(0, 0, 0, 0.08);
              color: var(--text-primary);
            }
            .dark .preview-close-btn {
              background: rgba(255, 255, 255, 0.05);
              border-color: rgba(255, 255, 255, 0.08);
              color: rgba(255, 255, 255, 0.7);
            }
            .dark .preview-close-btn:hover {
              background: rgba(255, 255, 255, 0.15);
              color: #ffffff;
            }

            .preview-sidebar {
              border-right: 1px solid rgba(168, 208, 230, 0.4);
              padding-right: 20px;
              display: flex;
              flex-direction: column;
              gap: 20px;
              overflow-y: auto;
              min-height: 0;
            }
            .dark .preview-sidebar {
              border-right-color: rgba(255, 255, 255, 0.08);
            }

            .preview-sidebar-title {
              font-size: 16px;
              font-weight: 800;
              color: var(--text-primary);
              line-height: 1.3;
            }
            .dark .preview-sidebar-title {
              color: #ffffff;
            }

            .preview-sidebar-subtitle {
              font-size: 11px;
              color: var(--text-secondary);
              margin-top: 4px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .dark .preview-sidebar-subtitle {
              color: rgba(255, 255, 255, 0.4);
            }

            .subtopic-list-btn {
              background: transparent;
              border: 1px solid transparent;
              color: var(--text-secondary);
              padding: 10px 14px;
              border-radius: 10px;
              font-size: 13px;
              text-align: left;
              cursor: pointer;
              transition: all 0.25s ease;
              font-weight: 500;
              width: 100%;
            }
            .subtopic-list-btn:hover {
              background: rgba(135, 206, 235, 0.15);
              color: var(--text-primary);
            }
            .subtopic-list-btn.active {
              background: var(--powder-blue-glow);
              border: 1px solid var(--powder-blue);
              box-shadow: 0 4px 15px rgba(135, 206, 235, 0.1);
              color: var(--text-primary);
              font-weight: 700;
            }
            .dark .subtopic-list-btn {
              color: rgba(241, 245, 249, 0.55);
            }
            .dark .subtopic-list-btn:hover {
              background: rgba(255, 255, 255, 0.04);
              border-color: rgba(255, 255, 255, 0.05);
              color: #f8fafc;
            }
            .dark .subtopic-list-btn.active {
              background: linear-gradient(135deg, rgba(112, 214, 255, 0.12) 0%, rgba(37, 99, 235, 0.08) 100%);
              border: 1px solid rgba(112, 214, 255, 0.35);
              box-shadow: 0 4px 15px rgba(112, 214, 255, 0.08);
              color: #ffffff;
            }

            .preview-breadcrumbs {
              font-size: 11px;
              font-weight: 700;
              color: var(--text-secondary);
              text-transform: uppercase;
              letter-spacing: 0.8px;
            }
            .dark .preview-breadcrumbs {
              color: var(--powder-blue);
              text-shadow: 0 0 10px rgba(112, 214, 255, 0.15);
            }

            .preview-slide-title {
              font-size: 24px;
              font-weight: 800;
              color: var(--text-primary);
              margin-top: 6px;
              font-family: 'Outfit', sans-serif;
            }
            .dark .preview-slide-title {
              color: #ffffff;
            }

            .preview-slide-card {
              background: #ffffff;
              border: 1px solid rgba(168, 208, 230, 0.5);
              border-radius: 20px;
              padding: 36px;
              width: 100%;
              max-width: 680px;
              min-height: 300px;
              box-shadow: 0 10px 30px rgba(135, 206, 235, 0.08);
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 16px;
              transition: all 0.3s ease;
            }
            .dark .preview-slide-card {
              background: linear-gradient(145deg, rgba(13, 17, 26, 0.8) 0%, rgba(26, 32, 48, 0.5) 100%);
              border: 1px solid rgba(255, 255, 255, 0.06);
              box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4), 0 12px 32px rgba(0, 0, 0, 0.3);
            }

            .preview-bullet-orb {
              display: inline-block;
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: linear-gradient(135deg, var(--pale-orange) 0%, var(--yellow) 100%);
              box-shadow: 0 0 8px var(--pale-orange-glow);
              margin-top: 9px;
              flex-shrink: 0;
            }
            .dark .preview-bullet-orb {
              box-shadow: 0 0 8px var(--pale-orange);
            }

            .preview-bullet-text {
              font-size: 14.5px;
              line-height: 1.6;
              color: var(--text-primary);
            }
            .dark .preview-bullet-text {
              color: rgba(255, 255, 255, 0.9);
            }

            .preview-code-block {
              background: #f8fafc;
              border: 1px solid rgba(168, 208, 230, 0.5);
              padding: 16px;
              border-radius: 12px;
              font-size: 12.5px;
              font-family: monospace;
              color: #0f172a;
              overflow-x: auto;
              text-align: left;
              margin: 12px 0;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
              max-width: 100%;
              width: 100%;
            }
            .dark .preview-code-block {
              background: rgba(8, 10, 15, 0.95);
              border: 1px solid rgba(112, 214, 255, 0.15);
              color: #f8fafc;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            }

            .slide-nav-btn {
              background: rgba(0, 0, 0, 0.03);
              border: 1px solid rgba(0, 0, 0, 0.08);
              color: var(--text-primary);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              cursor: pointer;
            }
            .slide-nav-btn:hover:not(:disabled) {
              background: var(--powder-blue-glow);
              border-color: var(--powder-blue);
              color: var(--text-primary);
              transform: translateY(-1px);
            }
            .slide-nav-btn:active:not(:disabled) {
              transform: translateY(0);
            }
            .slide-nav-btn:disabled {
              opacity: 0.35;
              cursor: not-allowed;
            }
            .dark .slide-nav-btn {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #e2e8f0;
            }
            .dark .slide-nav-btn:hover:not(:disabled) {
              background: rgba(255, 255, 255, 0.12);
              border-color: rgba(255, 255, 255, 0.25);
              color: #ffffff;
            }

            .preview-nav-indicator {
              font-size: 13px;
              font-weight: 700;
              color: var(--text-secondary);
            }
            .dark .preview-nav-indicator {
              color: rgba(255, 255, 255, 0.4);
            }

            .slide-sidebar-container::-webkit-scrollbar {
              width: 4px;
            }
            .slide-sidebar-container::-webkit-scrollbar-thumb {
              background: var(--text-muted);
              border-radius: 10px;
            }
            .slide-sidebar-container::-webkit-scrollbar-thumb:hover {
              background: var(--pale-orange);
            }
            .dark .slide-sidebar-container::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.15);
            }
            .dark .slide-sidebar-container::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.3);
            }
            
            .preview-sidebar-topic {
              font-size: 10.5px; 
              font-weight: 800; 
              color: var(--pale-orange); 
              text-transform: uppercase; 
              letter-spacing: 0.8px;
            }
            .dark .preview-sidebar-topic {
              text-shadow: 0 0 10px rgba(255, 160, 89, 0.1);
            }
          `}</style>
          
          <div className="preview-modal-card fade-in">
            <button 
              onClick={() => { setIsPreviewOpen(false); setPreviewBatch(null); }}
              className="preview-close-btn"
            >
              <X size={18} />
            </button>

            {/* Left Sidebar */}
            <div className="preview-sidebar slide-sidebar-container">
              <div>
                <h4 className="preview-sidebar-title">
                  {previewBatch.batchName}
                </h4>
                <p className="preview-sidebar-subtitle">
                  Curriculum Deck
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {previewBatch.agent.content.map((topicItem, tIdx) => (
                  <div key={tIdx} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="preview-sidebar-topic">
                      Topic {tIdx + 1}: {topicItem.topic}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 4 }}>
                      {topicItem.subtopics.map((subItem, sIdx) => {
                        const isSelected = activeTopicIdx === tIdx && activeSubtopicIdx === sIdx;
                        return (
                          <button
                            key={sIdx}
                            onClick={() => {
                              setActiveTopicIdx(tIdx);
                              setActiveSubtopicIdx(sIdx);
                              setActiveSlideIdx(0);
                            }}
                            className={`subtopic-list-btn ${isSelected ? 'active' : ''}`}
                          >
                            {subItem.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel */}
            {(() => {
              const currentTopic = previewBatch.agent.content[activeTopicIdx];
              const currentSubtopic = currentTopic?.subtopics[activeSubtopicIdx];
              const currentSlide = currentSubtopic?.slides[activeSlideIdx];
              const totalSlides = currentSubtopic?.slides.length || 0;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', minHeight: 0 }}>
                  {/* Slide Header */}
                  <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 20 }}>
                    <div className="preview-breadcrumbs">
                      {currentTopic?.topic} &rsaquo; {currentSubtopic?.name}
                    </div>
                    <h3 className="preview-slide-title">
                      {currentSlide?.title}
                    </h3>
                  </div>

                  {/* Slide Content */}
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 0',
                    overflowY: 'auto'
                  }}>
                    <div className="preview-slide-card">
                      {currentSlide?.bullets.map((bullet, bIdx) => (
                        <div key={bIdx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <span className="preview-bullet-orb" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {bullet.includes('```') ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                                {bullet.split('```').map((part, idx) => {
                                  if (idx % 2 === 1) {
                                    const codeText = part.trim();
                                    const lines = part.split('\n');
                                    const firstLine = lines[0].trim().toLowerCase();
                                    const knownLanguages = [
                                      'xml', 'html', 'css', 'javascript', 'js', 
                                      'typescript', 'ts', 'java', 'python', 'py', 
                                      'yaml', 'yml', 'json', 'sql', 'bash', 'sh', 
                                      'c', 'cpp', 'csharp'
                                    ];
                                    
                                    const isLanguageHeader = knownLanguages.includes(firstLine) || 
                                      (/^[a-zA-Z]{1,10}$/.test(firstLine) && lines.length > 1);

                                    let finalCode = '';
                                    if (isLanguageHeader) {
                                      finalCode = lines.slice(1).join('\n').trim();
                                    } else {
                                      finalCode = codeText;
                                      for (const lang of knownLanguages) {
                                        if (codeText.toLowerCase().startsWith(lang) && 
                                            !/^[a-zA-Z]+$/.test(codeText.slice(lang.length, lang.length + 1))) {
                                          finalCode = codeText.slice(lang.length).trim();
                                          break;
                                        }
                                      }
                                    }

                                    return (
                                      <pre key={idx} className="preview-code-block">
                                        <code>{finalCode}</code>
                                      </pre>
                                    );
                                  }
                                  return part.trim() ? <p key={idx} className="preview-bullet-text">{part}</p> : null;
                                })}
                              </div>
                            ) : (
                              <span className="preview-bullet-text">{bullet}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Slide Navigation */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 20
                  }}>
                    <button
                      disabled={activeSlideIdx === 0}
                      onClick={() => setActiveSlideIdx(prev => prev - 1)}
                      className="slide-nav-btn"
                      style={{ padding: '10px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12 }}
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="preview-nav-indicator">
                      Slide {activeSlideIdx + 1} of {totalSlides}
                    </span>
                    <button
                      disabled={activeSlideIdx === totalSlides - 1}
                      onClick={() => setActiveSlideIdx(prev => prev + 1)}
                      className="slide-nav-btn"
                      style={{ padding: '10px 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12 }}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
