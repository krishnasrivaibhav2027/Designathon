import React, { useState, useEffect } from 'react';
import { Award, Bell, ClipboardCheck, AlertCircle, BookOpen, Star, TrendingUp, PlayCircle, Bot, FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import api from '@/services/api';

export default function TraineeDashboard() {
  const { user } = useAuth();
  const { notifications } = useNotifications();

  const [candidate, setCandidate] = useState<any>(null);
  const [batchDetails, setBatchDetails] = useState<any>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [rankInfo, setRankInfo] = useState<string>('N/A');
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
            } catch {
              setBatchDetails({ batchName: 'React Native Cohort', batchId: 'BATCH-RN-2024', trainer: 'Alice Smith' });
            }
          }

          try {
            const assessRes = await api.get(`/assessment/candidate/${candidateId}`);
            if (Array.isArray(assessRes.data) && assessRes.data.length > 0) {
              const sum = assessRes.data.reduce((acc: number, item: any) => acc + (item.score || 0), 0);
              const avg = Math.round(sum / assessRes.data.length);
              setOverallScore(avg);
            } else {
              setOverallScore(88);
            }
          } catch {
            setOverallScore(89);
          }

          if (batchId && candidateId) {
            try {
              const rankRes = await api.get(`/report/rank/candidate/${candidateId}/batch/${batchId}`);
              if (rankRes.data && rankRes.data.rank) {
                setRankInfo(`#${rankRes.data.rank}`);
              } else {
                setRankInfo('Top 10%');
              }
            } catch {
              setRankInfo('Top 10%');
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load trainee dashboard details:', err);
        setOverallScore(85);
        setRankInfo('Top 10%');
      } finally {
        setLoading(false);
      }
    };

    fetchTraineeData();
  }, [user]);

  // Topic Mastery (Pie Chart) using custom variables
  const masteryData = [
    { name: 'Proficient', value: 45, color: '#70d6ff' }, // powder blue
    { name: 'Intermediate', value: 35, color: '#ffa059' }, // pale orange
    { name: 'Beginner', value: 20, color: '#ffd000' }, // yellow
  ];

  // Learning Progress (Line Chart)
  const learningProgressData = [
    { day: 'Day 1', score: 65 },
    { day: 'Day 3', score: 72 },
    { day: 'Day 5', score: 68 },
    { day: 'Day 7', score: 85 },
    { day: 'Day 10', score: 82 },
    { day: 'Day 12', score: 91 },
    { day: 'Day 14', score: 89 },
  ];

  // Peer Distribution (Bar Chart)
  const peerDistribution = [
    { topic: 'HTML/CSS', count: 5 },
    { topic: 'JavaScript', count: 12 },
    { topic: 'React Basics', count: 18 },
    { topic: 'State Management', count: 8 },
    { topic: 'Backend APIs', count: 2 },
  ];

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
        <div className="card card-glow-orange" style={{ padding: 20, cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Active Batch</span>
            <BookOpen size={16} color="var(--pale-orange)" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 12 }}>{batchDetails?.batchName || 'React Native Cohort'}</h3>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, gap: 4, color: 'var(--pale-orange)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>View Details</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* Progress */}
        <div className="card card-glow-blue" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Training Progress</span>
            <TrendingUp size={16} color="var(--powder-blue)" />
          </div>
          <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{overallScore || 0}%</h3>
          <div style={{ width: '100%', height: 6, background: 'var(--border-color)', borderRadius: 4, marginTop: 12, overflow: 'hidden' }}>
            <div style={{ width: `${overallScore || 0}%`, height: '100%', background: 'linear-gradient(90deg, var(--powder-blue), var(--pale-orange))', borderRadius: 4 }} />
          </div>
        </div>

        {/* Days Countdown */}
        <div className="card card-glow-yellow" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Days Remaining</span>
            <Bell size={16} color="var(--yellow)" />
          </div>
          <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>Day 14</h3>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>of 60 total days</span>
        </div>

        {/* Leaderboard Rank */}
        <div className="card card-glow-orange" style={{ padding: 20, background: 'linear-gradient(135deg, var(--bright-black) 0%, rgba(22, 26, 33, 0.9) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--pale-orange)', fontWeight: 600, textTransform: 'uppercase' }}>Current Rank</span>
            <Award size={16} color="var(--yellow)" />
          </div>
          <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--yellow)', marginTop: 8 }}>{rankInfo}</h3>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Top 10% of class</span>
        </div>
      </div>

      {/* MIDDLE ROW: Charts & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 0.8fr', gap: 16 }}>
        {/* Pie Chart: Topic Mastery */}
        <div className="card card-glow-blue" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', alignSelf: 'flex-start' }}>Skill Mastery Breakdown</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={masteryData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                {masteryData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)' }} />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Peer Distribution Chart (Bubble Chart) */}
        <div className="card card-glow-yellow" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Cohort Progress Distribution</h3>
          <ResponsiveContainer width="100%" height={170}>
            <ScatterChart margin={{ top: 20, right: 10, bottom: 10, left: 10 }}>
              <XAxis dataKey="topic" type="category" tick={{ fontSize: 10, fill: 'var(--text-primary)', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey="y" hide domain={[-1, 1]} />
              <ZAxis type="number" dataKey="count" range={[200, 1000]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3', stroke: 'var(--border-color)' }} 
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: 'var(--shadow-card)', padding: '8px 12px', color: 'var(--text-primary)' }} 
                labelFormatter={() => ''}
                formatter={(value: any, name: any) => {
                  if (name === 'count') return [`${value} Trainees`, ''];
                  return ['', ''];
                }}
              />
              <Scatter data={peerDistribution.map(d => ({ ...d, y: 0 }))} fill="var(--yellow)" animationDuration={800}>
                {peerDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.topic === 'React Basics' ? 'var(--pale-orange)' : 'var(--powder-blue-glow)'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
            You are currently on <strong>React Basics</strong> with 17 others.
          </p>
        </div>

        {/* QUICK ACTIONS PANEL (Small Box) */}
        <div className="card card-glow-orange" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
            <button 
              style={actionBtnStyle} 
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--pale-orange)'; e.currentTarget.style.background = 'var(--pale-orange-glow)'; e.currentTarget.style.transform = 'translateY(-3px)' }} 
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <PlayCircle size={20} color="var(--pale-orange)" />
              <span style={{ fontWeight: 700, fontSize: 10, marginTop: 4, textAlign: 'center' }}>Resume</span>
            </button>
            
            <button 
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
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={learningProgressData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)' }} />
            <Line type="monotone" dataKey="score" stroke="var(--pale-orange)" strokeWidth={3} dot={{ r: 3, fill: 'var(--bright-black)', strokeWidth: 1.5, stroke: 'var(--pale-orange)' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
