import React, { useState, useEffect } from 'react';
import {
  Send, MessageSquare, Download, RefreshCw, Clock, CheckCircle,
  AlertCircle, Star, ChevronDown, ChevronUp, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useBatches } from '@/context/BatchContext';
import CustomSelect from '@/components/CustomSelect';
import MorphLoader from '@/components/MorphLoader';

interface FeedbackRow {
  id: string;
  respondent_name?: string;
  respondent_email?: string;
  batch_no_and_trainer?: string;
  takeaway1?: string;
  takeaway2?: string;
  takeaway3?: string;
  improvements?: string;
  course_impact?: string;
  trainer_rating: number;
  assignments_helpful?: string;
  demonstrations_helpful?: string;
  trainer_support_adequate?: string;
  technical_discussions_helpful?: string;
  other_comments?: string;
  submitted_at: string;
}

interface WindowStatus {
  windowOpen: boolean;
  windowOpensOn?: string;
  windowClosesOn?: string;
  daysUntilClose?: number;
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const { batches } = useBatches();

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [onboardingDates, setOnboardingDates] = useState<string[]>([]);
  const [selectedPoolDate, setSelectedPoolDate] = useState('');
  const [windowStatus, setWindowStatus] = useState<WindowStatus | null>(null);
  const [responses, setResponses] = useState<FeedbackRow[]>([]);
  const [loadingWindow, setLoadingWindow] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filter to batches the coordinator owns (or all for admin)
  const eligibleBatches = batches.filter(b =>
    b.status !== 'CLOSED' || responses.length > 0
  );

  useEffect(() => {
    const fetchPoolDates = async () => {
      try {
        const res = await api.get('/onboarding/dates');
        setOnboardingDates(res.data || []);
      } catch {
        setOnboardingDates([]);
      }
    };
    fetchPoolDates();
  }, []);

  useEffect(() => {
    if (!selectedBatchId) {
      setWindowStatus(null);
      setResponses([]);
      return;
    }
    fetchWindowStatus();
    fetchResponses();
  }, [selectedBatchId, selectedPoolDate]);

  const fetchWindowStatus = async () => {
    setLoadingWindow(true);
    try {
      const res = await api.get(`/report/feedback/window/${selectedBatchId}`);
      setWindowStatus(res.data);
    } catch {
      setWindowStatus(null);
    } finally {
      setLoadingWindow(false);
    }
  };

