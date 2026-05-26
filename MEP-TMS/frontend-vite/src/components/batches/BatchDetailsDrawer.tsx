import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Calendar, BookOpen, Plus, UserPlus, FileText, CheckCircle, Info, Loader2 } from 'lucide-react';
import { useBatches, Batch } from '@/context/BatchContext';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface BatchDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch | null;
}

interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  registrationNumber: string;
}

interface AttendanceSummary {
  date: string;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
}

export default function BatchDetailsDrawer({ isOpen, onClose, batch }: BatchDetailsDrawerProps) {
  const { addNotification } = useNotifications();
  const { generateAssessment } = useBatches();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'trainees' | 'attendance' | 'curriculum' | 'assessment'>('trainees');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAssessment = async () => {
    if (!batch) return;
    try {
      setIsGenerating(true);
      await generateAssessment(batch._id);
    } catch (err) {
      // Errors are already handled inside generateAssessment toast
    } finally {
      setIsGenerating(false);
    }
  };
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  // Add Candidate Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addingCandidate, setAddingCandidate] = useState(false);

  // Load batch candidates
  const fetchCandidates = async () => {
    if (!batch) return;
    try {
      setLoadingCandidates(true);
      const response = await api.get(`/batch/${batch._id}/candidates`);
      if (Array.isArray(response.data)) {
        setCandidates(response.data);
      }
    } catch (err) {
      console.error('Failed to load batch candidates:', err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Load attendance summary
  const fetchAttendanceSummary = async () => {
    if (!batch) return;
    try {
      setLoadingAttendance(true);
      const response = await api.get(`/batch/${batch._id}/attendance-summary`);
      if (Array.isArray(response.data)) {
        setAttendance(response.data);
      }
    } catch (err) {
      console.error('Failed to load attendance summary:', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (isOpen && batch) {
      fetchCandidates();
      fetchAttendanceSummary();
      setShowAddForm(false);
      setFullName('');
      setEmail('');
      setPhone('');
    }
  }, [isOpen, batch]);

  if (!isOpen || !batch) return null;

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      toast.error('Name and Email are required.');
      return;
    }

    try {
      setAddingCandidate(true);
      const response = await api.post(`/batch/${batch._id}/candidates`, {
        fullName,
        email,
        phone: phone || undefined,
        batchId: batch._id
      });
      if (response.data) {
        toast.success('Candidate added to batch successfully!');
        // Update notification
        addNotification('CANDIDATE_ASSIGNMENT', `Trainee "${fullName}" has been assigned to batch "${batch.batchName}".`);
        // Refresh candidates list
        await fetchCandidates();
        // Reset form
        setFullName('');
        setEmail('');
        setPhone('');
        setShowAddForm(false);
      }
    } catch (err: any) {
      console.error('Failed to add candidate:', err);
      toast.error(err.response?.data?.detail || 'Failed to add candidate to batch.');
    } finally {
      setAddingCandidate(false);
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', justifyContent: 'flex-end',
      background: 'rgba(10, 15, 30, 0.5)',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>,
      {/* Click outside to close backdrop area */}
      <div 
        onClick={onClose} 
        style={{ flex: 1, height: '100%' }} 
      />

      {/* Slide-over Drawer Panel */}
      <div style={{
        width: '100%', maxWidth: 520, height: '100%',
        background: '#121824', borderLeft: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.4)',
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        color: '#f8fafc'
      }}>
        {/* Drawer Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div>
            <span style={{ 
              fontSize: 10, fontWeight: 700, color: 'var(--powder-blue)', 
              textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: 4
            }}>
              Batch Details
            </span>
            <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: '#ffffff' }}>
              {batch.batchName}
            </h2>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}>
              {batch.batchId}
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Grid (Quick metadata summary) */}
        <div style={{
          padding: '16px 28px', background: 'rgba(15, 23, 42, 0.4)',
          borderBottom: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#94a3b8' }}>
            <Calendar size={14} color="var(--powder-blue)" />
            <span>
              <strong>Schedule:</strong> {new Date(batch.startDate).toLocaleDateString()} - {new Date(batch.endDate).toLocaleDateString()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#94a3b8' }}>
            <Users size={14} color="var(--pale-orange)" />
            <span>
              <strong>Limit:</strong> {batch.sizeLimit ? `${candidates.length} / ${batch.sizeLimit} max` : `${candidates.length} candidates`}
            </span>
          </div>
          {batch.trainer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#94a3b8', gridColumn: 'span 2' }}>
              <BookOpen size={14} color="var(--yellow)" />
              <span>
                <strong>Assigned Trainer:</strong> {batch.trainer}
              </span>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border-color)',
          padding: '0 28px', background: '#121824'
        }}>
          {(['trainees', 'attendance', 'curriculum', 'assessment'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '14px 16px', background: 'transparent', border: 'none',
                color: activeTab === tab ? 'var(--powder-blue)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', position: 'relative',
                transition: 'color 0.2s'
              }}
            >
              {tab === 'trainees' 
                ? 'Trainees List' 
                : tab === 'attendance' 
                  ? 'Attendance Logs' 
                  : tab === 'curriculum' 
                    ? 'Curriculum' 
                    : 'AI Assessment'}
              {activeTab === tab && (
                <div style={{
                  position: 'absolute', bottom: -1, left: 16, right: 16, height: 2,
                  background: 'var(--powder-blue)', boxShadow: '0 0 6px var(--powder-blue)'
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {activeTab === 'trainees' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Add Candidate Trigger */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Total Enrolled: {candidates.length}
                </span>
                
                {user?.role !== 'ADMIN' && (
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{
                      padding: '6px 12px', background: showAddForm ? 'rgba(255, 107, 107, 0.15)' : 'var(--powder-blue-glow)',
                      color: showAddForm ? '#ff6b6b' : 'var(--powder-blue)', border: showAddForm ? '1px solid #ff6b6b' : '1px solid var(--powder-blue)',
                      borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    {showAddForm ? 'Cancel' : <><Plus size={14} /> Add Trainee</>}
                  </button>
                )}
              </div>

              {/* Add Candidate Form Dropdown */}
              {showAddForm && user?.role !== 'ADMIN' && (
                <form 
                  onSubmit={handleAddCandidate}
                  style={{
                    padding: 16, border: '1px solid var(--border-color)', borderRadius: 12,
                    background: 'rgba(15, 23, 42, 0.5)', display: 'flex', flexDirection: 'column', gap: 12
                  }}
                >
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Add New Trainee</h4>
                  
                  <div>
                    <input 
                      type="text" placeholder="Full Name *" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8, background: '#1e293b',
                        border: '1px solid var(--border-color)', outline: 'none', color: '#ffffff', fontSize: 13
                      }}
                    />
                  </div>

                  <div>
                    <input 
                      type="email" placeholder="Email Address *" value={email} onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8, background: '#1e293b',
                        border: '1px solid var(--border-color)', outline: 'none', color: '#ffffff', fontSize: 13
                      }}
                    />
                  </div>

                  <div>
                    <input 
                      type="text" placeholder="Phone Number (Optional)" value={phone} onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8, background: '#1e293b',
                        border: '1px solid var(--border-color)', outline: 'none', color: '#ffffff', fontSize: 13
                      }}
                    />
                  </div>

                  <button
                    type="submit" disabled={addingCandidate}
                    style={{
                      padding: '8px 16px', background: 'var(--powder-blue)', color: '#0f172a',
                      border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      marginTop: 4
                    }}
                  >
                    {addingCandidate ? 'Adding...' : 'Add Trainee to Batch'}
                  </button>
                </form>
              )}

              {/* Trainee list */}
              {loadingCandidates ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                  Loading candidates...
                </div>
              ) : candidates.length === 0 ? (
                <div style={{
                  padding: '32px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)',
                  borderRadius: 12, border: '1px dashed var(--border-color)'
                }}>
                  <UserPlus size={36} color="var(--text-secondary)" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No candidates enrolled in this batch yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {candidates.map((candidate) => (
                    <div 
                      key={candidate.id}
                      style={{
                        padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>{candidate.fullName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{candidate.email}</div>
                        {candidate.phone && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{candidate.phone}</div>}
                      </div>
                      <span style={{ 
                        fontSize: 10.5, fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)',
                        padding: '4px 8px', borderRadius: 6, color: 'var(--powder-blue)', fontWeight: 600
                      }}>
                        {candidate.registrationNumber}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                Attendance Summary by Date
              </span>

              {loadingAttendance ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                  Loading logs...
                </div>
              ) : attendance.length === 0 ? (
                <div style={{
                  padding: '32px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)',
                  borderRadius: 12, border: '1px dashed var(--border-color)'
                }}>
                  <Info size={36} color="var(--text-secondary)" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No attendance sessions logged for this batch.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {attendance.map((day, i) => (
                    <div 
                      key={i}
                      style={{
                        padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Calendar size={16} color="var(--powder-blue)" />
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#ffffff' }}>
                          {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 11, background: 'rgba(112, 214, 255, 0.1)', color: 'var(--powder-blue)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                          {day.presentCount} Present
                        </span>
                        <span style={{ fontSize: 11, background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                          {day.absentCount} Absent
                        </span>
                        {day.leaveCount > 0 && (
                          <span style={{ fontSize: 11, background: 'rgba(25fac9, 201, 90, 0.1)', color: 'var(--yellow)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                            {day.leaveCount} Leave
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'curriculum' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                Target Curriculum Topics & Subtopics
              </span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {batch.topics.map((topicStr, i) => {
                  const colonIndex = topicStr.indexOf(':');
                  let name = topicStr;
                  let subtopics: string[] = [];
                  if (colonIndex !== -1) {
                    name = topicStr.substring(0, colonIndex).trim();
                    const subtopicsStr = topicStr.substring(colonIndex + 1).trim();
                    subtopics = subtopicsStr.split(',').map(s => s.trim()).filter(s => s !== '');
                  }
                  return (
                    <div 
                      key={i}
                      style={{
                        padding: '14px 18px', borderRadius: 14, background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 10
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle size={16} color="var(--powder-blue)" />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{name}</span>
                      </div>
                      {subtopics.length > 0 && (
                        <div style={{ 
                          marginLeft: 26, 
                          borderLeft: '1px solid rgba(255, 255, 255, 0.1)', 
                          paddingLeft: 14,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}>
                          {subtopics.map((sub, subIdx) => (
                            <div key={subIdx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--powder-blue)', opacity: 0.6 }} />
                              <span>{sub}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'assessment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                  AI-Generated Multiple-Choice Questions
                </span>
                {batch.questions && batch.questions.length > 0 && user?.role === 'COORDINATOR' && (
                  <button
                    disabled={isGenerating}
                    onClick={handleGenerateAssessment}
                    style={{
                      background: 'var(--powder-blue-glow)', border: '1px solid var(--powder-blue)',
                      color: 'var(--powder-blue)', padding: '6px 12px', borderRadius: 10,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: 6, opacity: isGenerating ? 0.7 : 1
                    }}
                  >
                    {isGenerating ? (
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Plus size={13} strokeWidth={2.5} />
                    )}
                    <span>Regenerate</span>
                  </button>
                )}
              </div>

              {!batch.questions || batch.questions.length === 0 ? (
                /* Empty State */
                <div style={{
                  padding: '40px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.01)',
                  border: '1px dashed var(--border-color)', borderRadius: 16, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16
                }}>
                  <Info size={36} color="var(--text-muted)" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>No Assessment Questions Ready</p>
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', maxWidth: 300, margin: '0 auto', lineHeight: 1.4 }}>
                      {user?.role === 'ADMIN' || user?.role === 'COORDINATOR'
                        ? "Generate curriculum assessment MCQs based on course topics and subtopics using Gemini."
                        : "MCQs will be generated by the course Admin or Coordinator."}
                    </p>
                  </div>
                  {user?.role === 'COORDINATOR' && (
                    <button
                      disabled={isGenerating}
                      onClick={handleGenerateAssessment}
                      style={{
                        background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', border: 'none',
                        color: '#ffffff', padding: '10px 20px', borderRadius: 12,
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)',
                        transition: 'transform 0.15s',
                        opacity: isGenerating ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => { if(!isGenerating) e.currentTarget.style.transform = 'scale(1.02)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      {isGenerating ? (
                        <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Plus size={15} strokeWidth={2.5} />
                      )}
                      <span>Generate AI Assessment</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Questions List */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {batch.questions.map((group, groupIdx) => (
                    <div key={groupIdx} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 800, color: 'var(--powder-blue)', 
                        letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        paddingBottom: 6, display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        <BookOpen size={13} />
                        <span>{group.topic}</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {group.questions.map((q, qIdx) => (
                          <div 
                            key={qIdx}
                            style={{
                              padding: 16, borderRadius: 14, background: 'rgba(255, 255, 255, 0.01)',
                              border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 12
                            }}
                          >
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {qIdx + 1}
                              </span>
                              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#f8fafc', lineHeight: 1.4 }}>
                                {q.question}
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginLeft: 28 }}>
                              {q.options.map((opt, optIdx) => {
                                const isCorrect = opt === q.correctAnswer;
                                return (
                                  <div 
                                    key={optIdx}
                                    style={{
                                      padding: '8px 12px', borderRadius: 8,
                                      border: isCorrect ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                                      background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)',
                                      color: isCorrect ? 'var(--green)' : 'var(--text-secondary)',
                                      fontSize: 12.5, fontWeight: isCorrect ? 700 : 500,
                                      display: 'flex', alignItems: 'center', gap: 8
                                    }}
                                  >
                                    <span style={{ 
                                      fontSize: 10, fontWeight: 800, 
                                      background: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', 
                                      color: isCorrect ? 'var(--green)' : 'var(--text-secondary)',
                                      width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                    }}>
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span style={{ flex: 1 }}>{opt}</span>
                                    {isCorrect && (
                                      <CheckCircle size={14} color="var(--green)" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Local keyframes for slideIn/fadeIn styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}
