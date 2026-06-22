import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Calendar, BookOpen, Plus, UserPlus, FileText, CheckCircle, Info, Database, Sliders, User, Award, GitCommit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useBatches, Batch } from '@/context/BatchContext';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import MorphLoader from '@/components/MorphLoader';

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
  isActive?: boolean;
}

interface AttendanceSummary {
  date: string;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
}

export default function BatchDetailsDrawer({ isOpen, onClose, batch }: BatchDetailsDrawerProps) {
  const { addNotification } = useNotifications();
  const { generateAssessment, generateCodingAssessment } = useBatches();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'trainees' | 'attendance' | 'curriculum' | 'assessment' | 'timeline'>('trainees');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [batch?._id, activeTab]);

  const totalRecords = candidates.length;
  const totalPages = Math.ceil(totalRecords / 10) || 1;
  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * 10;
    return candidates.slice(startIndex, startIndex + 10);
  }, [candidates, currentPage]);
  const [attendance, setAttendance] = useState<AttendanceSummary[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCoding, setIsGeneratingCoding] = useState(false);
  const [assessmentSubTab, setAssessmentSubTab] = useState<'mcq' | 'coding'>('mcq');

  // Candidate activation/deactivation and deletion confirmation
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    type: 'disable' | 'enable' | 'delete';
    candidate: Candidate;
  } | null>(null);

  // Detailed Attendance States
  const [detailedAttendance, setDetailedAttendance] = useState<any[]>([]);
  const [loadingDetailedAttendance, setLoadingDetailedAttendance] = useState(false);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'present' | 'absent' | 'leave'>('present');

  const fetchDetailedAttendance = async (showLoader = false) => {
    if (!batch) return;
    try {
      if (showLoader) {
        setLoadingDetailedAttendance(true);
      }
      const response = await api.get(`/attendance/batch/${batch._id}`);
      if (Array.isArray(response.data)) {
        setDetailedAttendance(response.data);
      }
    } catch (err) {
      console.error('Failed to load detailed attendance:', err);
    } finally {
      setLoadingDetailedAttendance(false);
    }
  };

  const handleToggleStatus = async (candidate: Candidate) => {
    if (!batch) return;
    try {
      const currentActive = candidate.isActive !== false;
      const targetActive = !currentActive;
      await api.put(`/batch/${batch._id}/candidates/${candidate.id}/status`, { isActive: targetActive });
      toast.success(`Trainee ${targetActive ? 'activated' : 'deactivated'} successfully!`);
      await fetchCandidates();
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
      toast.error(err.response?.data?.detail || 'Failed to update trainee status.');
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!batch) return;
    try {
      await api.delete(`/batch/${batch._id}/candidates/${candidateId}`);
      toast.success('Trainee removed from batch successfully!');
      
      const cand = candidates.find(c => c.id === candidateId);
      if (cand) {
        addNotification('CANDIDATE_ASSIGNMENT', `Trainee "${cand.fullName}" has been removed from batch "${batch.batchName}".`);
      }
      await fetchCandidates();
    } catch (err: any) {
      console.error('Failed to delete candidate:', err);
      toast.error(err.response?.data?.detail || 'Failed to remove trainee.');
    }
  };

  const triggerAction = (type: 'disable' | 'enable' | 'delete', candidate: Candidate) => {
    setConfirmAction({ isOpen: true, type, candidate });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, candidate } = confirmAction;
    setConfirmAction(null);
    if (type === 'delete') {
      await handleDeleteCandidate(candidate.id);
    } else {
      await handleToggleStatus(candidate);
    }
  };

  const getTraineesForDate = (dateStr: string) => {
    const present: Candidate[] = [];
    const leave: Candidate[] = [];
    const absent: Candidate[] = [];

    const statusMap: Record<string, string> = {};
    detailedAttendance.forEach((att) => {
      if (att.date) {
        const attDateStr = att.date.substring(0, 10);
        if (attDateStr === dateStr) {
          statusMap[att.candidateId] = att.status;
        }
      }
    });

    candidates.forEach((cand) => {
      const status = statusMap[cand.id];
      if (status === 'PRESENT') {
        present.push(cand);
      } else if (status === 'LEAVE') {
        leave.push(cand);
      } else {
        absent.push(cand);
      }
    });

    return { present, leave, absent };
  };

  // Timeline States
  const [schedule, setSchedule] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [editingTrainee, setEditingTrainee] = useState<string | null>(null);

  const fetchTimelineData = async (showLoader = false) => {
    if (!batch) return;
    try {
      if (showLoader) {
        setLoadingSchedule(true);
      }
      const batchUuid = batch._id;
      const [scheduleRes, progressRes] = await Promise.all([
        api.get(`/batch/${batchUuid}/schedule`),
        api.get(`/batch/${batchUuid}/progress`)
      ]);
      setSchedule(scheduleRes.data.targets || []);
      setProgress(progressRes.data || []);
    } catch (err) {
      console.error('Failed to load timeline data:', err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  useEffect(() => {
    if (isOpen && batch && activeTab === 'timeline') {
      const showLoader = schedule.length === 0;
      fetchTimelineData(showLoader);
    }
  }, [isOpen, batch?._id, activeTab]);

  const handleGenerateSchedule = async () => {
    if (!batch) return;
    try {
      setGeneratingSchedule(true);
      const batchUuid = batch._id;
      toast.loading('Generating target timeline schedule...', { id: 'generate-timeline' });
      const res = await api.post(`/batch/${batchUuid}/schedule/generate`);
      setSchedule(res.data.targets || []);
      toast.success('Targets timeline generated successfully!', { id: 'generate-timeline' });
      fetchTimelineData();
    } catch (err: any) {
      console.error('Failed to generate targets schedule:', err);
      toast.error(err.response?.data?.detail || 'Failed to generate schedule.', { id: 'generate-timeline' });
    } finally {
      setGeneratingSchedule(false);
    }
  };

  const handleAdjustProgress = async (candidateId: string, currentDay: number) => {
    if (!batch) return;
    try {
      const batchUuid = batch._id;
      await api.post(`/batch/${batchUuid}/progress/adjust`, { candidateId, currentDay });
      toast.success('Trainee progress updated successfully!');
      setEditingTrainee(null);
      fetchTimelineData();
    } catch (err) {
      console.error('Failed to adjust progress:', err);
      toast.error('Failed to adjust trainee progress.');
    }
  };

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

  const handleGenerateCodingAssessment = async () => {
    if (!batch) return;
    try {
      setIsGeneratingCoding(true);
      await generateCodingAssessment(batch._id);
    } catch (err) {
      // Errors are already handled inside toast
    } finally {
      setIsGeneratingCoding(false);
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
  const fetchCandidates = async (showLoader = false) => {
    if (!batch) return;
    try {
      if (showLoader) {
        setLoadingCandidates(true);
      }
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
  const fetchAttendanceSummary = async (showLoader = false) => {
    if (!batch) return;
    try {
      if (showLoader) {
        setLoadingAttendance(true);
      }
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
      const showCandLoader = candidates.length === 0;
      const showAttLoader = attendance.length === 0;
      const showDetailedAttLoader = detailedAttendance.length === 0;

      fetchCandidates(showCandLoader);
      fetchAttendanceSummary(showAttLoader);
      fetchDetailedAttendance(showDetailedAttLoader);
      setShowAddForm(false);
      setFullName('');
      setEmail('');
      setPhone('');
    } else {
      // Reset state when drawer closed/inactive
      setCandidates([]);
      setAttendance([]);
      setDetailedAttendance([]);
      setSchedule([]);
      setProgress([]);
      setActiveTab('trainees');
    }
  }, [isOpen, batch?._id]);

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
        background: 'var(--bg-dropdown)', borderLeft: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.4)',
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        color: 'var(--text-primary)'
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
            <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Plus Jakarta Sans, sans-serif', color: 'var(--text-primary)' }}>
              {batch.batchName}
            </h2>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', display: 'block', marginTop: 4 }}>
              {batch.batchId}
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(128, 128, 128, 0.08)', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(128, 128, 128, 0.15)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(128, 128, 128, 0.08)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Grid (Quick metadata summary) */}
        <div style={{
          padding: '16px 28px', background: 'rgba(128, 128, 128, 0.05)',
          borderBottom: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <Calendar size={14} color="var(--powder-blue)" />
            <span>
              <strong>Schedule:</strong> {new Date(batch.startDate).toLocaleDateString()} - {new Date(batch.endDate).toLocaleDateString()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <Users size={14} color="var(--pale-orange)" />
            <span>
              <strong>Limit:</strong> {batch.sizeLimit ? `${candidates.length} / ${batch.sizeLimit} max` : `${candidates.length} candidates`}
            </span>
          </div>
          {batch.onboardingDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
              <Database size={14} color="var(--powder-blue)" />
              <span>
                <strong>Pool Date:</strong> {new Date(batch.onboardingDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {batch.trainer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)', gridColumn: 'span 2' }}>
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
          padding: '0 28px', background: 'var(--bg-dropdown)'
        }}>
          {(['trainees', 'attendance', 'curriculum', 'timeline', 'assessment'] as const).map((tab) => (
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
                    : tab === 'timeline'
                      ? 'Targets Timeline'
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
                    background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 12
                  }}
                >
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Add New Trainee</h4>
                  
                  <div>
                    <input 
                      type="text" placeholder="Full Name *" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-dropdown)',
                        border: '1px solid var(--border-color)', outline: 'none', color: 'var(--text-primary)', fontSize: 13
                      }}
                    />
                  </div>

                  <div>
                    <input 
                      type="email" placeholder="Email Address *" value={email} onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-dropdown)',
                        border: '1px solid var(--border-color)', outline: 'none', color: 'var(--text-primary)', fontSize: 13
                      }}
                    />
                  </div>

                  <div>
                    <input 
                      type="text" placeholder="Phone Number (Optional)" value={phone} onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-dropdown)',
                        border: '1px solid var(--border-color)', outline: 'none', color: 'var(--text-primary)', fontSize: 13
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
                  {paginatedCandidates.map((candidate) => (
                    <div 
                      key={candidate.id}
                      style={{ 
                        position: 'relative', 
                        width: '100%', 
                        overflow: 'hidden', 
                        borderRadius: 12 
                      }}
                    >
                      {/* Background Action Buttons */}
                      <div 
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          gap: 8,
                          padding: '8px 16px',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          background: 'rgba(128, 128, 128, 0.08)'
                        }}
                      >
                        {/* Disable/Enable Button */}
                        <button
                          onClick={() => triggerAction(candidate.isActive !== false ? 'disable' : 'enable', candidate)}
                          type="button"
                          style={{
                            height: '100%',
                            padding: '0 14px',
                            borderRadius: 8,
                            border: `1px solid ${candidate.isActive !== false ? '#f97316' : 'var(--powder-blue)'}`,
                            background: candidate.isActive !== false ? 'rgba(249, 115, 22, 0.15)' : 'rgba(112, 214, 255, 0.15)',
                            color: candidate.isActive !== false ? '#f97316' : 'var(--powder-blue)',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          {candidate.isActive !== false ? <EyeOff size={14} /> : <Eye size={14} />}
                          <span>{candidate.isActive !== false ? 'Disable' : 'Enable'}</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => triggerAction('delete', candidate)}
                          type="button"
                          style={{
                            height: '100%',
                            padding: '0 14px',
                            borderRadius: 8,
                            border: '1px solid #ef4444',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>

                      {/* Foreground Card */}
                      <motion.div 
                        drag={user?.role === 'COORDINATOR' ? "x" : false}
                        dragConstraints={{ left: -160, right: 0 }}
                        dragElastic={0.1}
                        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                        style={{
                          padding: 14, 
                          borderRadius: 12, 
                          background: 'var(--bg-dropdown)', 
                          border: '1px solid var(--border-color)', 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          position: 'relative',
                          zIndex: 10,
                          touchAction: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', opacity: candidate.isActive !== false ? 1 : 0.6 }}>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {candidate.fullName}
                              {candidate.isActive === false && (
                                <span style={{ fontSize: 9.5, background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{candidate.email}</div>
                            {candidate.phone && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{candidate.phone}</div>}
                          </div>
                          <span style={{ 
                            fontSize: 10.5, fontFamily: 'monospace', background: 'rgba(128, 128, 128, 0.08)',
                            padding: '4px 8px', borderRadius: 6, color: 'var(--powder-blue)', fontWeight: 600
                          }}>
                            {candidate.registrationNumber}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination Controls */}
              {totalRecords > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 16, marginTop: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Showing {Math.min((currentPage - 1) * 10 + 1, totalRecords)} to {Math.min(currentPage * 10, totalRecords)} of {totalRecords} records
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="btn-secondary"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8,
                        fontSize: 12, fontWeight: 700,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1
                      }}
                    >
                      Prev
                    </button>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="btn-secondary"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8,
                        fontSize: 12, fontWeight: 700,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1
                      }}
                    >
                      Next
                    </button>
                  </div>
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
                    <motion.div 
                      key={i}
                      onClick={() => {
                        setSelectedAttendanceDate(day.date.substring(0, 10));
                        setActiveModalTab('present');
                      }}
                      whileHover={{ y: -2, borderColor: 'var(--powder-blue)', boxShadow: '0 0 10px rgba(112, 214, 255, 0.15)' }}
                      style={{
                        padding: 14, borderRadius: 12, background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', cursor: 'pointer', transition: 'borderColor 0.2s, boxShadow 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Calendar size={16} color="var(--powder-blue)" />
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
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
                          <span style={{ fontSize: 11, background: 'rgba(251, 191, 36, 0.1)', color: 'var(--yellow)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                            {day.leaveCount} Leave
                          </span>
                        )}
                      </div>
                    </motion.div>
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
                        padding: '14px 18px', borderRadius: 14, background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 10
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle size={16} color="var(--powder-blue)" />
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</span>
                      </div>
                      {subtopics.length > 0 && (
                        <div style={{ 
                          marginLeft: 26, 
                          borderLeft: '1px solid var(--border-color)', 
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

          {activeTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Targets Timeline and Trainee Tracking
                </span>
                {schedule.length === 0 && user?.role !== 'TRAINEE' && (
                  <button
                    disabled={generatingSchedule}
                    onClick={handleGenerateSchedule}
                    className="btn-primary"
                    style={{
                      padding: '8px 16px', fontSize: 12.5, borderRadius: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'
                    }}
                  >
                    {generatingSchedule ? <MorphLoader inline /> : <Sliders size={14} />}
                    Generate Timeline targets via AI
                  </button>
                )}
              </div>

              {loadingSchedule ? (
                <MorphLoader text="Loading timeline..." />
              ) : schedule.length === 0 ? (
                <div className="card card-glow-orange" style={{ padding: 40, textAlign: 'center' }}>
                  <Calendar size={40} color="var(--pale-orange)" style={{ margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 800 }}>No Target Timeline Scheduled</h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: 8, maxWidth: 500, margin: '8px auto 0' }}>
                    This batch does not have daily targets scheduled yet. Ask the coordinator or click generate to set up the targets timeline.
                  </p>
                </div>
              ) : (() => {
                // Calculate targets
                const getTargetDayNumber = () => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const allDays = schedule.reduce((acc: any[], week: any) => [...acc, ...week.days], []);
                  const match = allDays.find((d: any) => d.date === todayStr);
                  if (match) return match.day_number;
                  
                  const pastDays = allDays.filter((d: any) => new Date(d.date) < new Date());
                  if (pastDays.length > 0) {
                    return pastDays[pastDays.length - 1].day_number;
                  }
                  return 0;
                };
                const targetDay = getTargetDayNumber();
                const totalTrainees = progress.length;
                const onTrack = progress.filter(p => p.progress.current_day >= targetDay).length;
                const behind = progress.filter(p => p.progress.current_day < targetDay).length;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Header stats */}
                    <div style={{ display: 'flex', gap: 16, background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{totalTrainees}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Total Enrolled</span>
                      </div>
                      <div style={{ width: 1, background: 'var(--border-color)' }} />
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: 20, fontWeight: 800, color: '#22c55e' }}>{onTrack}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>On Track / Ahead</span>
                      </div>
                      <div style={{ width: 1, background: 'var(--border-color)' }} />
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{behind}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Lagging Behind</span>
                      </div>
                    </div>

                    {/* Timeline List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {schedule.map((week) => (
                        <div key={week.week_number} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {/* Week milestone */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px dashed var(--border-color)', paddingBottom: 8 }}>
                            <Award size={16} color="var(--pale-orange)" />
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--pale-orange)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Week {week.week_number}: {week.week_title}
                            </span>
                          </div>

                          {/* Days list */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 12 }}>
                            {week.days.map((day: any) => {
                              const traineesOnDay = progress.filter(p => p.progress.current_day === day.day_number);
                              const isCurrentTarget = day.day_number === targetDay;
                              
                              return (
                                <div key={day.day_number} style={{ display: 'flex', gap: 16 }}>
                                  {/* Timeline node */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ 
                                      width: 26, height: 26, borderRadius: '50%', 
                                      background: isCurrentTarget ? 'var(--powder-blue-glow)' : 'rgba(128, 128, 128, 0.05)', 
                                      border: `2px solid ${isCurrentTarget ? 'var(--powder-blue)' : 'var(--border-color)'}`,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800,
                                      color: isCurrentTarget ? 'var(--powder-blue)' : 'var(--text-secondary)'
                                    }}>
                                      {day.day_number}
                                    </div>
                                    <div style={{ width: 1.5, flex: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                                  </div>

                                  {/* Day contents */}
                                  <div style={{ 
                                    flex: 1, padding: '12px 16px', borderRadius: 12, 
                                    background: isCurrentTarget ? 'rgba(112, 214, 255, 0.08)' : 'var(--bg-card)',
                                    border: `1px solid ${isCurrentTarget ? 'var(--powder-blue)' : 'var(--border-color)'}`
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <div>
                                        <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: 700 }}>
                                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                          {isCurrentTarget && " (Today's Target)"}
                                        </span>
                                        <h4 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{day.topic}</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                          {day.subtopics.map((sub: string, sIdx: number) => (
                                            <span key={sIdx} style={{ fontSize: 10, background: 'rgba(128, 128, 128, 0.08)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>
                                              {sub}
                                            </span>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Trainees List at Day */}
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 120 }}>
                                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700 }}>Trainees Here</span>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                          {traineesOnDay.length === 0 ? (
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>
                                          ) : (
                                            traineesOnDay.map((trainee) => {
                                              const isEditing = editingTrainee === trainee.candidateId;
                                              return (
                                                <div key={trainee.candidateId} style={{ position: 'relative' }}>
                                                  <button
                                                    onClick={() => {
                                                      if (user?.role !== 'TRAINEE') {
                                                        setEditingTrainee(isEditing ? null : trainee.candidateId);
                                                      }
                                                    }}
                                                    style={{
                                                      width: 28, height: 28, borderRadius: '50%', 
                                                      background: 'linear-gradient(135deg, var(--powder-blue), var(--pale-orange))', 
                                                      color: '#121824', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                      fontSize: 10, fontWeight: 800, border: 'none', cursor: 'pointer'
                                                    }}
                                                    title={`${trainee.fullName} (Click to adjust Day)`}
                                                  >
                                                    {trainee.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                                  </button>

                                                  {isEditing && (
                                                    <div style={{
                                                      position: 'absolute', right: 0, top: 32, zIndex: 50,
                                                      background: 'var(--bg-dropdown)', border: '1px solid var(--border-color)',
                                                      padding: 10, borderRadius: 8, boxShadow: 'var(--shadow-card)',
                                                      display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120
                                                    }}>
                                                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700 }}>Move to:</span>
                                                      <select
                                                        onChange={(e) => handleAdjustProgress(trainee.candidateId, Number(e.target.value))}
                                                        value={day.day_number}
                                                        style={{
                                                          background: 'var(--bg-dropdown)', border: '1px solid var(--border-color)',
                                                          color: 'var(--text-primary)', fontSize: 11, padding: '2px 4px', borderRadius: 4,
                                                          width: '100%', outline: 'none'
                                                        }}
                                                      >
                                                        {schedule.reduce((all, w) => [...all, ...w.days], []).map((d: any) => (
                                                          <option key={d.day_number} value={d.day_number} style={{ background: 'var(--bg-dropdown)', color: 'var(--text-primary)' }}>
                                                            Day {d.day_number}
                                                          </option>
                                                        ))}
                                                      </select>
                                                      <button onClick={() => setEditingTrainee(null)} style={{ fontSize: 9, background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', textAlign: 'right', fontWeight: 700 }}>
                                                        Cancel
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'assessment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Category check for STREAM sub-navigation */}
              {(batch.category === 'STREAM' || batch.category === 'FOUNDATIONAL') && (
                <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                  <button
                    onClick={() => setAssessmentSubTab('mcq')}
                    style={{
                      padding: '6px 12px',
                      background: assessmentSubTab === 'mcq' ? 'var(--powder-blue-glow)' : 'transparent',
                      border: 'none',
                      color: assessmentSubTab === 'mcq' ? 'var(--powder-blue)' : 'var(--text-secondary)',
                      fontSize: 12.5,
                      fontWeight: 700,
                      borderRadius: 8,
                      cursor: 'pointer'
                    }}
                  >
                    Multiple Choice (MCQ)
                  </button>
                  <button
                    onClick={() => setAssessmentSubTab('coding')}
                    style={{
                      padding: '6px 12px',
                      background: assessmentSubTab === 'coding' ? 'var(--powder-blue-glow)' : 'transparent',
                      border: 'none',
                      color: assessmentSubTab === 'coding' ? 'var(--powder-blue)' : 'var(--text-secondary)',
                      fontSize: 12.5,
                      fontWeight: 700,
                      borderRadius: 8,
                      cursor: 'pointer'
                    }}
                  >
                    Coding Challenges
                  </button>
                </div>
              )}

              {assessmentSubTab === 'mcq' || (batch.category !== 'STREAM' && batch.category !== 'FOUNDATIONAL') ? (
                <>
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
                          <MorphLoader inline />
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
                      padding: '40px 24px', textAlign: 'center', background: 'rgba(128, 128, 128, 0.03)',
                      border: '1px dashed var(--border-color)', borderRadius: 16, display: 'flex',
                      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16
                    }}>
                      <Info size={36} color="var(--text-muted)" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>No Assessment Questions Ready</p>
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
                            <MorphLoader inline />
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
                                  padding: 16, borderRadius: 14, background: 'var(--bg-card)',
                                  border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 12
                                }}
                              >
                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', background: 'rgba(128, 128, 128, 0.08)', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {qIdx + 1}
                                  </span>
                                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
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
                                          border: isCorrect ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                                          background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(128, 128, 128, 0.03)',
                                          color: isCorrect ? 'var(--green)' : 'var(--text-secondary)',
                                          fontSize: 12.5, fontWeight: isCorrect ? 700 : 500,
                                          display: 'flex', alignItems: 'center', gap: 8
                                        }}
                                      >
                                        <span style={{ 
                                          fontSize: 10, fontWeight: 800, 
                                          background: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(128, 128, 128, 0.08)', 
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
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      AI-Generated Programming Challenges
                    </span>
                    {batch.codingQuestions && batch.codingQuestions.length > 0 && user?.role === 'COORDINATOR' && (
                      <button
                        disabled={isGeneratingCoding}
                        onClick={handleGenerateCodingAssessment}
                        style={{
                          background: 'var(--powder-blue-glow)', border: '1px solid var(--powder-blue)',
                          color: 'var(--powder-blue)', padding: '6px 12px', borderRadius: 10,
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex',
                          alignItems: 'center', gap: 6, opacity: isGeneratingCoding ? 0.7 : 1
                        }}
                      >
                        {isGeneratingCoding ? (
                          <MorphLoader inline />
                        ) : (
                          <Plus size={13} strokeWidth={2.5} />
                        )}
                        <span>Regenerate</span>
                      </button>
                    )}
                  </div>

                  {!batch.codingQuestions || batch.codingQuestions.length === 0 ? (
                    /* Empty State */
                    <div style={{
                      padding: '40px 24px', textAlign: 'center', background: 'rgba(128, 128, 128, 0.03)',
                      border: '1px dashed var(--border-color)', borderRadius: 16, display: 'flex',
                      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16
                    }}>
                      <Info size={36} color="var(--text-muted)" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>No Coding Assessments Ready</p>
                        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', maxWidth: 300, margin: '0 auto', lineHeight: 1.4 }}>
                          {user?.role === 'ADMIN' || user?.role === 'COORDINATOR'
                            ? "Generate curriculum coding challenges based on course topics and subtopics using Gemini."
                            : "Coding challenges will be generated by the course Admin or Coordinator."}
                        </p>
                      </div>
                      {user?.role === 'COORDINATOR' && (
                        <button
                          disabled={isGeneratingCoding}
                          onClick={handleGenerateCodingAssessment}
                          style={{
                            background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', border: 'none',
                            color: '#ffffff', padding: '10px 20px', borderRadius: 12,
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex',
                            alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)',
                            transition: 'transform 0.15s',
                            opacity: isGeneratingCoding ? 0.7 : 1
                          }}
                          onMouseEnter={(e) => { if(!isGeneratingCoding) e.currentTarget.style.transform = 'scale(1.02)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          {isGeneratingCoding ? (
                            <MorphLoader inline />
                          ) : (
                            <Plus size={15} strokeWidth={2.5} />
                          )}
                          <span>Generate AI Coding</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Coding Challenges List */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {batch.codingQuestions.map((group, groupIdx) => (
                        <div key={groupIdx} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 800, color: 'var(--powder-blue)', 
                            letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)',
                            paddingBottom: 6, display: 'flex', alignItems: 'center', gap: 6
                          }}>
                            <Database size={13} />
                            <span>{group.topic}</span>
                          </div>
                          
                          <div style={{
                            padding: 16, borderRadius: 14, background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 10
                          }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Problem Statement</h4>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                              {group.problemStatement}
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                              <div>
                                <h5 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Input Format</h5>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{group.inputFormat}</p>
                              </div>
                              <div>
                                <h5 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Output Format</h5>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{group.outputFormat}</p>
                              </div>
                            </div>

                            <div style={{ marginTop: 8 }}>
                              <h5 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Constraints</h5>
                              <code style={{ fontSize: 11.5, color: 'var(--pale-orange)', background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                {group.constraints}
                              </code>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                              <div>
                                <h5 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Sample Input</h5>
                                <pre style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: 8, borderRadius: 6, overflowX: 'auto' }}>
                                  {group.sampleInput}
                                </pre>
                              </div>
                              <div>
                                <h5 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Sample Output</h5>
                                <pre style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: 8, borderRadius: 6, overflowX: 'auto' }}>
                                  {group.sampleOutput}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {confirmAction && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10, 15, 30, 0.6)',
          backdropFilter: 'blur(4px)',
          padding: 20
        }}>
          <div style={{
            background: 'var(--bg-dropdown)',
            border: '1px solid var(--border-color)',
            borderRadius: 16,
            width: '100%',
            maxWidth: 400,
            padding: 24,
            boxShadow: 'var(--shadow-card)',
            color: 'var(--text-primary)'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              {confirmAction.type === 'delete' ? (
                <Trash2 size={20} color="#ef4444" />
              ) : (
                <Info size={20} color={confirmAction.type === 'disable' ? '#f97316' : 'var(--powder-blue)'} />
              )}
              <span>
                {confirmAction.type === 'delete' && 'Confirm Delete Trainee'}
                {confirmAction.type === 'disable' && 'Confirm Account Deactivation'}
                {confirmAction.type === 'enable' && 'Confirm Account Activation'}
              </span>
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
              {confirmAction.type === 'delete' && `Are you sure you want to delete "${confirmAction.candidate.fullName}" from this batch? This action will remove their cohort enrollment record.`}
              {confirmAction.type === 'disable' && `Are you sure you want to deactivate "${confirmAction.candidate.fullName}"'s user account? They will lose access to the platform.`}
              {confirmAction.type === 'enable' && `Are you sure you want to activate "${confirmAction.candidate.fullName}"'s user account? They will regain access to the platform.`}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setConfirmAction(null)}
                className="btn-secondary"
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: confirmAction.type === 'delete' ? '#ef4444' : confirmAction.type === 'disable' ? '#f97316' : 'var(--powder-blue)',
                  color: confirmAction.type === 'delete' ? '#ffffff' : confirmAction.type === 'disable' ? '#ffffff' : '#0f172a'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Trainees List Modal */}
      {selectedAttendanceDate && (() => {
        const { present, leave, absent } = getTraineesForDate(selectedAttendanceDate);
        const formattedDate = new Date(selectedAttendanceDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const activeList = activeModalTab === 'present' ? present : activeModalTab === 'leave' ? leave : absent;

        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10, 15, 30, 0.6)',
            backdropFilter: 'blur(4px)',
            padding: 20
          }}>
            <div style={{
              background: 'var(--bg-dropdown)',
              border: '1px solid var(--border-color)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              height: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-card)',
              color: 'var(--text-primary)'
            }}>
              {/* Modal Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Attendance Details</h3>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formattedDate}</span>
                </div>
                <button 
                  onClick={() => setSelectedAttendanceDate(null)}
                  style={{
                    background: 'rgba(128, 128, 128, 0.08)', border: 'none', cursor: 'pointer',
                    color: 'var(--text-secondary)', width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(128, 128, 128, 0.15)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(128, 128, 128, 0.08)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tab Selection */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-dropdown)' }}>
                {(['present', 'absent', 'leave'] as const).map((tab) => {
                  const count = tab === 'present' ? present.length : tab === 'leave' ? leave.length : absent.length;
                  const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                  const isActive = activeModalTab === tab;
                  const tabColor = tab === 'present' ? 'var(--powder-blue)' : tab === 'leave' ? 'var(--yellow)' : '#ff6b6b';

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveModalTab(tab)}
                      style={{
                        flex: 1, padding: '12px 8px', background: 'transparent', border: 'none',
                        color: isActive ? tabColor : 'var(--text-secondary)',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', position: 'relative',
                        transition: 'color 0.2s'
                      }}
                    >
                      {label} ({count})
                      {isActive && (
                        <div style={{
                          position: 'absolute', bottom: -1, left: 12, right: 12, height: 2,
                          background: tabColor, boxShadow: `0 0 6px ${tabColor}`
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Scrollable Trainees List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {loadingDetailedAttendance ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <MorphLoader text="Loading attendance..." />
                  </div>
                ) : activeList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                    No trainees listed in this category.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {activeList.map((cand) => (
                      <div 
                        key={cand.id}
                      style={{
                          padding: 12, borderRadius: 10, background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{cand.fullName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{cand.email}</div>
                        </div>
                        <span style={{ 
                          fontSize: 10, fontFamily: 'monospace', background: 'rgba(128, 128, 128, 0.08)',
                          padding: '2px 6px', borderRadius: 4, color: 'var(--powder-blue)', fontWeight: 600
                        }}>
                          {cand.registrationNumber}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
