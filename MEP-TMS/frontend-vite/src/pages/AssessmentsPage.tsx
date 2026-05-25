import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Upload, ClipboardList, CheckCircle2, Lock, Unlock, Play, FileText, X, AlertCircle, Award } from 'lucide-react';
import toast from 'react-hot-toast';

import { useBatches } from '@/context/BatchContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

export default function AssessmentsPage() {
  const { user } = useAuth();
  const { batches = [] } = useBatches() || {};
  
  // Trainer/Coordinator state
  const [selectedBatch, setSelectedBatch] = useState('');
  const [assessmentType, setAssessmentType] = useState('');

  // Trainee state
  const [candidate, setCandidate] = useState<any>(null);
  const [batchDetails, setBatchDetails] = useState<any>(null);
  const [submittedAssessments, setSubmittedAssessments] = useState<any[]>([]);
  const [loadingTrainee, setLoadingTrainee] = useState(true);

  // Quiz Modal state
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  const fetchTraineeData = async () => {
    try {
      setLoadingTrainee(true);
      const candRes = await api.get('/users/me/candidate');
      if (candRes.data) {
        setCandidate(candRes.data);
        const batchId = candRes.data.batchId;
        if (batchId) {
          const [batchRes, assRes] = await Promise.all([
            api.get(`/batch/${batchId}`),
            api.get(`/assessment/candidate/${candRes.data.id}`)
          ]);
          setBatchDetails(batchRes.data);
          setSubmittedAssessments(assRes.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load trainee assessment data:', err);
    } finally {
      setLoadingTrainee(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'TRAINEE') {
      fetchTraineeData();
    }
  }, [user]);

  const trainerBatches = user?.role === 'TRAINER'
    ? (batches || []).filter(b => b?.trainer?.toLowerCase() === user?.fullName?.toLowerCase())
    : (batches || []);

  const types = [{ id: 'SPRINT_REVIEW', name: 'Sprint Review' }, { id: 'API_CODING', name: 'API & Coding' }, { id: 'PROJECT', name: 'Project Evaluation' }];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) toast.success(`Score file ${file.name} ready for upload.`);
  };

  const isFormValid = selectedBatch && assessmentType;

  // Quiz submission logic
  const handleSubmitQuiz = async () => {
    const totalQuestions = activeQuiz.questions.length;
    if (Object.keys(selectedAnswers).length < totalQuestions) {
      toast.error('Please answer all questions before submitting.');
      return;
    }

    let correctCount = 0;
    activeQuiz.questions.forEach((q: any, idx: number) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    const payload = {
      batchId: batchDetails.id || batchDetails._id,
      candidateId: candidate.id || candidate._id,
      assessmentName: activeQuiz.topic,
      totalScore: totalQuestions,
      obtainedScore: correctCount
    };

    try {
      setSubmittingQuiz(true);
      const res = await api.post('/assessment/create', payload);
      setQuizResult(res.data);
      setQuizFinished(true);
      toast.success('Assessment submitted successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to submit assessment.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const closeQuiz = () => {
    setActiveQuiz(null);
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setQuizFinished(false);
    setQuizResult(null);
    fetchTraineeData();
  };

  // Trainee View rendering
  if (user?.role === 'TRAINEE') {
    if (loadingTrainee) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 600 }}>Loading planned assessments...</p>
        </div>
      );
    }

    if (!batchDetails) {
      return (
        <div className="card card-glow-orange" style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '40px auto' }}>
          <AlertCircle size={40} color="var(--pale-orange)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 20, color: 'var(--text-primary)', fontWeight: 800 }}>No Cohort Assigned</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            You are not assigned to an active training cohort. Please contact your coordinator.
          </p>
        </div>
      );
    }

    const plannedAssessments = batchDetails.questions || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>My Assessments</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>View curriculum tests and submit assessments</p>
        </div>

        {plannedAssessments.length === 0 ? (
          <div className="card card-glow-orange" style={{ padding: 40, textAlign: 'center' }}>
            <FileText size={40} color="var(--pale-orange)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 800 }}>No Planned Assessments</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, maxWidth: 500, margin: '8px auto 0' }}>
              Your training cohort does not have planned topic assessments generated yet. Please ask your trainer to generate assessment questions for the batch.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {plannedAssessments.map((topicGroup: any, idx: number) => {
              const batchId = batchDetails?.id || batchDetails?._id || '';
              const candId = candidate?.id || candidate?._id || '';
              const topicName = topicGroup?.topic || '';
              const completionKey = `completed_topic_${batchId}_${candId}_${topicName}`;
              const isUnlocked = localStorage.getItem(completionKey) === 'true';

              // Find if this assessment has already been submitted
              const submission = (submittedAssessments || []).find(
                (a: any) => a?.assessmentName?.toLowerCase() === topicName.toLowerCase()
              );

              return (
                <div
                  key={idx}
                  className={`card ${submission ? 'card-glow-blue' : isUnlocked ? 'card-glow-orange' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '24px 32px',
                    opacity: isUnlocked || submission ? 1 : 0.65,
                    background: submission ? 'rgba(34, 197, 94, 0.02)' : 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 16
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: submission
                          ? 'rgba(34, 197, 94, 0.1)'
                          : isUnlocked
                          ? 'var(--powder-blue-glow)'
                          : 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${
                          submission ? '#22c55e' : isUnlocked ? 'var(--powder-blue)' : 'var(--border-color)'
                        }`
                      }}
                    >
                      {submission ? (
                        <CheckCircle2 size={22} color="#22c55e" />
                      ) : isUnlocked ? (
                        <Unlock size={22} color="var(--powder-blue)" />
                      ) : (
                        <Lock size={22} color="var(--text-secondary)" />
                      )}
                    </div>

                    <div>
                      <h3 style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--text-primary)' }}>{topicName}</h3>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {topicGroup?.questions?.length || 0} MCQ Questions
                        </span>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border-color)' }} />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: submission ? '#22c55e' : isUnlocked ? 'var(--powder-blue)' : 'var(--text-muted)'
                          }}
                        >
                          {submission ? 'COMPLETED' : isUnlocked ? 'READY' : 'LOCKED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {submission ? (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                          {submission.obtainedScore ?? 0} / {submission.totalScore ?? 0}
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: submission.result === 'PASS' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            color: submission.result === 'PASS' ? '#22c55e' : '#ef4444',
                            border: `1px solid ${submission.result === 'PASS' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                          }}
                        >
                          {submission.result || 'PENDING'} ({typeof submission.percentage === 'number' ? submission.percentage.toFixed(1) : '0.0'}%)
                        </span>
                      </div>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => {
                          setActiveQuiz(topicGroup);
                          setCurrentQuestionIdx(0);
                          setSelectedAnswers({});
                        }}
                        className="btn-primary"
                        style={{
                          padding: '10px 20px',
                          fontSize: 13.5,
                          fontWeight: 700,
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer'
                        }}
                      >
                        <Play size={14} fill="#ffffff" /> Start Test
                      </button>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 13,
                          color: 'var(--text-muted)',
                          fontWeight: 600
                        }}
                      >
                        <Lock size={14} /> Locked
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quiz Modal Render */}
        {activeQuiz &&
          createPortal(
            <div className="quiz-modal-overlay">
              <style>{`
                .quiz-modal-overlay {
                  position: fixed;
                  inset: 0;
                  background: rgba(15, 23, 42, 0.4);
                  z-index: 1000;
                  backdrop-filter: blur(20px);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 24px;
                }
                .dark .quiz-modal-overlay {
                  background: rgba(8, 12, 24, 0.85);
                }
                .quiz-modal-card {
                  background: rgba(255, 255, 255, 0.9);
                  border: 1px solid rgba(168, 208, 230, 0.5);
                  box-shadow: 0 25px 60px -15px rgba(135, 206, 235, 0.15);
                  color: var(--text-primary);
                  width: 100%;
                  max-width: 620px;
                  display: flex;
                  flex-direction: column;
                  gap: 24px;
                  padding: 32px;
                  position: relative;
                  border-radius: 24px;
                  backdrop-filter: blur(30px);
                  font-family: 'Outfit', sans-serif;
                  box-sizing: border-box;
                  transition: all 0.3s ease;
                }
                .dark .quiz-modal-card {
                  background: rgba(23, 28, 41, 0.9);
                  border-color: rgba(255, 255, 255, 0.08);
                  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
                }
                .quiz-option-btn {
                  background: rgba(0, 0, 0, 0.02);
                  border: 1px solid var(--border-color);
                  color: var(--text-primary);
                  padding: 16px 20px;
                  border-radius: 12px;
                  font-size: 14.5px;
                  text-align: left;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  font-weight: 500;
                  width: 100%;
                }
                .quiz-option-btn:hover {
                  background: rgba(112, 214, 255, 0.05);
                  border-color: var(--powder-blue);
                }
                .quiz-option-btn.selected {
                  background: var(--powder-blue-glow);
                  border-color: var(--powder-blue);
                  box-shadow: 0 0 12px rgba(112, 214, 255, 0.15);
                  font-weight: 700;
                }
                .dark .quiz-option-btn {
                  background: rgba(255, 255, 255, 0.02);
                }
                .dark .quiz-option-btn:hover {
                  background: rgba(255, 255, 255, 0.04);
                  border-color: rgba(255, 255, 255, 0.2);
                }
                .dark .quiz-option-btn.selected {
                  background: rgba(112, 214, 255, 0.12);
                  border-color: rgba(112, 214, 255, 0.45);
                  color: #ffffff;
                }
              `}</style>

              <div className="quiz-modal-card fade-in">
                {!quizFinished ? (
                  <>
                    <button className="curriculum-close-btn" style={{ position: 'absolute', top: 20, right: 20 }} onClick={closeQuiz}>
                      <X size={16} />
                    </button>

                    <div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: 'var(--powder-blue)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.8
                        }}
                      >
                        Topic Assessment
                      </span>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                        {activeQuiz.topic}
                      </h3>
                      <div
                        style={{
                          height: 4,
                          background: 'var(--border-color)',
                          borderRadius: 2,
                          marginTop: 16,
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            background: 'var(--powder-blue)',
                            width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%`,
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 8 }}>
                        Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
                      </p>
                    </div>

                    <div style={{ minHeight: 220, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 8 }}>
                        {activeQuiz.questions[currentQuestionIdx]?.question}
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {activeQuiz.questions[currentQuestionIdx]?.options.map((option: string, oIdx: number) => {
                          const isSelected = selectedAnswers[currentQuestionIdx] === option;
                          return (
                            <button
                              key={oIdx}
                              onClick={() => setSelectedAnswers(prev => ({ ...prev, [currentQuestionIdx]: option }))}
                              className={`quiz-option-btn ${isSelected ? 'selected' : ''}`}
                            >
                              <span style={{ marginRight: 12, opacity: 0.5, fontWeight: 800 }}>
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: 20
                      }}
                    >
                      <button
                        onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                        disabled={currentQuestionIdx === 0}
                        className="slide-nav-btn"
                        style={{ padding: '8px 16px', fontSize: 13, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        Previous
                      </button>

                      {currentQuestionIdx === activeQuiz.questions.length - 1 ? (
                        <button
                          onClick={handleSubmitQuiz}
                          disabled={submittingQuiz || Object.keys(selectedAnswers).length < activeQuiz.questions.length}
                          className="btn-primary"
                          style={{
                            padding: '10px 24px',
                            fontSize: 13.5,
                            borderRadius: 10,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {submittingQuiz ? 'Submitting...' : 'Submit Test'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                          disabled={!selectedAnswers[currentQuestionIdx]}
                          className="slide-nav-btn"
                          style={{ padding: '8px 16px', fontSize: 13, borderRadius: 10 }}
                        >
                          Next Question
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }} className="fade-in">
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: quizResult?.result === 'PASS' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `2px solid ${quizResult?.result === 'PASS' ? '#22c55e' : '#ef4444'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {quizResult?.result === 'PASS' ? (
                        <Award size={36} color="#22c55e" />
                      ) : (
                        <AlertCircle size={36} color="#ef4444" />
                      )}
                    </div>

                    <div>
                      <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {quizResult?.result === 'PASS' ? 'Test Passed!' : 'Test Completed'}
                      </h3>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                        You scored {quizResult?.obtainedScore} out of {quizResult?.totalScore} questions correctly.
                      </p>
                    </div>

                    <div
                      style={{
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 16,
                        padding: '16px 32px',
                        display: 'flex',
                        gap: 32,
                        marginTop: 8
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                          {quizResult?.percentage.toFixed(0)}%
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Score Percentage</span>
                      </div>
                      <div style={{ width: 1, background: 'var(--border-color)' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            marginTop: 4,
                            color: quizResult?.result === 'PASS' ? '#22c55e' : '#ef4444'
                          }}
                        >
                          {quizResult?.result}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Status</span>
                      </div>
                    </div>

                    <button
                      onClick={closeQuiz}
                      className="btn-primary"
                      style={{
                        padding: '12px 28px',
                        fontSize: 14,
                        borderRadius: 12,
                        fontWeight: 700,
                        marginTop: 12,
                        cursor: 'pointer',
                        width: '100%',
                        maxWidth: 200
                      }}
                    >
                      Back to Assessments
                    </button>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }

  // Trainer/Coordinator original view
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Assessment Tracker</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Upload and manage assessment scores</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card card-glow-blue">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Select Batch</label>
                <select 
                  value={selectedBatch} 
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="glass-input"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-color)',
                    outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-main)', 
                    transition: 'border 0.2s'
                  }}
                >
                  <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>-- Choose Batch --</option>
                  {trainerBatches.map(b => (
                    <option key={b._id} value={b._id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      {b.batchName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Assessment Type</label>
                <div style={{ position: 'relative' }}>
                  <ClipboardList size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                  <select 
                    value={assessmentType} 
                    onChange={(e) => setAssessmentType(e.target.value)}
                    className="glass-input"
                    style={{
                      width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid var(--border-color)',
                      outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-main)', 
                      transition: 'border 0.2s'
                    }}
                  >
                    <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>-- Choose Type --</option>
                    {types.map(t => (
                      <option key={t.id} value={t.id} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card card-glow-orange" style={{ height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--powder-blue-glow) 0%, var(--pale-orange-glow) 100%)', pointerEvents: 'none' }} />
            
            <motion.div whileHover={{ scale: 1.05 }} style={{ 
              width: 80, height: 80, borderRadius: '50%', 
              background: 'var(--powder-blue-glow)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              marginBottom: 24, border: '1px solid var(--powder-blue)'
            }}>
              <Upload size={32} color="var(--powder-blue)" />
            </motion.div>
            
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'Outfit, sans-serif' }}>Upload Scores</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 300, marginBottom: 32, lineHeight: 1.5 }}>
              Select an Excel file containing the assessment scores. The scores will be mapped automatically.
            </p>

            <label style={{
              position: 'relative', cursor: !isFormValid ? 'not-allowed' : 'pointer',
              background: !isFormValid ? 'var(--border-color)' : 'linear-gradient(135deg, var(--pale-orange), var(--yellow))',
              color: !isFormValid ? 'var(--text-muted)' : '#121824', padding: '14px 28px', borderRadius: 12,
              fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: !isFormValid ? 'none' : '0 4px 16px var(--pale-orange-glow)', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (isFormValid) {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.filter = 'brightness(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (isFormValid) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'none';
              }
            }}
            >
              <input type="file" accept=".xlsx,.xls,.csv" style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }} onChange={handleFileUpload} disabled={!isFormValid} />
              <CheckCircle2 size={20} />
              Select Excel File
            </label>
            {!isFormValid && <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 16, fontWeight: 700 }}>Please select batch and assessment type first</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
