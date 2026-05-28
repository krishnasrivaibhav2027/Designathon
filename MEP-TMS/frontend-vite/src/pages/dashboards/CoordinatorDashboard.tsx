import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Users, BarChart3, Clock, AlertCircle, Award, Settings, 
  MessageSquare, RefreshCw, UserMinus, UserCheck, Calendar, XCircle, Activity 
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useBatches } from '@/context/BatchContext';
import { useNotifications } from '@/context/NotificationContext';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function CoordinatorDashboard() {
  const { batches } = useBatches();
  const { notifications } = useNotifications();
  
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
      try {
        const url = selectedPoolDate 
          ? `/onboarding/analytics?onboarding_date=${selectedPoolDate}`
          : '/onboarding/analytics';
        const response = await api.get(url);
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
    trainerPerformance: [],
    batchComparison: [],
    programComparison: []
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
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Coordinator Analytics Dashboard</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Real-time training program monitoring, pool indicators, and operational metrics.</p>
        </div>

        {/* Dynamic Pool Selection Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, pointerEvents: 'none' }} />
            <select
              value={selectedPoolDate}
              onChange={(e) => setSelectedPoolDate(e.target.value)}
              className="glass-input"
              style={{
                padding: '8px 16px 8px 36px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                appearance: 'none',
                cursor: 'pointer',
                minWidth: 180,
              }}
            >
              <option value="" style={{ background: 'var(--bright-black)', color: '#fff' }}>All Onboarding Pools</option>
              {poolDates.map((d) => (
                <option key={d} value={d} style={{ background: 'var(--bright-black)', color: '#fff' }}>
                  Pool: {new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && !analyticsData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: '50vh', justifyContent: 'center', alignItems: 'center' }}>
          <div className="animate-spin" style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: 'var(--pale-orange)' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Loading real-time pool analytics...</p>
        </div>
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

          {/* Operational Metrics & Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Attendance Percentage per Batch */}
            <div className="card card-glow-blue" style={{ minHeight: 330, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Attendance Percentage per Batch</h3>
              {metrics.attendancePerBatch.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  No batch attendance data is available for this pool.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={metrics.attendancePerBatch}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="batchName" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)' }} />
                    <Bar dataKey="attendance" fill="var(--powder-blue)" radius={[6, 6, 0, 0]} name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
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
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)' }} />
                    <Bar dataKey="clearanceRate" fill="var(--pale-orange)" radius={[6, 6, 0, 0]} name="Clearance Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Trainer Performance, Program Averages & Recent Activities */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: 24 }}>
            {/* Trainer Performance */}
            <div className="card card-glow-yellow" style={{ display: 'flex', flexDirection: 'column', maxHeight: 380 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Trainer Performance</h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }} className="custom-scrollbar">
                {metrics.trainerPerformance.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                    No trainer metrics mapped for this pool.
                  </div>
                ) : (
                  metrics.trainerPerformance.map((t: any) => (
                    <div key={t.trainerName} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t.trainerName}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Score: {t.avgScore}% | Attd: {t.avgAttendance}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* Score progress bar */}
                        <div style={{ height: 6, width: '100%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${t.avgScore}%`, background: 'linear-gradient(90deg, var(--yellow) 0%, var(--pale-orange) 100%)', borderRadius: 3 }} />
                        </div>
                        {/* Attendance progress bar */}
                        <div style={{ height: 4, width: '100%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${t.avgAttendance}%`, background: 'var(--powder-blue)', borderRadius: 2 }} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Program Performance Comparison */}
            <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column', maxHeight: 380 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Program Averages</h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }} className="custom-scrollbar">
                {metrics.programComparison.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                    No program average data available.
                  </div>
                ) : (
                  metrics.programComparison.map((p: any) => (
                    <div key={p.program} style={{ background: 'linear-gradient(135deg, rgba(135,206,235,0.04) 0%, rgba(255,255,255,0.01) 100%)', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{p.program}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Avg Score</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--pale-orange)', marginTop: 2 }}>{p.avgScore}%</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Avg Attendance</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--powder-blue)', marginTop: 2 }}>{p.avgAttendance}%</div>
                        </div>
                      </div>
                    </div>
                  ))
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

          {/* Interactive Batch-wise Comparison Table */}
          <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Batch Performance Comparison Across Programs</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Compare attendance level, score averages, and clearances dynamically based on the selected cohort onboarding timeline.</p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Batch Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Program / Phase</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Average Attendance</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Average Score</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Clearance Rate</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
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
        </>
      )}
    </div>
  );
}

