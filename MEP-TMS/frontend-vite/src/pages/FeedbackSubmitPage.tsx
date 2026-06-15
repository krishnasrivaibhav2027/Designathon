import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Star, Send, CheckCircle, AlertCircle, ShieldAlert, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import MorphLoader from '@/components/MorphLoader';

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

export default function FeedbackSubmitPage() {
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batchId') || '';
  const emailParam = searchParams.get('email') || '';

  // Validation States
  const [validationLoading, setValidationLoading] = useState(true);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMsg, setValidationMsg] = useState('');
  const [batchName, setBatchName] = useState('');
  const [candidateName, setCandidateName] = useState('');

  // Submission States
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form Fields
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

  // Validate Link on Mount
  useEffect(() => {
    if (!batchId || !emailParam) {
      setIsValid(false);
      setValidationMsg('Invalid URL parameters. Please use the link provided in your email.');
      setValidationLoading(false);
      return;
    }

    const validateLink = async () => {
      try {
        const res = await api.get(`/report/feedback/validate?batchId=${batchId}&email=${encodeURIComponent(emailParam)}`);
        setIsValid(res.data.valid);
        setValidationMsg(res.data.message);
        setBatchName(res.data.batchName || '');
        setCandidateName(res.data.candidateName || '');
      } catch (err: any) {
        setIsValid(false);
        setValidationMsg(err?.response?.data?.detail || 'An error occurred during link validation. Please try again later.');
      } finally {
        setValidationLoading(false);
      }
    };

    validateLink();
  }, [batchId, emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trainerRating === 0) {
      toast.error('Please rate the trainer.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/report/feedback/detailed', {
        batchId,
        respondentName: candidateName,
        respondentEmail: emailParam,
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
      toast.success('Feedback submitted successfully. Thank you!');
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

  // Header Component
  const PageHeader = () => (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--pale-orange) 0%, var(--yellow) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#121824'
        }}>
          M1
        </div>
        <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: 0.5 }}>
          Maverick One Training System
        </span>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        Trainee Feedback Form
      </h1>
      {batchName && (
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8 }}>
          Batch: <strong style={{ color: 'var(--pale-orange)' }}>{batchName}</strong>
        </p>
      )}
    </div>
  );

  // Loading Screen
  if (validationLoading) {
    return <MorphLoader fullPage text="Validating your feedback request..." />;
  }

  // Invalid Link or Error Screen
  if (isValid === false) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: 540, margin: '0 auto', width: '100%' }} className="fade-in">
          <div className="card card-glow-orange card-static" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,160,89,0.12)',
              border: '1px solid var(--pale-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <ShieldAlert size={36} color="var(--pale-orange)" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: 12 }}>
              Feedback Form Unavailable
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              {validationMsg}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Validation verified by Maverick One Security</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Submitted Screen (fields vanished)
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: 540, margin: '0 auto', width: '100%' }} className="fade-in">
          <div className="card card-glow-blue card-static" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: 'rgba(112,214,255,0.15)',
              border: '1px solid var(--powder-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle size={36} color="var(--powder-blue)" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: 12 }}>
              Thank You!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
              Your feedback has been successfully submitted and stored.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
              Trainee: <strong style={{ color: 'var(--text-primary)' }}>{candidateName}</strong><br />
              Email: <strong style={{ color: 'var(--text-primary)' }}>{emailParam}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active Feedback Form Screen
  return (
    <div style={{ minHeight: '100vh', padding: '60px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }} className="fade-in">
        <PageHeader />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Candidate Details (Prefilled & Disabled) */}
          <div className="card card-glow-blue card-static" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 4 }}>
              <Check size={16} color="var(--powder-blue)" />
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Verified Candidate Details
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  className="glass-input"
                  style={{ ...inputStyle, opacity: 0.8, cursor: 'not-allowed' }}
                  value={candidateName}
                  disabled
                />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  className="glass-input"
                  style={{ ...inputStyle, opacity: 0.8, cursor: 'not-allowed' }}
                  value={emailParam}
                  disabled
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Batch Number & Trainer Name</label>
              <input
                className="glass-input"
                style={inputStyle}
                value={batchNoTrainer}
                onChange={e => setBatchNoTrainer(e.target.value)}
                placeholder="e.g. Batch 5 — John Doe"
                required
              />
            </div>
          </div>

          {/* Takeaways */}
          <div className="card card-glow-orange card-static" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Course Takeaways
              </h3>
            </div>
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
                  required
                />
              </div>
            ))}
          </div>

          {/* Improvements & Impact */}
          <div className="card card-glow-yellow card-static" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Improvements & Impact
              </h3>
            </div>
            <div>
              <label style={labelStyle}>What could have been done better in this course?</label>
              <textarea
                className="glass-input"
                style={{ ...inputStyle, minHeight: 88 }}
                value={improvements}
                onChange={e => setImprovements(e.target.value)}
                placeholder="Share your suggestions..."
                required
              />
            </div>
            <div>
              <label style={labelStyle}>What is the impact of this course on you?</label>
              <textarea
                className="glass-input"
                style={{ ...inputStyle, minHeight: 88 }}
                value={courseImpact}
                onChange={e => setCourseImpact(e.target.value)}
                placeholder="How has this course changed your skills or perspective?"
                required
              />
            </div>
          </div>

          {/* Trainer Rating */}
          <div className="card card-glow-orange card-static" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Trainer Evaluation
              </h3>
            </div>
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
          <div className="card card-glow-blue card-static" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
    </div>
  );
}
