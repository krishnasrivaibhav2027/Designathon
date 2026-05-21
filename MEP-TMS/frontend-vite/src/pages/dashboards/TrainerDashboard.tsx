import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ClipboardCheck, BarChart3, Bell, Zap, BookOpen, Calendar } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import toast from 'react-hot-toast';
import { useSimulatedTime } from '@/context/TimeContext';
import { useBatches } from '@/context/BatchContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

interface AssessmentDistribution {
  scoreRange: string;
  count: number;
}

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const { simulatedTime } = useSimulatedTime();
  const { batches } = useBatches();
  const { user } = useAuth();
  
  const [autoAlertsEnabled, setAutoAlertsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentsData, setAssessmentsData] = useState<AssessmentDistribution[]>([]);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [gradedCount, setGradedCount] = useState(0);

  // Filter batches assigned to the current logged-in trainer
  const trainerBatches = batches.filter(b => 
    b.trainer?.toLowerCase() === user?.fullName?.toLowerCase()
  );

  // Calculate active trainees
  const activeTraineesCount = trainerBatches.reduce((acc, b) => acc + b.candidatesCount, 0);

  // Fetch assessment analytics for assigned batches
  useEffect(() => {
    if (trainerBatches.length === 0) {
      setAssessmentsData([]);
      setAverageScore(null);
      setGradedCount(0);
      return;
    }

    setIsLoading(true);
    // Fetch assessments for all trainer batches
    const fetchAssessments = async () => {
      try {
        let allAssessments: any[] = [];
        for (const batch of trainerBatches) {
          const response = await api.get(`/assessment/batch/${batch._id}`);
          if (response.data) {
            allAssessments = [...allAssessments, ...response.data];
          }
        }

        if (allAssessments.length > 0) {
          setGradedCount(allAssessments.length);
          const totalPct = allAssessments.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
          setAverageScore(Math.round(totalPct / allAssessments.length));

          // Generate score range distribution (Bell Curve shape)
          const distribution = [
            { scoreRange: '0-20', count: 0 },
            { scoreRange: '21-40', count: 0 },
            { scoreRange: '41-60', count: 0 },
            { scoreRange: '61-80', count: 0 },
            { scoreRange: '81-100', count: 0 },
          ];

          allAssessments.forEach(ass => {
            const pct = ass.percentage || 0;
            if (pct <= 20) distribution[0].count++;
            else if (pct <= 40) distribution[1].count++;
            else if (pct <= 60) distribution[2].count++;
            else if (pct <= 80) distribution[3].count++;
            else distribution[4].count++;
          });

          setAssessmentsData(distribution);
        } else {
          setAssessmentsData([]);
          setAverageScore(null);
          setGradedCount(0);
        }
      } catch (err) {
        console.warn('Failed to load assessment data from backend:', err);
        setAssessmentsData([]);
        setAverageScore(null);
        setGradedCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssessments();
  }, [batches]);

  const stats = [
    { title: 'My Active Trainees', value: activeTraineesCount.toString(), icon: Users, colorClass: 'card-glow-blue', iconColor: 'var(--powder-blue)' },
    { title: 'My Assigned Cohorts', value: trainerBatches.length.toString(), icon: BookOpen, colorClass: 'card-glow-orange', iconColor: 'var(--pale-orange)' },
    { title: 'Graded Assessments', value: gradedCount.toString(), icon: BarChart3, colorClass: 'card-glow-yellow', iconColor: 'var(--yellow)' },
    { title: 'Average Class Score', value: averageScore !== null ? `${averageScore}%` : 'N/A', icon: ClipboardCheck, colorClass: 'card-glow-blue', iconColor: 'var(--powder-blue)' },
  ];

  const handleManualAlert = () => {
    if (trainerBatches.length === 0) {
      toast.error('You must have active assigned batches to send attendance alerts.');
      return;
    }
    toast.success('Manual attendance alert dispatched to all pending trainees in your cohorts!');
  };

  const toggleAutoAlerts = () => {
    setAutoAlertsEnabled(!autoAlertsEnabled);
    toast.success(`Automatic alerts ${!autoAlertsEnabled ? 'enabled' : 'disabled'}.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Trainer Dashboard</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Manage your assigned cohorts and monitor candidate performance metrics.</p>
        </div>
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

      {/* Alert Management Section */}
      <div className="card card-glow-orange" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--pale-orange-glow) 100%)',
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <Bell size={24} color="var(--pale-orange)" />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Attendance Alert Management</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              Ensure trainees submit attendance between 9:00 AM and 10:00 AM. 
              {autoAlertsEnabled ? ' Auto-alerts will fire at 9:45 AM.' : ' Auto-alerts are disabled.'}
              {' '}(Current Simulated Time: <strong style={{ color: 'var(--pale-orange)' }}>{simulatedTime}</strong>)
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Auto Alerts</span>
            <div 
              onClick={toggleAutoAlerts}
              style={{
                width: 44, height: 24, borderRadius: 12, background: autoAlertsEnabled ? 'var(--powder-blue)' : 'var(--text-muted)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: autoAlertsEnabled ? 22 : 2,
                transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
          </div>
          <button 
            onClick={handleManualAlert}
            className="btn-primary"
            style={{ 
              padding: '10px 20px', fontSize: 13,
            }}>
            <Zap size={16} /> Send Alert Now
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        {/* Class Performance Curve */}
        <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Class Assessment Distribution</h3>
          {assessmentsData.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '40px 24px', textAlign: 'center', background: 'var(--bg-main)',
              borderRadius: 12, border: '1px dashed var(--border-color)', minHeight: 260
            }}>
              <BarChart3 size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>No Graded Assessments Available</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, maxWidth: 300 }}>
                Score range and performance curve will visualize dynamically once you upload grades for your cohorts.
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Score Range Percentage Distribution</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={assessmentsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="scoreRange" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)' }} />
                  <Line type="monotone" dataKey="count" stroke="var(--powder-blue)" strokeWidth={4} dot={{ r: 4, fill: 'var(--bright-black)', strokeWidth: 2, stroke: 'var(--powder-blue)' }} name="Trainees" />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Schedule & Action items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card card-glow-blue">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Today's Active Cohorts</h3>
            {trainerBatches.length === 0 ? (
              <div style={{
                padding: '30px 16px', textAlign: 'center', background: 'var(--bg-main)',
                borderRadius: 12, border: '1px dashed var(--border-color)'
              }}>
                <Calendar size={32} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>No Cohorts Assigned</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Contact the Coordinator to assign you to active training batches.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {trainerBatches.map((b, i) => (
                  <div key={b._id} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 12, border: '1px solid var(--border-color)', borderRadius: 12, background: 'var(--bg-main)' }}>
                    <div style={{ padding: '6px 10px', background: 'var(--powder-blue-glow)', borderRadius: 8, color: 'var(--powder-blue)', fontWeight: 700, fontSize: 11, border: '1px solid var(--powder-blue)' }}>
                      {b.status}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{b.batchName}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Topic: {b.topics[0] || 'Core Curriculum'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card card-glow-orange" style={{ flex: 1 }}>
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
