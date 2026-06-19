import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Users, BarChart3, Clock, AlertCircle, Award, Settings, 
  MessageSquare, RefreshCw, UserMinus, UserCheck, Calendar, XCircle, Activity 
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useBatches } from '@/context/BatchContext';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/CustomSelect';
import MorphLoader from '@/components/MorphLoader';

export default function CoordinatorDashboard() {
  const { batches } = useBatches();
  const { notifications } = useNotifications();
  const { user } = useAuth();

  const getSalutation = () => {
    if (user?.isFirstLogin && user?.role !== 'ADMIN') return 'Welcome';
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Good morning';
    if (hr >= 12 && hr < 17) return 'Good afternoon';
    return 'Good evening';
  };
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'SETTING_CHANGE':
        return { icon: Settings, color: 'var(--powder-blue)' };
      case 'BATCH_CREATED':
      case 'BATCH_CREATION':
        return { icon: BookOpen, color: 'var(--yellow)' };
      case 'BATCH_STATUS_CHANGED':
        return { icon: RefreshCw, color: 'var(--pale-orange)' };
      case 'MESSAGE_LOG':
        return { icon: MessageSquare, color: 'var(--powder-blue)' };
      case 'BATCH_ENDING':
        return { icon: Award, color: 'var(--yellow)' };
      case 'ATTENDANCE_UPLOAD':
        return { icon: Users, color: 'var(--powder-blue)' };
      case 'ASSESSMENT_UPLOAD':
        return { icon: Award, color: 'var(--yellow)' };
      default:
        return { icon: AlertCircle, color: 'var(--pale-orange)' };
    }
  };

  const [poolDates, setPoolDates] = useState<string[]>([]);
  const [selectedPoolDate, setSelectedPoolDate] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [requestingFeedback, setRequestingFeedback] = useState<string | null>(null);

  // Fetch available pool onboarding dates on mount
  useEffect(() => {
    const fetchPoolDates = async () => {
      try {
        const response = await api.get('/onboarding/dates');
        if (Array.isArray(response.data)) {
          setPoolDates(response.data);
        }
      } catch (err) {
        console.error('Failed to load pool dates:', err);
      }
    };
    fetchPoolDates();
  }, []);

  // Fetch pool analytics whenever selected pool date changes
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setAnalyticsData(null); // Clear previous analytics so the loader is shown
      try {
        const url = selectedPoolDate 
          ? `/onboarding/analytics?onboarding_date=${selectedPoolDate}`
          : '/onboarding/analytics';
        // Add a small synthetic delay to make the fetch animation feel smooth and premium
        const [response] = await Promise.all([
          api.get(url),
          new Promise((resolve) => setTimeout(resolve, 600))
        ]);
        if (response.data) {
          setAnalyticsData(response.data);
        }
      } catch (err) {
        console.error('Failed to load pool analytics:', err);
        toast.error('Failed to load real-time analytics data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedPoolDate]);

  const getEndingBatches = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    return batches.filter(batch => {
      if (batch.status === 'COMPLETED' || batch.status === 'CLOSED') return false;
      const end = new Date(batch.endDate);
      end.setHours(0,0,0,0);
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // Feedback window: opens 3 days before end date, closes on end date
      return diffDays >= 0 && diffDays <= 3;
    });
  };

  const handleRequestFeedback = async (batchId: string, batchName: string) => {
    try {
      setRequestingFeedback(batchId);
      const response = await api.post(`/report/feedback/request/${batchId}`);
      if (response.data) {
        toast.success(`Feedback request emails sent to trainees for batch "${batchName}"!`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send feedback requests.");
    } finally {
      setRequestingFeedback(null);
    }
  };

  const indicators = analyticsData?.indicators || {
    totalCandidates: 0,
    discontinuedCandidates: 0,
    notClearedCandidates: 0,
    offeredOnboardedCandidates: 0,
    remainingInTraining: 0
  };

  const metrics = analyticsData?.operationalMetrics || {
    attendancePerBatch: [],
    clearanceRatePerBatch: [],
    skillDistribution: [],
    batchComparison: [],
    statusBreakdown: [],
    milestones: []
  };

  const stats = [
    { title: 'Total Candidates', value: indicators.totalCandidates.toString(), icon: Users, colorClass: 'card-glow-blue', iconColor: 'var(--powder-blue)' },
    { title: 'Remaining in Training', value: indicators.remainingInTraining.toString(), icon: Activity, colorClass: 'card-glow-yellow', iconColor: 'var(--yellow)' },
    { title: 'Offered / Onboarded', value: indicators.offeredOnboardedCandidates.toString(), icon: UserCheck, colorClass: 'card-glow-blue', iconColor: 'var(--powder-blue)' },
    { title: 'Not-Cleared Candidates', value: indicators.notClearedCandidates.toString(), icon: XCircle, colorClass: 'card-glow-orange', iconColor: 'var(--pale-orange)' },
    { title: 'Discontinued Candidates', value: indicators.discontinuedCandidates.toString(), icon: UserMinus, colorClass: 'card-glow-orange', iconColor: 'var(--pale-orange)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Coordinator Analytics Dashboard</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Real-time training program monitoring, pool indicators, and operational metrics.</p>
        </div>

        {/* Dynamic Pool Selection Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            marginRight: 40,
          }}>
            {getSalutation()}, {user?.fullName?.split(' ')[0] || 'User'}
          </span>

          <CustomSelect
            value={selectedPoolDate}
            onChange={setSelectedPoolDate}
            icon={Calendar}
            options={[
              { value: '', label: 'All Onboarding Pools' },
              ...poolDates.map((d) => ({
                value: d,
                label: `Pool: ${new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`
              }))
            ]}
            style={{ minWidth: 200 }}
          />
        </div>
      </div>

      {isLoading && !analyticsData ? (
        <MorphLoader minHeight="50vh" text="Loading real-time pool analytics..." />
      ) : (
        <>
          {/* High-Level Indicators Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {stats.map((s) => (
              <div key={s.title} className={`card ${s.colorClass}`} style={{ padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.04)',
                }}>
                  <s.icon size={18} color={s.iconColor} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{s.title}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Batch-wise Comparison Table */}
          <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Batch Performance Comparison Across Programs</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Compare attendance level, score averages, and clearances dynamically based on the selected cohort onboarding timeline.</p>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '235px', overflowY: 'auto' }} className="custom-scrollbar">
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr style={{ paddingBottom: 10 }}>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1, borderBottom: '1px solid var(--border-color)', padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Batch Name</th>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1, borderBottom: '1px solid var(--border-color)', padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Program / Phase</th>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1, borderBottom: '1px solid var(--border-color)', padding: '12px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Average Attendance</th>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1, borderBottom: '1px solid var(--border-color)', padding: '12px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Average Score</th>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1, borderBottom: '1px solid var(--border-color)', padding: '12px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Clearance Rate</th>
                    <th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1, borderBottom: '1px solid var(--border-color)', padding: '12px 16px', textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.batchComparison.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                        No batch comparison metrics available for this pool.
                      </td>
                    </tr>
                  ) : (
                    metrics.batchComparison.map((b: any) => {
                      let clearanceBadge = "badge-glow-yellow";
                      if (b.clearanceRate >= 80) clearanceBadge = "badge-glow-green";
                      else if (b.clearanceRate < 50) clearanceBadge = "badge-glow-red";

                      return (
                        <tr key={b.batchId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '16px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>
                            {b.batchName}
                          </td>
                          <td style={{ padding: '16px', fontSize: 13 }}>
                            <span className="badge-glow-blue" style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                              {b.program}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--powder-blue)' }}>
                              {b.avgAttendance}%
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <span className="badge-glow-orange" style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              {b.avgScore}%
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <span className={clearanceBadge} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              {b.clearanceRate}%
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleRequestFeedback(b.batchId, b.batchName)}
                              disabled={requestingFeedback === b.batchId}
                              className="btn-primary"
                              style={{
                                padding: '6px 14px', fontSize: 11, borderRadius: 10, display: 'inline-flex'
                              }}
                            >
                              {requestingFeedback === b.batchId ? 'Sending...' : 'Request Feedback'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operational Metrics & Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Trainee Onboarding Status Donut Chart */}
            <div className="card card-glow-blue" style={{ minHeight: 330, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Trainee Onboarding Status</h3>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {(!metrics.statusBreakdown || metrics.statusBreakdown.every((d: any) => d.value === 0)) ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                    No status metrics available.
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 16 }}>
                    <div style={{ flex: 1, height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={metrics.statusBreakdown.filter((d: any) => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {metrics.statusBreakdown.filter((d: any) => d.value > 0).map((entry: any, index: number) => {
                              let color = 'var(--powder-blue)'; // In Progress default
                              if (entry.name === 'Cleared') color = '#10B981';
                              if (entry.name === 'Failed') color = 'var(--pale-orange)';
                              if (entry.name === 'Discontinued') color = '#6B7280';
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              background: 'var(--bg-card)', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: 12, 
                              boxShadow: 'var(--shadow-card)', 
                              color: 'var(--text-primary)' 
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Indicators list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0, minWidth: 140 }}>
                      {metrics.statusBreakdown.map((item: any) => {
                        const percentage = indicators.totalCandidates > 0 
                          ? Math.round((item.value / indicators.totalCandidates) * 100) 
                          : 0;
                        
                        let dotColor = 'var(--powder-blue)';
                        if (item.name === 'Cleared') dotColor = '#10B981';
                        if (item.name === 'Failed') dotColor = 'var(--pale-orange)';
                        if (item.name === 'Discontinued') dotColor = '#6B7280';

                        return (
                          <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</span>
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', paddingLeft: 16 }}>
                              {item.value} ({percentage}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assessment Clearance Rate */}
            <div className="card card-glow-orange" style={{ minHeight: 330, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Assessment Clearance Rate per Batch</h3>
              {metrics.clearanceRatePerBatch.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  No clearance data is available for this pool.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={metrics.clearanceRatePerBatch}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="batchName" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)' }} />
                    <Bar dataKey="clearanceRate" fill="var(--pale-orange)" radius={[6, 6, 0, 0]} name="Clearance Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Trainer Performance, Program Averages & Recent Activities */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: 24 }}>
            {/* Trainee Skill Set Profile */}
            <div className="card card-glow-yellow" style={{ display: 'flex', flexDirection: 'column', maxHeight: 380 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Trainee Skill Set Profile</h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }} className="custom-scrollbar">
                {(!metrics.skillDistribution || metrics.skillDistribution.length === 0) ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                    No skill profile data available.
                  </div>
                ) : (
                  metrics.skillDistribution.map((item: any) => {
                    const percentage = indicators.totalCandidates > 0 
                      ? Math.round((item.count / indicators.totalCandidates) * 100) 
                      : 0;
                    
                    // Curated, brand-aligned language colors
                    // Curated, brand-aligned solid language colors
                    let progressColor = 'var(--pale-orange)';
                    const skillLower = item.skill.toLowerCase();
                    if (skillLower.includes('java') && !skillLower.includes('script')) {
                      progressColor = '#E76F51'; // Java Orange
                    } else if (skillLower.includes('python')) {
                      progressColor = '#3776AB'; // Python Blue
                    } else if (skillLower.includes('c#') || skillLower.includes('c sharp')) {
                      progressColor = '#178600'; // C# Green
                    } else if (skillLower.includes('c++')) {
                      progressColor = '#00599C'; // C++ Dark Blue
                    } else if (skillLower.includes('javascript') || skillLower.includes('js')) {
                      progressColor = '#F7DF1E'; // JS Yellow
                    } else if (skillLower.includes('unspecified') || skillLower.includes('none')) {
                      progressColor = '#6B7280'; // Grey
                    }

                    return (
                      <div key={item.skill} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.skill}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {item.count} ({percentage}%)
                          </span>
                        </div>
                        <div style={{ height: 6, width: '100%', background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${percentage}%`, background: progressColor, borderRadius: 3, transition: 'width 0.5s ease-out' }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cohort Onboarding Milestones */}
            <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column', maxHeight: 380 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Onboarding Milestones</h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 8 }} className="custom-scrollbar">
                {(!metrics.milestones || metrics.milestones.length === 0) ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                    No milestones mapping available.
                  </div>
                ) : (
                  metrics.milestones.map((m: any, idx: number) => {
                    const isCompleted = m.status === 'COMPLETED';
                    const isActive = m.status === 'ACTIVE';
                    const isLast = idx === metrics.milestones.length - 1;

                    // Node styles
                    let nodeColor = 'rgba(255, 255, 255, 0.05)';
                    let nodeBorder = '1px solid var(--border-color)';
                    let textColor = 'var(--text-secondary)';
                    let glowClass = '';

                    if (isCompleted) {
                      nodeColor = '#10B981'; // Green
                      nodeBorder = 'none';
                      textColor = 'rgba(255, 255, 255, 0.45)';
                    } else if (isActive) {
                      nodeColor = 'var(--yellow)';
                      nodeBorder = 'none';
                      textColor = 'var(--text-primary)';
                      glowClass = 'pulse-glow';
                    }

                    return (
                      <div key={m.id} style={{ display: 'flex', gap: 16, position: 'relative', paddingBottom: isLast ? 0 : 20 }}>
                        {/* Connecting Line */}
                        {!isLast && (
                          <div style={{ 
                            position: 'absolute', 
                            left: 11, 
                            top: 24, 
                            bottom: 0, 
                            width: 2, 
                            background: isCompleted ? '#10B981' : 'var(--border-color)', 
                            zIndex: 1 
                          }} />
                        )}

                        {/* Node */}
                        <div 
                          className={glowClass}
                          style={{ 
                            width: 24, 
                            height: 24, 
                            borderRadius: '50%', 
                            background: nodeColor, 
                            border: nodeBorder,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            zIndex: 2,
                            flexShrink: 0
                          }}
                        >
                          {isCompleted && <UserCheck size={12} color="#ffffff" />}
                          {isActive && <Activity size={12} color="var(--bg-main)" />}
                        </div>

                        {/* Text Content */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{m.title}</span>
                            {isActive && (
                              <span style={{ 
                                fontSize: 9, 
                                fontWeight: 700, 
                                color: 'var(--yellow)', 
                                background: 'rgba(234, 179, 8, 0.1)', 
                                padding: '2px 6px', 
                                borderRadius: 8,
                                border: '1px solid rgba(234, 179, 8, 0.2)'
                              }}>
                                Active
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: isCompleted ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                            {m.description}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent Activities */}
            <div className="card card-glow-orange" style={{ display: 'flex', flexDirection: 'column', maxHeight: 380 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Recent Activities</h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }} className="custom-scrollbar">
                {/* Show Ending Batches Feedback Requests first */}
                {getEndingBatches().map(batch => (
                  <div key={batch._id} style={{ 
                    background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(255, 215, 0, 0.08) 100%)', 
                    padding: 12, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 8,
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Award size={16} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>Feedback Collection</p>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          Batch "{batch.batchName}" is concluding soon.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRequestFeedback(batch._id, batch.batchName)}
                      disabled={requestingFeedback === batch._id}
                      className="btn-primary"
                      style={{
                        padding: '6px 12px', fontSize: 11, borderRadius: 8, width: '100%', justifyContent: 'center'
                      }}
                    >
                      {requestingFeedback === batch._id ? 'Sending...' : 'Request Feedback'}
                    </button>
                  </div>
                ))}

                {notifications.length === 0 && getEndingBatches().length === 0 ? (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                    No recent activities logged.
                  </div>
                ) : (
                  notifications.map((n) => {
                    const iconInfo = getActivityIcon(n.type);
                    return (
                      <div key={n.id} style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--pale-orange-glow) 100%)', padding: 10, borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start', border: '1px solid var(--border-color)' }}>
                        <iconInfo.icon size={16} color={iconInfo.color} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{n.type.replace('_', ' ')}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>{n.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>


        </>
      )}
    </div>
  );
}

