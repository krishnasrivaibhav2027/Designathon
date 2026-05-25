import React, { useState, useEffect } from 'react';
import { BarChart3, ClipboardCheck, Award, AlertCircle, Sparkles, Star, TrendingUp, ThumbsUp, ThumbsDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

export default function AnalyticsPage() {
  const { user } = useAuth();
  
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Real Analytics States
  const [attendanceStats, setAttendanceStats] = useState<{ present: number; absent: number; rate: number } | null>(null);
  const [academicStats, setAcademicStats] = useState<{ avgScore: number; passed: number; total: number } | null>(null);
  const [strengths, setStrengths] = useState<any[]>([]);
  const [weaknesses, setWeaknesses] = useState<any[]>([]);
  const [comparedAssessments, setComparedAssessments] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const candRes = await api.get('/users/me/candidate');
        if (candRes.data) {
          const cand = candRes.data;
          setCandidate(cand);
          
          const candidateId = cand.id;
          const batchId = cand.batchId;

          // Fetch attendance details
          if (candidateId) {
            try {
              const attendRes = await api.get(`/attendance/candidate/${candidateId}`);
              const attendRecords = attendRes.data || [];
              const totalDays = attendRecords.length;
              if (totalDays > 0) {
                const present = attendRecords.filter((r: any) => r.status === 'Present' || r.status === 'Late').length;
                const absent = totalDays - present;
                const rate = Math.round((present / totalDays) * 100);
                setAttendanceStats({ present, absent, rate });
              } else {
                setAttendanceStats({ present: 0, absent: 0, rate: 0 });
              }
            } catch (err) {
              console.error('Failed to load candidate attendance analytics:', err);
              setAttendanceStats({ present: 0, absent: 0, rate: 0 });
            }
          }

          // Fetch assessments
          if (candidateId && batchId) {
            try {
              const [myAssessRes, batchAssessRes] = await Promise.all([
                api.get(`/assessment/candidate/${candidateId}`),
                api.get(`/assessment/batch/${batchId}`)
              ]);
              
              const myData = myAssessRes.data || [];
              const batchData = batchAssessRes.data || [];

              // Calculate academic totals
              if (myData.length > 0) {
                const sum = myData.reduce((acc: number, item: any) => acc + (item.percentage ?? 0), 0);
                const avgScore = Math.round(sum / myData.length);
                const passed = myData.filter((a: any) => (a.percentage >= 40) || a.result === 'PASS').length;
                setAcademicStats({ avgScore, passed, total: myData.length });
              } else {
                setAcademicStats({ avgScore: 0, passed: 0, total: 0 });
              }

              // Extract strengths and focus areas
              const sortedByScore = [...myData].sort((a: any, b: any) => b.percentage - a.percentage);
              const topStrengths = sortedByScore.filter((a: any) => a.percentage >= 70).slice(0, 2);
              const topWeaknesses = sortedByScore.filter((a: any) => a.percentage < 70).reverse().slice(0, 2);

              setStrengths(topStrengths);
              setWeaknesses(topWeaknesses);

              // Construct comparative scores
              const compared = myData.map((myAss: any) => {
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
              console.error('Failed to load candidate assessment analytics:', err);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to compile trainee analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 600 }}>Analyzing cohort metrics...</p>
      </div>
    );
  }

  // Attendance pie chart data
  const attendancePieData = attendanceStats ? [
    { name: 'Present/Late', value: attendanceStats.present, color: '#70d6ff' }, // powder blue
    { name: 'Absent', value: attendanceStats.absent, color: '#ff7b7b' } // red
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BarChart3 size={28} color="var(--pale-orange)" />
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
          Trainee Analytics
        </h2>
      </div>

      {/* Row 1: KPI Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 16 }}>
        {/* Attendance Rate Gauge */}
        <div className="card card-glow-blue" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 240 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardCheck size={16} color="var(--powder-blue)" /> Attendance Summary
          </h3>
          {attendanceStats && attendanceStats.present + attendanceStats.absent > 0 ? (
            <div style={{ position: 'relative', width: '100%', height: 160, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    cx="50%"
                    cy="55%"
                    innerRadius={45}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {attendancePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '56%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {attendanceStats.rate}%
                </span>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Present</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8 }}>
              <AlertCircle size={24} color="var(--text-muted)" />
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'center' }}>
                No attendance logs found.
              </p>
            </div>
          )}
        </div>

        {/* Academic Performance Card */}
        <div className="card card-glow-orange" style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 240 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={16} color="var(--pale-orange)" /> Academic Status
          </h3>
          
          {academicStats && academicStats.total > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyItems: 'center', gap: 20, flex: 1, marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Average Score</span>
                  <h4 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{academicStats.avgScore}%</h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Evaluations</span>
                  <h4 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{academicStats.total} total</h4>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-primary)' }}>
                  <span>Pass Rate</span>
                  <strong style={{ color: 'var(--powder-blue)' }}>{academicStats.passed} of {academicStats.total} Passed</strong>
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--border-color)', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${(academicStats.passed / academicStats.total) * 100}%`, 
                      height: '100%', 
                      background: 'var(--powder-blue)', 
                      borderRadius: 3 
                    }} 
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8 }}>
              <AlertCircle size={24} color="var(--text-muted)" />
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'center' }}>
                No academic grades to compile yet.
              </p>
            </div>
          )}
        </div>

        {/* Strengths & Weaknesses Card */}
        <div className="card card-glow-yellow" style={{ padding: 20, display: 'flex', flexDirection: 'column', minHeight: 240 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="var(--yellow)" /> Insights & Recommendations
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14, flex: 1, justifyContent: 'center' }}>
            {strengths.length > 0 || weaknesses.length > 0 ? (
              <>
                {/* Strengths */}
                {strengths.length > 0 && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--powder-blue)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ThumbsUp size={12} /> Key Strengths
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                      {strengths.map((a: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-primary)' }}>
                          <span style={{ maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.assessmentName}</span>
                          <strong style={{ color: 'var(--powder-blue)' }}>{Math.round(a.percentage)}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Focus Areas */}
                {weaknesses.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pale-orange)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ThumbsDown size={12} /> Focus Areas
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                      {weaknesses.map((a: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-primary)' }}>
                          <span style={{ maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.assessmentName}</span>
                          <strong style={{ color: 'var(--pale-orange)' }}>{Math.round(a.percentage)}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', gap: 8 }}>
                <AlertCircle size={22} color="var(--text-muted)" />
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Awaiting assessment data to draw strengths and recommendations.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Score Comparatives Chart */}
      <div className="card card-glow-orange" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
          Assessment Score Comparison (You vs. Cohort Average)
        </h3>
        
        {comparedAssessments.length > 0 ? (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparedAssessments} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 11.5 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="My Score" fill="var(--pale-orange)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                <Bar dataKey="Cohort Average" fill="var(--powder-blue)" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 8 }}>
            <AlertCircle size={28} color="var(--text-muted)" />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
              No assessment performance comparison data available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
