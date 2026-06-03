import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Star, Send, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import MorphLoader from '@/components/MorphLoader';
import { useAuth } from '@/context/AuthContext';

const RADIO_OPTIONS = ['Yes', 'No', 'Partially'];

function RadioGroup({ label, name, value, onChange }: {
  label: string; name: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</label>
      <div style={{ display: 'flex', gap: 12 }}>
        {RADIO_OPTIONS.map(opt => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              style={{ accentColor: 'var(--pale-orange)' }}
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={28}
          fill={(hovered || value) >= s ? 'var(--yellow)' : 'none'}
          stroke={(hovered || value) >= s ? 'var(--yellow)' : 'var(--text-muted)'}
          style={{ cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
        />
      ))}
      {value > 0 && (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center', marginLeft: 4 }}>
          {['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][value]}
        </span>
      )}
    </div>
  );
}

export default function FeedbackFormPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const batchId = searchParams.get('batchId') || '';

  const [batchName, setBatchName] = useState('');
  const [windowOpen, setWindowOpen] = useState<boolean | null>(null);
  const [windowMsg, setWindowMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [batchNoTrainer, setBatchNoTrainer] = useState('');
  const [takeaway1, setTakeaway1] = useState('');
  const [takeaway2, setTakeaway2] = useState('');
  const [takeaway3, setTakeaway3] = useState('');
  const [improvements, setImprovements] = useState('');
  const [courseImpact, setCourseImpact] = useState('');
  const [trainerRating, setTrainerRating] = useState(0);
  const [assignmentsHelpful, setAssignmentsHelpful] = useState('');
  const [demonstrationsHelpful, setDemonstrationsHelpful] = useState('');
  const [trainerSupportAdequate, setTrainerSupportAdequate] = useState('');
  const [technicalDiscussionsHelpful, setTechnicalDiscussionsHelpful] = useState('');
  const [otherComments, setOtherComments] = useState('');

  useEffect(() => {
    if (!batchId) { setLoading(false); return; }
    const checkWindow = async () => {
      try {
        const res = await api.get(`/report/feedback/window/${batchId}`);
        setBatchName(res.data.batchName || '');
        setWindowOpen(res.data.windowOpen);
        if (!res.data.windowOpen) {
          const opensOn = res.data.windowOpensOn ? new Date(res.data.windowOpensOn) : null;
          const now = new Date();
          if (opensOn && now < opensOn) {
            setWindowMsg(`Feedback window opens on ${opensOn.toLocaleDateString('en-IN', { dateStyle: 'medium' })}.`);
          } else {
            setWindowMsg('The feedback window for this batch has closed. Thank you!');
          }
        }
      } catch {
        setWindowOpen(false);
        setWindowMsg('Unable to verify feedback window. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    checkWindow();
  }, [batchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trainerRating === 0) { toast.error('Please rate the trainer.'); return; }

    setSubmitting(true);
    try {
      await api.post('/report/feedback/detailed', {
        batchId,
        candidateId: null,
        respondentName: name,
        respondentEmail: email,
        batchNoAndTrainer: batchNoTrainer,
        takeaway1,
        takeaway2,
        takeaway3,
        improvements,
        courseImpact,
        trainerRating,
        assignmentsHelpful,
        demonstrationsHelpful,
        trainerSupportAdequate,
        technicalDiscussionsHelpful,
        otherComments,
      });
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to submit feedback. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14,
    color: 'var(--text-primary)', background: 'var(--bg-main)',
    border: '1px solid var(--border-color)', outline: 'none', resize: 'vertical' as const,
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'block'
  };

  if (loading) {
    return <MorphLoader minHeight="60vh" text="Loading feedback form..." />;
  }

  if (!batchId) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Invalid Link</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>No batch ID found in the link. Please use the link from your email.</p>
      </div>
    );
  }

  if (windowOpen === false) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Feedback Unavailable</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{windowMsg}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }} className="fade-in">
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: 'rgba(80,200,120,0.15)',
          border: '1px solid #50c878', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <CheckCircle size={36} color="#50c878" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
          Thank You!
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 15, lineHeight: 1.6 }}>
          Your feedback for <strong style={{ color: 'var(--text-primary)' }}>{batchName}</strong> has been submitted successfully.
          Your responses help us improve the training programme.
        </p>
        {user && (
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
            style={{ marginTop: 24, padding: '12px 28px', borderRadius: 12 }}
          >
            Back to Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Header */}
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
          Training Feedback Form
        </h1>
        {batchName && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>
            Batch: <strong style={{ color: 'var(--pale-orange)' }}>{batchName}</strong>
          </p>
        )}
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          All responses are anonymous. Please be honest — your feedback directly shapes future training.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Identity */}
        <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Your Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input className="glass-input" style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label style={labelStyle}>Email ID</label>
              <input className="glass-input" style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Batch No. and Trainer Name</label>
            <input className="glass-input" style={inputStyle} value={batchNoTrainer} onChange={e => setBatchNoTrainer(e.target.value)} placeholder="e.g. XXYY — John Doe" />
          </div>
        </div>

        {/* Takeaways */}
        <div className="card card-glow-orange" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Course Takeaways</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: -8 }}>What are your Top 3 takeaways from this course?</p>
          {[
            ['Takeaway 1', takeaway1, setTakeaway1],
            ['Takeaway 2', takeaway2, setTakeaway2],
            ['Takeaway 3', takeaway3, setTakeaway3],
          ].map(([label, val, setter]) => (
            <div key={label as string}>
              <label style={labelStyle}>{label as string}</label>
              <textarea
                className="glass-input"
                style={{ ...inputStyle, minHeight: 72 }}
                value={val as string}
                onChange={e => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                placeholder={`Enter ${(label as string).toLowerCase()}...`}
              />
            </div>
          ))}
        </div>

        {/* Improvements & Impact */}
        <div className="card card-glow-yellow" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>What could have been done better in this course?</label>
            <textarea className="glass-input" style={{ ...inputStyle, minHeight: 88 }} value={improvements} onChange={e => setImprovements(e.target.value)} placeholder="Share your suggestions..." />
          </div>
          <div>
            <label style={labelStyle}>What is the impact of this course on you?</label>
            <textarea className="glass-input" style={{ ...inputStyle, minHeight: 88 }} value={courseImpact} onChange={e => setCourseImpact(e.target.value)} placeholder="How has this course changed your skills or perspective?" />
          </div>
        </div>

        {/* Trainer Rating */}
        <div className="card card-glow-orange" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Trainer Evaluation</h3>
          <div>
            <label style={labelStyle}>
              Please rate the trainer's delivery and ability to handle the course and audience
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (5 = highest, 1 = lowest)</span>
            </label>
            <StarRating value={trainerRating} onChange={setTrainerRating} />
          </div>

          <RadioGroup
            label="Did the assignments provided help you practice the concepts and understand the skill better?"
            name="assignments"
            value={assignmentsHelpful}
            onChange={setAssignmentsHelpful}
          />
          <RadioGroup
            label="Did the demonstrations and examples of the concepts provided during the session help you understand them?"
            name="demonstrations"
            value={demonstrationsHelpful}
            onChange={setDemonstrationsHelpful}
          />
          <RadioGroup
            label="Was the support you received from the trainer regarding your lab, course, case study, or related support appropriate and provided on time?"
            name="trainerSupport"
            value={trainerSupportAdequate}
            onChange={setTrainerSupportAdequate}
          />
          <RadioGroup
            label="Do technical discussions happening on a daily basis help you understand the skill better?"
            name="technicalDiscussions"
            value={technicalDiscussionsHelpful}
            onChange={setTechnicalDiscussionsHelpful}
          />
        </div>

        {/* Other Comments */}
        <div className="card card-glow-blue" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={labelStyle}>Any other comments</label>
          <textarea
            className="glass-input"
            style={{ ...inputStyle, minHeight: 88 }}
            value={otherComments}
            onChange={e => setOtherComments(e.target.value)}
            placeholder="Anything else you'd like to share..."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || trainerRating === 0}
          className="btn-primary"
          style={{
            padding: '14px 28px', borderRadius: 14, fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: trainerRating === 0 ? 0.6 : 1
          }}
        >
          {submitting ? <MorphLoader inline /> : <Send size={18} />}
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}
