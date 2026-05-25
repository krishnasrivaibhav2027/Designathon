import React, { useState, useEffect } from 'react';
import { Award, Bell, ClipboardCheck, AlertCircle, BookOpen, Star, TrendingUp, PlayCircle, Bot, FileText, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import api from '@/services/api';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTraineeData = async () => {
      try {
        setLoading(true);
        const candRes = await api.get('/users/me/candidate');
        if (candRes.data) {
          const cand = candRes.data;
          setCandidate(cand);

          const batchId = cand.batchId;
          const candidateId = cand.id;

          if (batchId) {
            try {
              const batchRes = await api.get(`/batch/${batchId}`);
              if (batchRes.data) setBatchDetails(batchRes.data);
            } catch (err) {
              console.error('Failed to fetch batch details:', err);
            }
          }

          // Fetch candidate assessments & calculate real score + progress line
          let myAssessments = [];
          if (candidateId) {
            try {
              const assessRes = await api.get(`/assessment/candidate/${candidateId}`);
              myAssessments = assessRes.data || [];
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
            } catch (err) {
              console.error('Failed to load candidate assessments:', err);
            }
          }

          // Fetch rank info
          if (batchId && candidateId) {
            try {
              const rankRes = await api.get(`/report/rank/candidate/${candidateId}/batch/${batchId}`);
              if (rankRes.data && rankRes.data.rank) {
                setRankInfo(`#${rankRes.data.rank}`);
              } else {
                setRankInfo('N/A');
              }
            } catch (err) {
              console.warn('Failed to load candidate rank:', err);
              setRankInfo('N/A');
            }
          }

          // Fetch latest feedback
          if (candidateId) {
            try {
              const feedbackRes = await api.get(`/report/feedback/candidate/${candidateId}`);
              if (Array.isArray(feedbackRes.data) && feedbackRes.data.length > 0) {
                setLatestFeedback(feedbackRes.data[feedbackRes.data.length - 1]);
              } else {
                setLatestFeedback(null);
              }
            } catch (err) {
              console.warn('Failed to load candidate feedback:', err);
            }
          }

          // Fetch comparative assessment data
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
      } catch (err) {
        console.warn('Failed to load trainee dashboard details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTraineeData();
  }, [user]);

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

  const actionBtnStyle = {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '16px 10px', borderRadius: 16, background: 'var(--bg-card)',
    border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.3s ease',
    boxShadow: 'var(--shadow-card)', backdropFilter: 'var(--card-blur)',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 600 }}>Syncing cohort metrics...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">
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
            <div style={{ width: `${overallScore}%`, height: '100%', background: 'linear-gradient(90deg, var(--powder-blue), var(--pale-orange))', borderRadius: 4 }} />
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
        <div className="card card-glow-orange" style={{ padding: 20, background: 'linear-gradient(135deg, var(--bright-black) 0%, rgba(22, 26, 33, 0.9) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--pale-orange)', fontWeight: 600, textTransform: 'uppercase' }}>Current Rank</span>
            <Award size={16} color="var(--yellow)" />
          </div>
          <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--yellow)', marginTop: 8 }}>{rankInfo}</h3>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {rankInfo !== 'N/A' ? 'Position in your cohort' : 'No rank recorded'}
          </span>
        </div>
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
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 11 }} />
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

            <Link to="/chat" style={{ textDecoration: 'none', display: 'flex' }}>
              <button 
                style={{ ...actionBtnStyle, width: '100%', height: '100%' }} 
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--yellow)'; e.currentTarget.style.background = 'var(--yellow-glow)'; e.currentTarget.style.transform = 'translateY(-3px)' }} 
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <Bot size={20} color="var(--yellow)" />
                <span style={{ fontWeight: 700, fontSize: 10, marginTop: 4, textAlign: 'center' }}>AI Assist</span>
              </button>
            </Link>
            
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
          </div>
        </div>
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
