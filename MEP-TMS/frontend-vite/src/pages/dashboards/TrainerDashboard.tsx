import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, ClipboardCheck, BarChart3, BookOpen, Calendar, Bot, 
  AlertTriangle, ArrowUpRight, TrendingUp, Clock, Award, Sparkles, AlertCircle, CheckCircle
} from 'lucide-react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import { useBatches } from '@/context/BatchContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

interface AssessmentDistribution {
  scoreRange: string;
  count: number;
}

interface Candidate {
  id: string;
  email: string;
  fullName: string;
  batchId: string;
  registrationNumber?: string;
  isActive?: boolean;
}

interface Topper {
  _id: string;
  email: string;
  fullName: string;
  registrationNumber: string;
  overallScore: number;
  assessmentScore: number;
  attendancePercentage: number;
  avgTimeTaken?: number;
}

interface AttendanceRecord {
  id: string;
  batchId: string;
  candidateId: string;
  date: string;
  status: string;
}

interface AssessmentTrendData {
  assessmentName: string;
  avgScore: number;
  avgTimeTakenMinutes: number;
  passedCount: number;
  failedCount: number;
}

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { batches } = useBatches();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentsData, setAssessmentsData] = useState<AssessmentDistribution[]>([]);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [gradedCount, setGradedCount] = useState(0);

  // Rich analytics states
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [toppers, setToppers] = useState<Topper[]>([]);
  const [assessmentTrends, setAssessmentTrends] = useState<AssessmentTrendData[]>([]);
  const [allAssessments, setAllAssessments] = useState<any[]>([]);
  const [insightsTab, setInsightsTab] = useState<'toppers' | 'struggling'>('toppers');

  // Filter batches assigned to the current logged-in trainer
  const trainerBatches = batches.filter(b => 
    b.trainer?.toLowerCase() === user?.fullName?.toLowerCase()
  );

  const runningBatches = trainerBatches.filter(b => b.status === 'RUNNING');

  // Calculate active trainees
  const activeTraineesCount = runningBatches.reduce((acc, b) => acc + b.candidatesCount, 0);

  // Fetch assessment, candidate and attendance analytics for assigned running batches
  useEffect(() => {
    if (runningBatches.length === 0) {
      setAssessmentsData([]);
      setAverageScore(null);
      setGradedCount(0);
      setCandidates([]);
      setAttendanceRecords([]);
      setToppers([]);
      setAssessmentTrends([]);
      setAllAssessments([]);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        let loadedAssessments: any[] = [];
        let loadedCandidates: Candidate[] = [];
        let loadedAttendance: AttendanceRecord[] = [];
        let loadedToppers: Topper[] = [];

        await Promise.all(runningBatches.map(async (batch) => {
          // 1. Fetch assessments
          try {
            const response = await api.get(`/assessment/batch/${batch._id}`);
            if (response.data) {
              loadedAssessments = [...loadedAssessments, ...response.data];
            }
          } catch (err) {
            console.warn(`Failed to fetch assessments for batch ${batch._id}:`, err);
          }

          // 2. Fetch candidates
          try {
            const response = await api.get(`/batch/${batch._id}/candidates`);
            if (response.data) {
              loadedCandidates = [...loadedCandidates, ...response.data];
            }
          } catch (err) {
            console.warn(`Failed to fetch candidates for batch ${batch._id}:`, err);
          }

          // 3. Fetch attendance
          try {
            const response = await api.get(`/attendance/batch/${batch._id}`);
            if (response.data) {
              loadedAttendance = [...loadedAttendance, ...response.data];
            }
          } catch (err) {
            console.warn(`Failed to fetch attendance for batch ${batch._id}:`, err);
          }

          // 4. Fetch toppers
          try {
            const response = await api.get(`/report/toppers/${batch._id}`);
            if (response.data && response.data.toppers) {
              loadedToppers = [...loadedToppers, ...response.data.toppers];
            }
          } catch (err) {
            console.warn(`Failed to fetch toppers for batch ${batch._id}:`, err);
          }
        }));

        setAllAssessments(loadedAssessments);
        setCandidates(loadedCandidates);
        setAttendanceRecords(loadedAttendance);

        // De-duplicate and sort toppers
        const uniqueToppers = Array.from(new Map(loadedToppers.map(t => [t._id, t])).values());
        uniqueToppers.sort((a, b) => {
          if (b.overallScore !== a.overallScore) {
            return b.overallScore - a.overallScore;
          }
          return (a.avgTimeTaken ?? 999999) - (b.avgTimeTaken ?? 999999);
        });
        setToppers(uniqueToppers);

        if (loadedAssessments.length > 0) {
          setGradedCount(loadedAssessments.length);
          const totalPct = loadedAssessments.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
          setAverageScore(Math.round(totalPct / loadedAssessments.length));

          // Calculate score range distribution
          const distribution = [
            { scoreRange: '0-20', count: 0 },
            { scoreRange: '21-40', count: 0 },
            { scoreRange: '41-60', count: 0 },
            { scoreRange: '61-80', count: 0 },
            { scoreRange: '81-100', count: 0 },
          ];

          loadedAssessments.forEach(ass => {
            const pct = ass.percentage || 0;
            if (pct <= 20) distribution[0].count++;
            else if (pct <= 40) distribution[1].count++;
            else if (pct <= 60) distribution[2].count++;
            else if (pct <= 80) distribution[3].count++;
            else distribution[4].count++;
          });
          setAssessmentsData(distribution);

          // Group by assessment name for performance & speed trends
          const groups: { [name: string]: { totalPct: number; count: number; totalTime: number; timeCount: number; passed: number } } = {};
          loadedAssessments.forEach(ass => {
            const name = ass.assessmentName || 'Assessment';
            if (!groups[name]) {
              groups[name] = { totalPct: 0, count: 0, totalTime: 0, timeCount: 0, passed: 0 };
            }
            groups[name].totalPct += (ass.percentage || 0);
            groups[name].count += 1;
            if (ass.percentage >= 40) {
              groups[name].passed += 1;
            }
            if (ass.timeTaken !== undefined && ass.timeTaken !== null) {
              groups[name].totalTime += ass.timeTaken;
              groups[name].timeCount += 1;
            }
          });

          const trendList: AssessmentTrendData[] = Object.keys(groups).map(name => {
            const g = groups[name];
            return {
              assessmentName: name,
              avgScore: Math.round(g.totalPct / g.count),
              avgTimeTakenMinutes: g.timeCount > 0 ? Math.round((g.totalTime / g.timeCount) / 60 * 10) / 10 : 0,
              passedCount: g.passed,
              failedCount: g.count - g.passed
            };
          });

          setAssessmentTrends(trendList);
        } else {
          setGradedCount(0);
          setAverageScore(null);
          setAssessmentsData([]);
          setAssessmentTrends([]);
        }
      } catch (err) {
        console.warn('Failed to load dashboard analytics from backend:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [batches]);

  // Calculate attendance warning list (attendance rate < 75%)
  const attendanceWarnings = candidates.map(c => {
    const studentRecords = attendanceRecords.filter(r => r.candidateId === c.id);
    const total = studentRecords.length;
    const present = studentRecords.filter(r => {
      const s = r.status.toUpperCase();
      return s === 'PRESENT' || s === 'LATE';
    }).length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;
    const batch = runningBatches.find(b => b._id === c.batchId);
    
    return {
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      batchName: batch ? batch.batchName : 'Unknown Batch',
      rate,
      totalDays: total,
      absentDays: total - present
    };
  }).filter(c => c.totalDays > 0 && c.rate < 75)
    .sort((a, b) => a.rate - b.rate);

  // Calculate focus group of struggling candidates (average score < 50% or has any failed assessment)
  const strugglingTrainees = candidates.map(c => {
    const studentAssessments = allAssessments.filter(ass => ass.candidateId === c.id);
    const total = studentAssessments.length;
    const avgScore = total > 0 ? Math.round(studentAssessments.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / total) : 100;
    const fails = studentAssessments.filter(ass => (ass.percentage || 0) < 40 || ass.result === 'FAIL').length;
    const batch = runningBatches.find(b => b._id === c.batchId);

    return {
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      batchName: batch ? batch.batchName : 'Unknown Batch',
      avgScore,
      totalAssessments: total,
      fails
    };
  }).filter(c => c.totalAssessments > 0 && (c.avgScore < 50 || c.fails > 0))
    .sort((a, b) => a.avgScore - b.avgScore);

  const stats = [
    { title: 'My Active Trainees', value: activeTraineesCount.toString(), icon: Users, colorClass: 'card-glow-blue', iconColor: 'var(--powder-blue)' },
    { title: 'My Assigned Cohorts', value: trainerBatches.length.toString(), icon: BookOpen, colorClass: 'card-glow-orange', iconColor: 'var(--pale-orange)' },
    { title: 'Graded Assessments', value: gradedCount.toString(), icon: BarChart3, colorClass: 'card-glow-yellow', iconColor: 'var(--yellow)' },
    { title: 'Average Class Score', value: averageScore !== null ? `${averageScore}%` : 'N/A', icon: ClipboardCheck, colorClass: 'card-glow-blue', iconColor: 'var(--powder-blue)' },
  ];

  // Helper to format average time taken
  const formatTime = (secs?: number) => {
    if (secs === undefined || secs === null || secs >= 999999) return 'N/A';
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getSalutation = () => {
    if (user?.isFirstLogin && user?.role !== 'ADMIN') return 'Welcome';
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Good morning';
    if (hr >= 12 && hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Trainer Dashboard</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Manage your assigned cohorts and monitor candidate performance metrics.</p>
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

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {stats.map((s) => (
          <div key={s.title} className={`card ${s.colorClass}`} style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'var(--border-color)',
            }}>
              <s.icon size={20} color={s.iconColor} />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{s.title}</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        {/* Performance & Speed trends Composed Chart */}
        <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Performance & Completion Speed Trends</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Assessment average scores compared against average minutes taken</p>
            </div>
            <TrendingUp size={18} color="var(--powder-blue)" />
          </div>
          {assessmentTrends.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '40px 24px', textAlign: 'center', background: 'var(--bg-main)',
              borderRadius: 12, border: '1px dashed var(--border-color)', minHeight: 260
            }}>
              <BarChart3 size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>No Graded Assessments Available</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, maxWidth: 300 }}>
                Score trends and completion times will visualize dynamically once you upload grades for your active cohorts.
              </p>
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={assessmentTrends} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="assessmentName" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)', fontSize: 11.5 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar yAxisId="right" dataKey="avgTimeTakenMinutes" fill="var(--pale-orange)" name="Avg Time (mins)" radius={[4, 4, 0, 0]} maxBarSize={35} />
                  <Line yAxisId="left" type="monotone" dataKey="avgScore" stroke="var(--powder-blue)" strokeWidth={3.5} dot={{ r: 4, fill: 'var(--bright-black)', strokeWidth: 2, stroke: 'var(--powder-blue)' }} name="Avg Score (%)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Today's Active Cohorts */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card card-glow-blue" style={{ height: '100%' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Today's Active Cohorts</h3>
            {runningBatches.length === 0 ? (
              <div style={{
                padding: '30px 16px', textAlign: 'center', background: 'var(--bg-main)',
                borderRadius: 12, border: '1px dashed var(--border-color)'
              }}>
                <Calendar size={32} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No Cohorts Active</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  No assigned training cohorts are currently running.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {runningBatches.map((b) => (
                  <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid var(--border-color)', borderRadius: 12, background: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ padding: '6px 10px', background: 'var(--powder-blue-glow)', borderRadius: 8, color: 'var(--powder-blue)', fontWeight: 700, fontSize: 11, border: '1px solid var(--powder-blue)' }}>
                        {b.status}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{b.batchName}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          Topic: {b.topics[0] ? (b.topics[0].includes(':') ? b.topics[0].split(':')[0].trim() : b.topics[0]) : 'Core Curriculum'}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {b.agent ? (
                        <span 
                          onClick={() => navigate('/my-agents')}
                          className="badge-glow-green" 
                          style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Bot size={13} /> Appointed
                        </span>
                      ) : (
                        <button
                          onClick={() => navigate('/my-agents', { state: { createBatchId: b._id } })}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: 11, borderRadius: 8 }}
                        >
                          <Bot size={13} /> Create my Agent
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Insights Grid & Attendance Warnings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        
        {/* Trainee Performance Insights Grid */}
        <div className="card card-glow-yellow" style={{ display: 'flex', flexDirection: 'column', minHeight: 380 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Trainee Performance Insights</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Identify toppers and candidates who need academic support</p>
            </div>
            
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-main)', padding: 4, borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setInsightsTab('toppers')}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: insightsTab === 'toppers' ? 'var(--yellow-glow)' : 'transparent',
                  color: insightsTab === 'toppers' ? 'var(--yellow)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Award size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} /> Toppers
              </button>
              <button
                onClick={() => setInsightsTab('struggling')}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: insightsTab === 'struggling' ? 'var(--pale-orange-glow)' : 'transparent',
                  color: insightsTab === 'struggling' ? 'var(--pale-orange)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                <AlertCircle size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} /> Focus Group
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowX: 'auto' }}>
            {insightsTab === 'toppers' ? (
              toppers.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 240, gap: 10 }}>
                  <Award size={36} color="var(--text-muted)" />
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>No Top Performers Calculated</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 300 }}>Topper lists resolve automatically once Phase assessments are graded and report cards are generated.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', width: 60 }}>Rank</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Batch</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Score</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Attendance</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Avg Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toppers.slice(0, 5).map((t, idx) => (
                      <tr key={t._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s ease' }} className="hover-row">
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                          {idx === 0 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'rgba(212, 172, 13, 0.2)', color: 'var(--yellow)', fontSize: 11 }}>🥇</span>
                          ) : idx === 1 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'rgba(128, 128, 128, 0.2)', color: '#a0a0a0', fontSize: 11 }}>🥈</span>
                          ) : idx === 2 ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'rgba(186, 110, 64, 0.2)', color: '#cd7f32', fontSize: 11 }}>🥉</span>
                          ) : (
                            `#${idx + 1}`
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.fullName}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{t.registrationNumber}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--powder-blue)', fontWeight: 700, textAlign: 'right' }}>{Math.round(t.overallScore)}%</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-primary)', textAlign: 'right' }}>{Math.round(t.attendancePercentage)}%</td>
                        <td style={{ padding: '12px 14px', color: 'var(--pale-orange)', textAlign: 'right', fontWeight: 500 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} /> {formatTime(t.avgTimeTaken)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              strugglingTrainees.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 240, gap: 10 }}>
                  <CheckCircle size={36} color="var(--powder-blue)" />
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>No Struggling Trainees Found</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 300 }}>Excellent! All candidates in your active batches have passed assessments and average scores above 50%.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Batch</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Average Score</th>
                      <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Fails / Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strugglingTrainees.slice(0, 5).map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s ease' }} className="hover-row">
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.fullName}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{t.batchName}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--pale-orange)', fontWeight: 700, textAlign: 'right' }}>{t.avgScore}%</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-primary)', textAlign: 'right' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 12, background: 'rgba(255, 123, 123, 0.15)', color: '#ff7b7b', fontSize: 11, fontWeight: 600 }}>
                            {t.fails} / {t.totalAssessments} failed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Attendance Warnings */}
          <div className="card card-glow-orange" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Attendance Warnings</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Trainees with attendance rate under 75%</p>
              </div>
              <AlertTriangle size={18} color="var(--pale-orange)" />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {attendanceWarnings.length === 0 ? (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '30px 16px', textAlign: 'center', background: 'var(--bg-main)',
                  borderRadius: 12, border: '1px dashed var(--border-color)'
                }}>
                  <CheckCircle size={28} color="var(--powder-blue)" style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No Attendance Warnings</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    All trainees are meeting the 75% cohort attendance requirement.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                  {attendanceWarnings.map((w) => (
                    <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 10, background: 'var(--bg-main)' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{w.fullName}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{w.batchName}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#ff7b7b' }}>{w.rate}%</span>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{w.absentDays} of {w.totalDays} days absent</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card card-glow-orange">
             <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Quick Actions</h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
               <button 
                 onClick={() => navigate('/attendance')}
                 className="btn-secondary"
                 style={{ fontSize: 13, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
               >
                 Mark Attendance
               </button>
               <button 
                 onClick={() => navigate('/assessments')}
                 className="btn-secondary"
                 style={{ fontSize: 13, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
               >
                 Add Assessment
               </button>
               <button 
                 onClick={() => navigate('/batches')}
                 className="btn-secondary"
                 style={{ fontSize: 13, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
               >
                 View My Batches
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