  const fetchResponses = async () => {
    setLoadingResponses(true);
    try {
      const url = selectedPoolDate
        ? `/report/feedback/detailed/${selectedBatchId}?pool_date=${selectedPoolDate}`
        : `/report/feedback/detailed/${selectedBatchId}`;
      const res = await api.get(url);
      setResponses(res.data || []);
    } catch {
      setResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleTriggerEmails = async () => {
    if (!selectedBatchId) { toast.error('Select a batch first.'); return; }
    setTriggering(true);
    try {
      const res = await api.post(`/report/feedback/request/${selectedBatchId}`);
      const { sent, total_candidates } = res.data;
      toast.success(`Feedback emails sent to ${sent} of ${total_candidates} trainees.`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to send feedback emails.';
      toast.error(msg);
    } finally {
      setTriggering(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!selectedBatchId) return;
    setDownloading(true);
    try {
      const url = selectedPoolDate
        ? `/report/feedback/detailed/${selectedBatchId}/export?pool_date=${selectedPoolDate}`
        : `/report/feedback/detailed/${selectedBatchId}/export`;
      const res = await api.get(url, {
        responseType: 'blob'
      });
      const batch = batches.find(b => b._id === selectedBatchId || b.batchId === selectedBatchId);
      const name = batch?.batchName?.replace(/\s+/g, '_') || selectedBatchId;
      const poolSuffix = selectedPoolDate ? `_Pool_${selectedPoolDate}` : '';
      const downloadUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Feedback_${name}${poolSuffix}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Excel downloaded successfully.');
    } catch {
      toast.error('Failed to download feedback export.');
    } finally {
      setDownloading(false);
    }
  };

  const avgRating = responses.length
    ? (responses.reduce((s, r) => s + (r.trainer_rating || 0), 0) / responses.length).toFixed(1)
    : '—';

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return iso; }
  };

  const WindowBadge = () => {
    if (loadingWindow) return <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Checking window...</span>;
    if (!windowStatus) return null;
    if (windowStatus.windowOpen) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(80,200,120,0.15)', border: '1px solid #50c878',
          color: '#50c878', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700
        }}>
          <CheckCircle size={12} /> Window Open · Closes {windowStatus.windowClosesOn ? formatDate(windowStatus.windowClosesOn) : ''}
        </span>
      );
    }
    const opensOn = windowStatus.windowOpensOn ? new Date(windowStatus.windowOpensOn) : null;
    const now = new Date();
    if (opensOn && now < opensOn) {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(112,214,255,0.12)', border: '1px solid var(--powder-blue)',
          color: 'var(--powder-blue)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700
        }}>
          <Clock size={12} /> Opens {formatDate(windowStatus.windowOpensOn!)}
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,80,80,0.12)', border: '1px solid #ff5050',
        color: '#ff5050', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700
      }}>
        <AlertCircle size={12} /> Window Closed
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Feedback Management
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Trigger feedback collection emails, monitor responses, and export results batch-wise.
          The feedback window opens 3 days before the batch end date and closes on the end date.
        </p>
      </div>

      {/* Batch Selector + Actions Row */}
      <div className="card card-glow-orange card-static" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <MessageSquare size={20} color="var(--pale-orange)" />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Select Batch</h3>
          <WindowBadge />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          <CustomSelect
            value={selectedBatchId}
            onChange={setSelectedBatchId}
            placeholder="— Choose a batch —"
            options={[
              { value: '', label: '— Choose a batch —' },
              ...eligibleBatches.map(b => ({
                value: b._id || b.batchId,
                label: `${b.batchName} (${b.status})`
              }))
            ]}
            style={{ flex: 1, minWidth: 260 }}
          />

          <CustomSelect
            value={selectedPoolDate}
            onChange={setSelectedPoolDate}
            placeholder="— All Pools (Optional) —"
            options={[
              { value: '', label: '— All Pools (Optional) —' },
              ...onboardingDates.map(d => ({
                value: d,
                label: `Pool: ${d}`
              }))
            ]}
            style={{ flex: 1, minWidth: 220 }}
          />

          <button
            onClick={handleTriggerEmails}
            disabled={!selectedBatchId || triggering}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, fontSize: 14 }}
          >
            {triggering ? <MorphLoader inline /> : <Send size={16} />}
            {triggering ? 'Sending...' : 'Send Feedback Emails'}
          </button>

          <button
            onClick={fetchResponses}
            disabled={!selectedBatchId || loadingResponses}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', borderRadius: 12,
              background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14
            }}
          >
            <RefreshCw size={15} className={loadingResponses ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={!selectedBatchId || responses.length === 0 || downloading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', borderRadius: 12,
              background: responses.length > 0 ? 'rgba(80,200,120,0.15)' : 'transparent',
              border: `1px solid ${responses.length > 0 ? '#50c878' : 'var(--border-color)'}`,
              color: responses.length > 0 ? '#50c878' : 'var(--text-muted)',
              cursor: responses.length > 0 ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600
            }}
          >
            {downloading ? <MorphLoader inline /> : <Download size={15} />}
            Export Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {selectedBatchId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div className="card card-glow-blue" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Responses</span>
              <Users size={16} color="var(--powder-blue)" />
            </div>
            <h3 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>
              {loadingResponses ? '—' : responses.length}
            </h3>
          </div>

          <div className="card card-glow-yellow" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Trainer Rating</span>
              <Star size={16} color="var(--yellow)" fill="var(--yellow)" />
            </div>
            <h3 style={{ fontSize: 32, fontWeight: 800, color: 'var(--yellow)', marginTop: 8 }}>
              {loadingResponses ? '—' : avgRating} <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>/ 5</span>
            </h3>
          </div>

          <div className="card card-glow-orange" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Window Status</span>
              <Clock size={16} color="var(--pale-orange)" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>
              {loadingWindow ? '—' : windowStatus?.windowOpen ? 'Open' : 'Closed'}
            </h3>
            {windowStatus?.daysUntilClose !== undefined && windowStatus.windowOpen && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {windowStatus.daysUntilClose} day{windowStatus.daysUntilClose !== 1 ? 's' : ''} remaining
              </span>
            )}
          </div>
        </div>
      )}

      {/* Responses Table */}
      {selectedBatchId && (
        <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={18} color="var(--powder-blue)" />
            Feedback Responses
          </h3>

          {loadingResponses ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <MorphLoader text="Loading feedback responses..." />
            </div>
          ) : responses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
              No feedback responses received yet for this batch.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['#', 'Submitted', 'Name', 'Email', 'Batch / Trainer', 'Trainer Rating', 'Details'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((row, idx) => (
                    <React.Fragment key={row.id}>
                      <tr
                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-color)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                      >
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{formatDate(row.submitted_at)}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.respondent_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{row.respondent_email || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{row.batch_no_and_trainer || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} size={13}
                                fill={s <= row.trainer_rating ? 'var(--yellow)' : 'none'}
                                stroke={s <= row.trainer_rating ? 'var(--yellow)' : 'var(--text-muted)'}
                              />
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            {expandedRow === row.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {expandedRow === row.id ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </tr>

                      {expandedRow === row.id && (
                        <tr>
                          <td colSpan={7} style={{ padding: '0 14px 16px 14px', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 12 }}>
                              {[
                                ['Top Takeaway 1', row.takeaway1],
                                ['Top Takeaway 2', row.takeaway2],
                                ['Top Takeaway 3', row.takeaway3],
                                ['What could be better?', row.improvements],
                                ['Course Impact', row.course_impact],
                                ['Assignments Helpful?', row.assignments_helpful],
                                ['Demonstrations Helpful?', row.demonstrations_helpful],
                                ['Trainer Support Adequate?', row.trainer_support_adequate],
                                ['Technical Discussions Helpful?', row.technical_discussions_helpful],
                                ['Other Comments', row.other_comments],
                              ].map(([label, val]) => val ? (
                                <div key={label as string} style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 4 }}>{label}</p>
                                  <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{val}</p>
                                </div>
                              ) : null)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
