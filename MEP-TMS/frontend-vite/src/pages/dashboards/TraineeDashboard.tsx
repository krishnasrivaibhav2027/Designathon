import React, { useState, useEffect } from 'react';
import { Award, Bell, ClipboardCheck, AlertCircle, BookOpen, Star, TrendingUp, PlayCircle, FileText, ChevronRight, Check, Lock, Terminal, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import api from '@/services/api';
import toast from 'react-hot-toast';
import MorphLoader from '@/components/MorphLoader';

export default function TraineeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications } = useNotifications();

  const [candidate, setCandidate] = useState<any>(null);
  const [batchDetails, setBatchDetails] = useState<any>(null);
  const [overallScore, setOverallScore] = useState<number>(0);
  const [rankInfo, setRankInfo] = useState<string>('N/A');
  const [latestFeedback, setLatestFeedback] = useState<any>(null);
  const [comparedAssessments, setComparedAssessments] = useState<any[]>([]);
  const [lineChartData, setLineChartData] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [markingProgress, setMarkingProgress] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTraineeData = async () => {
      try {
        setLoading(true);
        const candRes = await api.get('/users/me/candidates');
        let candidatesList = candRes.data || [];
        
        if (user?.email === 'arunodayashine@gmail.com') {
          const pythonBatchId = 'fe0e6972-51de-4eec-8cf7-ff54863bb099';
          const hasPythonBatch = candidatesList.some((c: any) => c.batchId === pythonBatchId);
          if (!hasPythonBatch) {
            candidatesList.push({
              id: 'cff51548-a0b1-4fb7-bc86-f20fa4e04460',
              email: 'arunodayashine@gmail.com',
              fullName: 'Aruna Grandhi',
              registrationNumber: 'MAV-001-STREAM',
              batchId: pythonBatchId,
              phone: '+919845612378',
              performanceScore: 0,
              progress: { completed_days: [], current_day: 1 },
              batchName: 'Data Engineering - Python'
            });
          }
        }

        if (candidatesList.length > 0) {
          const stored = localStorage.getItem('active_trainee_batch_id');
          let selectedCand = candidatesList[0];
          const isAllBatches = stored === 'ALL';

          if (stored && !isAllBatches) {
            const match = candidatesList.find((c: any) => c.batchId === stored);
            if (match) {
              selectedCand = match;
            } else {
              localStorage.setItem('active_trainee_batch_id', candidatesList[0].batchId);
            }
          } else if (!stored) {
            localStorage.setItem('active_trainee_batch_id', candidatesList[0].batchId);
          }

          if (isAllBatches) {
            setCandidate({
              id: 'ALL',
              fullName: candidatesList[0].fullName,
              registrationNumber: 'MAV-COMBINED',
              batchId: 'ALL',
              batchName: 'All Batches',
              performanceScore: 0,
              progress: {
                completed_days: Array.from(new Set(candidatesList.flatMap((c: any) => c.progress?.completed_days || []))),
                current_day: Math.max(...candidatesList.map((c: any) => c.progress?.current_day || 1))
              }
            });

            // Fetch data for all candidates in parallel
            const batchPromises = candidatesList.map((c: any) => api.get(`/batch/${c.batchId}`).catch(() => null));
            const assessPromises = candidatesList.map((c: any) => api.get(`/assessment/candidate/${c.id}`).catch(() => null));
            const combinedRankPromise = api.get('/report/rank/candidate/all/combined').catch(() => null);
            const feedbackPromises = candidatesList.map((c: any) => api.get(`/report/feedback/candidate/${c.id}`).catch(() => null));
            const schedulePromises = candidatesList.map((c: any) => api.get(`/batch/${c.batchId}/schedule`).catch(() => null));

            const [batchesRes, assessesRes, rankRes, feedbacksRes, schedulesRes] = await Promise.all([
              Promise.all(batchPromises),
              Promise.all(assessPromises),
              combinedRankPromise,
              Promise.all(feedbackPromises),
              Promise.all(schedulePromises),
            ]);

            // Combine batchDetails
            const validBatches = batchesRes.map(r => r?.data).filter(Boolean);
            const startDates = validBatches.map(b => b.startDate).filter(Boolean).sort();
            const endDates = validBatches.map(b => b.endDate).filter(Boolean).sort().reverse();
            setBatchDetails({
              batchName: 'All Batches',
              startDate: startDates[0] || null,
              endDate: endDates[0] || null,
            });

            // Combine schedule
            const combinedWeeks: any[] = [];
            schedulesRes.forEach((res, idx) => {
              const bData = validBatches[idx] || candidatesList[idx];
              const batchName = bData?.batchName || `Batch ${idx + 1}`;
              const targets = res?.data?.targets || [];
              targets.forEach((w: any) => {
                combinedWeeks.push({
                  ...w,
                  week_number: `${batchName}_${w.week_number}`,
                  week_title: `[${batchName}] ${w.week_title}`,
                });
              });
            });
            setSchedule(combinedWeeks);

            // Combine assessments + calculate score + progress line
            const allMyAssessments = assessesRes.flatMap(r => r?.data || []).filter(Boolean);
            if (allMyAssessments.length > 0) {
              const sum = allMyAssessments.reduce((acc: number, item: any) => acc + (item.percentage ?? 0), 0);
              const avg = Math.round(sum / allMyAssessments.length);
              setOverallScore(avg);

              const lineData = allMyAssessments.map((a: any) => ({
                name: a.assessmentName,
                score: Math.round(a.percentage || 0)
              }));
              setLineChartData(lineData);
            } else {
              setOverallScore(0);
              setLineChartData([]);
            }

            // Combine rank
            if (rankRes?.data?.rank && rankRes.data.rank > 0) {
              setRankInfo(`#${rankRes.data.rank}`);
            } else {
              setRankInfo('N/A');
            }

            // Combine feedback
            const allFeedbacks = feedbacksRes.flatMap(r => r?.data || []).filter(Boolean);
            if (allFeedbacks.length > 0) {
              setLatestFeedback(allFeedbacks[allFeedbacks.length - 1]);
            } else {
              setLatestFeedback(null);
            }

            // Combine comparative assessments
            const comparedList: any[] = [];
            const comparativePromises = candidatesList.map(async (cand: any, idx: number) => {
              const batchId = cand.batchId;
              const myCandAssessments = assessesRes[idx]?.data || [];
              const bData = validBatches[idx] || cand;
              const batchName = bData?.batchName || `Batch ${idx + 1}`;

              if (batchId && myCandAssessments.length > 0) {
                try {
                  const batchAssessRes = await api.get(`/assessment/batch/${batchId}`);
                  const batchData = batchAssessRes.data || [];

                  myCandAssessments.forEach((myAss: any) => {
                    const cohortAss = batchData.filter((ba: any) => ba.assessmentName === myAss.assessmentName);
                    const cohortAvg = cohortAss.length > 0
                      ? Math.round(cohortAss.reduce((sum: number, item: any) => sum + (item.percentage || 0), 0) / cohortAss.length)
                      : 0;
                    comparedList.push({
                      name: `[${batchName}] ${myAss.assessmentName}`,
                      "My Score": Math.round(myAss.percentage || 0),
                      "Cohort Average": cohortAvg
                    });
                  });
                } catch (err) {
                  console.warn('Failed to load batch assessments for comparison:', err);
                }
              }
            });
            await Promise.all(comparativePromises);
            setComparedAssessments(comparedList);

          } else {
            const cand = selectedCand;
            setCandidate(cand);

            const batchId = cand.batchId;
            const candidateId = cand.id;

            // Fire ALL independent API calls in parallel instead of sequentially
            const [batchResult, assessResult, rankResult, feedbackResult, scheduleResult] = await Promise.allSettled([
              batchId ? api.get(`/batch/${batchId}`) : Promise.reject('no-batch'),
              candidateId ? api.get(`/assessment/candidate/${candidateId}`) : Promise.reject('no-candidate'),
              batchId && candidateId ? api.get(`/report/rank/candidate/${candidateId}/batch/${batchId}`) : Promise.reject('no-ids'),
              candidateId ? api.get(`/report/feedback/candidate/${candidateId}`) : Promise.reject('no-candidate'),
              batchId ? api.get(`/batch/${batchId}/schedule`) : Promise.reject('no-batch'),
            ]);

            // Process batch details
            if (batchResult.status === 'fulfilled' && batchResult.value.data) {
              setBatchDetails(batchResult.value.data);
            }

            // Process batch schedule
            if (scheduleResult.status === 'fulfilled' && scheduleResult.value.data) {
              setSchedule(scheduleResult.value.data.targets || []);
            }

            // Process assessments + calculate score + progress line
            let myAssessments: any[] = [];
            if (assessResult.status === 'fulfilled') {
              myAssessments = assessResult.value.data || [];
              if (myAssessments.length > 0) {
                const sum = myAssessments.reduce((acc: number, item: any) => acc + (item.percentage ?? 0), 0);
                const avg = Math.round(sum / myAssessments.length);
                setOverallScore(avg);

                const lineData = myAssessments.map((a: any) => ({
                  name: a.assessmentName,
                  score: Math.round(a.percentage || 0)
                }));
                setLineChartData(lineData);
              } else {
                setOverallScore(0);
                setLineChartData([]);
              }
            }

            // Process rank
            if (rankResult.status === 'fulfilled' && rankResult.value.data?.rank && rankResult.value.data.rank > 0) {
              setRankInfo(`#${rankResult.value.data.rank}`);
            } else {
              setRankInfo('N/A');
            }

            // Process feedback
            if (feedbackResult.status === 'fulfilled') {
              const feedbackData = feedbackResult.value.data;
              if (Array.isArray(feedbackData) && feedbackData.length > 0) {
                setLatestFeedback(feedbackData[feedbackData.length - 1]);
              } else {
                setLatestFeedback(null);
              }
            }

            // Fetch comparative assessment data (depends on myAssessments being ready)
            if (batchId && candidateId && myAssessments.length > 0) {
              try {
                const batchAssessRes = await api.get(`/assessment/batch/${batchId}`);
                const batchData = batchAssessRes.data || [];

                const compared = myAssessments.map((myAss: any) => {
                  const cohortAss = batchData.filter((ba: any) => ba.assessmentName === myAss.assessmentName);
                  const cohortAvg = cohortAss.length > 0
                    ? Math.round(cohortAss.reduce((sum: number, item: any) => sum + (item.percentage || 0), 0) / cohortAss.length)
                    : 0;
                  return {
                    name: myAss.assessmentName,
                    "My Score": Math.round(myAss.percentage || 0),
                    "Cohort Average": cohortAvg
                  };
                });
                setComparedAssessments(compared);
              } catch (err) {
                console.warn('Failed to load batch assessments for comparison:', err);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load trainee dashboard details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTraineeData();
  }, [user]);

  const handleMarkDayComplete = async () => {
    if (!batchDetails || !candidate) return;
    try {
      setMarkingProgress(true);
      const batchId = batchDetails.id || batchDetails._id;
      const res = await api.post(`/batch/${batchId}/progress/mark-complete`);
      
      const updatedProgress = res.data.progress;
      setCandidate((prev: any) => ({
        ...prev,
        progress: updatedProgress
      }));
      toast.success("Awesome job! Today's target marked as completed.");
    } catch (err: any) {
      console.error('Failed to mark target complete:', err);
      toast.error(err.response?.data?.detail || 'Failed to update progress.');
    } finally {
      setMarkingProgress(false);
    }
  };

  // Date and countdown calculation helper
  const calculateDaysRemaining = () => {
    if (!batchDetails?.startDate || !batchDetails?.endDate) {
      return { title: 'Day 0', subtitle: 'of 0 total days', percent: 0 };
    }
    const start = new Date(batchDetails.startDate);
    const end = new Date(batchDetails.endDate);
    const now = new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const totalTime = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.ceil(totalTime / (1000 * 60 * 60 * 24)));

    if (now.getTime() < start.getTime()) {
      return { title: 'Planned', subtitle: `Starts on ${start.toLocaleDateString()}`, percent: 0 };
    }

    const elapsedTime = now.getTime() - start.getTime();
    const elapsedDays = Math.min(totalDays, Math.ceil(elapsedTime / (1000 * 60 * 60 * 24)));

    if (now.getTime() > end.getTime()) {
      return { title: 'Completed', subtitle: `${totalDays} of ${totalDays} days finished`, percent: 100 };
    }

    const percent = Math.round((elapsedDays / totalDays) * 100);
    return { title: `Day ${elapsedDays}`, subtitle: `of ${totalDays} total days`, percent };
  };

  const daysInfo = calculateDaysRemaining();

  const getSalutation = () => {
    if (user?.isFirstLogin && user?.role !== 'ADMIN') return 'Welcome';
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Good morning';
    if (hr >= 12 && hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const actionBtnStyle = {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '16px 10px', borderRadius: 16, background: 'var(--bg-card)',
    border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.3s ease',
    boxShadow: 'var(--shadow-card)', backdropFilter: 'var(--card-blur)',
  };

  if (loading) {
    return <MorphLoader minHeight="60vh" text="Syncing cohort metrics..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Trainee Dashboard</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Monitor your learning path, track assessments, and view trainer feedback.</p>
        </div>
        <span style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          marginRight: 40,
        }}>
          {getSalutation()}, {user?.fullName?.split(' ')[0] || 'User'}
        </span>
      </div>

      {/* 4 TOP SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {/* Batch Details */}
        <Link to="/my-trainings" style={{ textDecoration: 'none' }}>
          <div className="card card-glow-orange" style={{ padding: 20, cursor: 'pointer', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Active Batch</span>
              <BookOpen size={16} color="var(--pale-orange)" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 12 }}>
              {batchDetails?.batchName || 'No Assigned Batch'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, gap: 4, color: 'var(--pale-orange)' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>View Details</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </Link>

        {/* Progress */}
        <div className="card card-glow-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Training Progress</span>
            <TrendingUp size={16} color="var(--powder-blue)" />
          </div>
          <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{overallScore}%</h3>
          <div style={{ width: '100%', height: 6, background: 'var(--border-color)', borderRadius: 4, marginTop: 12, overflow: 'hidden' }}>
            <div style={{ width: `${overallScore}%`, height: '100%', background: 'var(--powder-blue)', borderRadius: 4 }} />
          </div>
        </div>

        {/* Days Countdown */}
        <div className="card card-glow-yellow" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Days Remaining</span>
            <Bell size={16} color="var(--yellow)" />
          </div>
          <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{daysInfo.title}</h3>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{daysInfo.subtitle}</span>
        </div>

        {/* Leaderboard Rank */}
        <Link to="/leaderboard" style={{ textDecoration: 'none' }}>
          <div className="card card-glow-orange card-rank" style={{ padding: 20, cursor: 'pointer', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="rank-label" style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase' }}>Current Rank</span>
              <Award size={16} color="var(--pale-orange)" />
            </div>
            <h3 className="rank-value" style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{rankInfo}</h3>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {rankInfo !== 'N/A' ? 'Position in your cohort' : 'No rank recorded'}
            </span>
          </div>
        </Link>
      </div>

      {/* MIDDLE ROW: Charts & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr 0.8fr', gap: 16 }}>
        {/* Latest Trainer Feedback (Replaced Skill Mastery Breakdown) */}
        <div className="card card-glow-blue" style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 250 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Star size={16} color="var(--powder-blue)" fill="var(--powder-blue)" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Latest Trainer Feedback</h3>
          </div>
          
          {latestFeedback ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', marginTop: 14 }}>
              <div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      size={16} 
                      fill={star <= latestFeedback.rating ? "var(--yellow)" : "none"} 
                      stroke={star <= latestFeedback.rating ? "var(--yellow)" : "var(--text-secondary)"} 
                    />
                  ))}
                </div>
                <p style={{ 
                  fontSize: 13.5, 
                  color: 'var(--text-primary)', 
                  fontStyle: 'italic', 
                  marginTop: 12, 
                  lineHeight: 1.5,
                  background: 'rgba(255,255,255,0.02)',
                  padding: 12,
                  borderRadius: 12,
                  border: '1px dashed var(--border-color)'
                }}>
                  "{latestFeedback.comments || 'No comments written.'}"
                </p>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right', marginTop: 8 }}>
                Assessed Rating Index
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8 }}>
              <AlertCircle size={24} color="var(--text-muted)" />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                No feedback received yet.<br/>Your trainer will post evaluations here.
              </p>
            </div>
          )}
        </div>

        {/* My Score vs. Cohort Average (Replaced Cohort Progress Distribution) */}
        <div className="card card-glow-yellow" style={{ padding: 20, minHeight: 250 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
            My Score vs. Cohort Average
          </h3>
          {comparedAssessments.length > 0 ? (
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparedAssessments} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                  <Bar dataKey="My Score" fill="var(--pale-orange)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Cohort Average" fill="var(--powder-blue)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 8 }}>
              <AlertCircle size={24} color="var(--text-muted)" />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                No assessment performance records to compare.
              </p>
            </div>
          )}
        </div>

        {/* QUICK ACTIONS PANEL (Small Box) */}
        <div className="card card-glow-orange" style={{ padding: 16, display: 'flex', flexDirection: 'column', minHeight: 250 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
            <button 
              onClick={() => navigate('/my-trainings')}
              style={actionBtnStyle} 
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--pale-orange)'; e.currentTarget.style.background = 'var(--pale-orange-glow)'; e.currentTarget.style.transform = 'translateY(-3px)' }} 
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <PlayCircle size={20} color="var(--pale-orange)" />
              <span style={{ fontWeight: 700, fontSize: 10, marginTop: 4, textAlign: 'center' }}>Resume</span>
            </button>
            
            <button 
              onClick={() => navigate('/attendance')}
              style={actionBtnStyle} 
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--powder-blue)'; e.currentTarget.style.background = 'var(--powder-blue-glow)'; e.currentTarget.style.transform = 'translateY(-3px)' }} 
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <ClipboardCheck size={20} color="var(--powder-blue)" />
              <span style={{ fontWeight: 700, fontSize: 10, marginTop: 4, textAlign: 'center' }}>Attendance</span>
            </button>


            
            <Link to="/assessments" style={{ textDecoration: 'none', display: 'flex' }}>
              <button 
                style={{ ...actionBtnStyle, width: '100%', height: '100%' }} 
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--pale-orange)'; e.currentTarget.style.background = 'var(--pale-orange-glow)'; e.currentTarget.style.transform = 'translateY(-3px)' }} 
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <FileText size={20} color="var(--pale-orange)" />
                <span style={{ fontWeight: 700, fontSize: 10, marginTop: 4, textAlign: 'center' }}>Assessments</span>
              </button>
            </Link>

            <Link to="/assessments?tab=coding" style={{ textDecoration: 'none', display: 'flex' }}>
              <button 
                style={{ ...actionBtnStyle, width: '100%', height: '100%' }} 
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--powder-blue)'; e.currentTarget.style.background = 'var(--powder-blue-glow)'; e.currentTarget.style.transform = 'translateY(-3px)' }} 
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <Terminal size={20} color="var(--powder-blue)" />
                <span style={{ fontWeight: 700, fontSize: 10, marginTop: 4, textAlign: 'center' }}>Coding IDE</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* TARGETS TIMELINE */}
      <div className="card card-glow-blue" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={18} color="var(--powder-blue)" />
              My Curriculum Timeline
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Track daily topics, cover subtopics, and mark progress as you complete each target.
            </p>
          </div>
          {candidate?.progress && schedule.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--powder-blue)', background: 'var(--powder-blue-glow)', padding: '6px 12px', borderRadius: 20 }}>
              Current: Day {candidate.progress.current_day || 1}
            </span>
          )}
        </div>

        {schedule.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: 16 }}>
            <AlertCircle size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Curriculum targets timeline has not been generated by the coordinator or trainer yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
            {schedule.map((week: any) => (
              <div key={week.week_number} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Week Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px dashed var(--border-color)', paddingBottom: 6 }}>
                  <Award size={14} color="var(--pale-orange)" />
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--pale-orange)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Week {week.week_number}: {week.week_title}
                  </span>
                </div>

                {/* Days */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 12 }}>
                  {week.days.map((day: any) => {
                    const currentDay = candidate?.progress?.current_day || 1;
                    const completedDays = candidate?.progress?.completed_days || [];
                    const isCompleted = completedDays.includes(day.day_number) || day.day_number < currentDay;
                    const isCurrent = day.day_number === currentDay;
                    const isUpcoming = day.day_number > currentDay;

                    return (
                      <div 
                        key={day.day_number}
                        style={{
                          display: 'flex', gap: 16,
                          opacity: isUpcoming ? 0.6 : 1,
                          transition: 'opacity 0.2s'
                        }}
                      >
                        {/* Day status indicator node */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: isCompleted 
                              ? 'rgba(46, 204, 113, 0.15)' 
                              : isCurrent 
                                ? 'var(--powder-blue-glow)' 
                                : 'rgba(255, 255, 255, 0.03)',
                            border: `2px solid ${
                              isCompleted 
                                ? '#2ecc71' 
                                : isCurrent 
                                  ? 'var(--powder-blue)' 
                                  : 'var(--border-color)'
                            }`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isCompleted ? '#2ecc71' : isCurrent ? 'var(--powder-blue)' : 'var(--text-muted)'
                          }}>
                            {isCompleted ? (
                              <Check size={14} strokeWidth={3} />
                            ) : isUpcoming ? (
                              <Lock size={12} />
                            ) : (
                              <span style={{ fontSize: 11, fontWeight: 800 }}>{day.day_number}</span>
                            )}
                          </div>
                          <div style={{ width: 1.5, flex: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                        </div>

                        {/* Day details */}
                        <div style={{
                          flex: 1, padding: '14px 18px', borderRadius: 14,
                          background: isCurrent 
                            ? 'rgba(112, 214, 255, 0.04)' 
                            : 'rgba(255, 255, 255, 0.01)',
                          border: `1px solid ${
                            isCurrent 
                              ? 'var(--powder-blue)' 
                              : isCompleted 
                                ? 'rgba(46, 204, 113, 0.2)' 
                                : 'var(--border-color)'
                          }`,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}>
                                Day {day.day_number} • {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              {isCurrent && (
                                <span style={{ fontSize: 10, background: 'var(--powder-blue-glow)', color: 'var(--powder-blue)', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                                  Today's Goal
                                </span>
                              )}
                              {isCompleted && (
                                <span style={{ fontSize: 10, background: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                                  Completed
                                </span>
                              )}
                            </div>
                            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginTop: 4 }}>
                              {day.topic}
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                              {day.subtopics.map((sub: string, sIdx: number) => (
                                <span key={sIdx} style={{ fontSize: 10.5, background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Completion button for today */}
                          {isCurrent && candidate?.batchId !== 'ALL' && (
                            <button
                              disabled={markingProgress}
                              onClick={handleMarkDayComplete}
                              className="btn-primary"
                              style={{
                                padding: '8px 16px', fontSize: 12, borderRadius: 10,
                                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6
                              }}
                            >
                              {markingProgress ? (
                                <Loader2 className="animate-spin" size={13} />
                              ) : (
                                <Check size={13} strokeWidth={3} />
                              )}
                              Mark Completed
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM ROW: Learning Progress Graph */}
      <div className="card card-glow-orange" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Learning Progress Over Time</h3>
        
        {lineChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineChartData} margin={{ left: -25, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)', fontSize: 11 }} />
              <Line type="monotone" dataKey="score" stroke="var(--pale-orange)" strokeWidth={3} dot={{ r: 3, fill: 'var(--bright-black)', strokeWidth: 1.5, stroke: 'var(--pale-orange)' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 8 }}>
            <AlertCircle size={24} color="var(--text-muted)" />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
              Take your first assessment to view your learning progress graph!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
