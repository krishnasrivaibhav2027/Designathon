import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Users, Calendar, Award, Zap, Sliders, CheckSquare, 
  Square, RefreshCw, AlertTriangle, Edit2, Check, X, ShieldAlert 
} from 'lucide-react';
import { useBatches } from '@/context/BatchContext';
import toast from 'react-hot-toast';
import api from '@/services/api';
import CustomSelect from '@/components/CustomSelect';
import MorphLoader from '@/components/MorphLoader';
import CustomDatePicker from '@/components/CustomDatePicker';

interface Trainee {
  id: string;
  email: string;
  fullName: string;
  college?: string;
  phone?: string;
  onboardingDate: string;
  status: 'UNASSIGNED' | 'SPARK_1' | 'SPARK_2' | 'FOUNDATION' | 'STREAM' | 'ELIMINATED' | 'COMPLETED';
  currentBatchId?: string;
  foundationLanguage?: string;
  streamTraining?: string;
  eliminatedPhase?: string;
  registrationNumber?: string;
}

export default function OnboardingPage() {
  const { batches, fetchBatches } = useBatches();
  
  // File upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isUploading, setIsUploading] = useState(false);

  // Pool management state
  const [poolDates, setPoolDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [loadingTrainees, setLoadingTrainees] = useState(false);

  // Selection state
  const [selectedTraineeIds, setSelectedTraineeIds] = useState<string[]>([]);
  const [targetBatchId, setTargetBatchId] = useState<string>('');
  const [isMapping, setIsMapping] = useState(false);

  // Inline edit state
  const [editingTraineeId, setEditingTraineeId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<Trainee>>({});

  // Warning state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // Split states
  const [minBatchSizeLimit, setMinBatchSizeLimit] = useState(30);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitInfo, setSplitInfo] = useState<any>(null);
  const [gapDays, setGapDays] = useState(7);

  // Fetch onboarding dates inside pool
  const fetchPoolDates = async () => {
    try {
      const response = await api.get('/onboarding/dates');
      if (response.data) {
        setPoolDates(response.data);
        if (response.data.length > 0 && !selectedDate) {
          setSelectedDate(response.data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load onboarding dates:", err);
    }
  };

  // Fetch trainees inside the pool
  const fetchTrainees = async () => {
    if (!selectedDate) return;
    try {
      setLoadingTrainees(true);
      const response = await api.get('/onboarding/pool', {
        params: {
          onboarding_date: selectedDate,
          status: filterStatus || undefined
        }
      });
      if (response.data) {
        setTrainees(response.data);
        setSelectedTraineeIds([]);
      }
    } catch (err) {
      console.error("Failed to load pool trainees:", err);
      toast.error("Failed to fetch pool trainees.");
    } finally {
      setLoadingTrainees(false);
    }
  };

  useEffect(() => {
    fetchPoolDates();
    fetchBatches();
    
    api.get('/batch/min-size-limit')
      .then(res => setMinBatchSizeLimit(res.data.minBatchSizeLimit || 30))
      .catch(err => console.warn('Failed to load min size limit', err));
  }, []);

  useEffect(() => {
    fetchTrainees();
  }, [selectedDate, filterStatus]);

  // Handle excel/csv upload submission
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error("Please choose a file to upload.");
      return;
    }
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("onboarding_date", uploadDate);
      
      const res = await api.post('/onboarding/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`Successfully uploaded roster! Inserted: ${res.data.inserted}, Skipped: ${res.data.skipped}`);
      setCsvFile(null);
      await fetchPoolDates();
      setSelectedDate(uploadDate);
      await fetchTrainees();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Upload failed.";
      toast.error(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle selection
  const handleSelectTrainee = (id: string) => {
    setSelectedTraineeIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTraineeIds.length === trainees.length) {
      setSelectedTraineeIds([]);
    } else {
      setSelectedTraineeIds(trainees.map(t => t.id));
    }
  };

  // Map trainees to selected batch
  const handleAssignToBatch = async () => {
    if (selectedTraineeIds.length === 0) {
      toast.error("Please select at least one trainee to map.");
      return;
    }
    if (!targetBatchId) {
      toast.error("Please choose a scheduled batch to assign them to.");
      return;
    }

    if (selectedTraineeIds.length < minBatchSizeLimit) {
      toast.error(`A minimum of ${minBatchSizeLimit} trainees must be selected to assign them to a batch.`);
      return;
    }

    // Direct mapping call to handle overflow and splits dynamically
    proceedAssignment(false, 7);
  };

  const proceedAssignment = async (autoSplit = false, currentGapDays = 7) => {
    setShowWarningModal(false);
    try {
      setIsMapping(true);
      const res = await api.post('/onboarding/assign', {
        traineeIds: selectedTraineeIds,
        batchId: targetBatchId,
        autoSplit,
        gapDays: currentGapDays
      });
      
      if (res.data.overflow) {
        setSplitInfo({
          availableSlots: res.data.availableSlots,
          remainingCount: res.data.remainingCount,
          suggestedSplits: res.data.suggestedSplits,
          message: res.data.message
        });
        setShowSplitModal(true);
      } else {
        toast.success(res.data.message || "Trainees mapped successfully!");
        setSelectedTraineeIds([]);
        setTargetBatchId('');
        setShowSplitModal(false);
        await fetchTrainees();
        await fetchBatches();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Mapping failed.";
      toast.error(errMsg);
    } finally {
      setIsMapping(false);
    }
  };

  // Inline edit functions
  const startEditing = (t: Trainee) => {
    setEditingTraineeId(t.id);
    setEditFields({
      fullName: t.fullName,
      email: t.email,
      college: t.college,
      phone: t.phone,
      status: t.status,
      foundationLanguage: t.foundationLanguage,
      streamTraining: t.streamTraining,
      registrationNumber: t.registrationNumber
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await api.put(`/onboarding/pool/${id}`, editFields);
      toast.success("Trainee details updated successfully!");
      setEditingTraineeId(null);
      fetchTrainees();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || "Failed to update.";
      toast.error(errMsg);
    }
  };

  const getStatusColor = (status: Trainee['status']) => {
    switch (status) {
      case 'UNASSIGNED': return { bg: 'rgba(100, 116, 139, 0.1)', border: '#64748b', text: '#cbd5e1' };
      case 'SPARK_1': return { bg: 'rgba(249, 165, 27, 0.1)', border: '#f9a51b', text: '#fac95a' };
      case 'SPARK_2': return { bg: 'rgba(234, 179, 8, 0.1)', border: '#eab308', text: '#fef08a' };
      case 'FOUNDATION': return { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#93c5fd' };
      case 'STREAM': return { bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7', text: '#d8b4fe' };
      case 'ELIMINATED': return { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#fca5a5' };
      case 'COMPLETED': return { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#86efac' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Outfit, sans-serif' }} className="fade-in">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Date-Basis Onboarding Pool</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>Onboard trainees in date pools and map them sequentially to batches</p>
        </div>
      </div>

      {/* Grid: Upload & Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        
        {/* Upload Form Card */}
        <div className="card card-glow-blue card-static" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
            <Upload size={18} color="var(--powder-blue)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Onboard Trainee Roster</h3>
          </div>
          
          <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Onboarding Date</label>
              <CustomDatePicker
                value={uploadDate}
                onChange={setUploadDate}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Roster File (CSV / XLSX)</label>
              <div style={{
                border: '2px dashed var(--border-color)', borderRadius: 12, padding: '24px 16px', textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.01)', position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
                borderColor: csvFile ? 'var(--powder-blue)' : 'var(--border-color)'
              }}
              onMouseEnter={(e) => { if (!csvFile) e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
              onMouseLeave={(e) => { if (!csvFile) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                <input 
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  onChange={(e) => e.target.files && setCsvFile(e.target.files[0])}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} 
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Upload size={24} color={csvFile ? "var(--powder-blue)" : "var(--text-secondary)"} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: csvFile ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {csvFile ? csvFile.name : 'Drag & drop or click to choose file'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.8 }}>
                    File must contain "Full Name", "Email", "Skill Set" & "Superset ID" columns
                  </span>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isUploading}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 13.5,
                background: isUploading ? 'var(--border-color)' : 'linear-gradient(135deg, #1e40af, #70d6ff)',
                color: '#ffffff', cursor: isUploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                boxShadow: isUploading ? 'none' : '0 4px 14px rgba(112, 214, 255, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              {isUploading ? (
                <>
                  <MorphLoader inline />
                  <span>Onboarding...</span>
                </>
              ) : (
                <span>Onboard Trainees</span>
              )}
            </button>
          </form>
        </div>

        {/* Filters & Actions Card */}
        <div className="card card-glow-yellow card-static" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
            <Sliders size={18} color="var(--yellow)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Pool Allocation & Query</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Select Onboarding Pool</label>
              <CustomSelect
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="-- Select Pool Date --"
                options={poolDates.map(d => ({
                  value: d,
                  label: d
                }))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Filter Status</label>
              <CustomSelect
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="All statuses"
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'UNASSIGNED', label: 'Unassigned' },
                  { value: 'SPARK_1', label: 'Spark Phase 1' },
                  { value: 'SPARK_2', label: 'Spark Phase 2' },
                  { value: 'FOUNDATION', label: 'Foundational' },
                  { value: 'STREAM', label: 'Stream based' },
                  { value: 'ELIMINATED', label: 'Eliminated' },
                  { value: 'COMPLETED', label: 'Completed' }
                ]}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>Map Selected to Scheduled Batch</label>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <CustomSelect
                value={targetBatchId}
                onChange={setTargetBatchId}
                placeholder="-- Choose Scheduled Cohort --"
                options={[
                  { value: '', label: '-- Choose Scheduled Cohort --' },
                  ...batches.map(b => {
                    const catLabel = b.category === 'SPARK' ? `Spark ${b.phase === 'PHASE_2' ? 'Phase 2' : 'Phase 1'}` : b.category === 'FOUNDATIONAL' ? 'Foundational' : 'Stream';
                    return {
                      value: b._id,
                      label: `${b.batchName} (${catLabel} - Limit: ${b.sizeLimit || 'Unlimited'}, Enrolled ${b.candidatesCount})`
                    };
                  })
                ]}
                style={{ flex: 1 }}
                dropdownWidth="max-content"
              />

              <button
                type="button"
                onClick={handleAssignToBatch}
                disabled={isMapping || selectedTraineeIds.length === 0 || !targetBatchId}
                style={{
                  padding: '11px 24px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 13.5,
                  background: (selectedTraineeIds.length === 0 || !targetBatchId) ? 'var(--border-color)' : 'linear-gradient(135deg, #eab308, #fac95a)',
                  color: '#131313', cursor: (selectedTraineeIds.length === 0 || !targetBatchId) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (selectedTraineeIds.length === 0 || !targetBatchId) ? 'none' : '0 4px 14px rgba(234, 179, 8, 0.25)',
                }}
              >
                {isMapping ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <span>Map Roster ({selectedTraineeIds.length})</span>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Trainees List Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={18} color="var(--powder-blue)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Trainees Pool ({trainees.length})</h3>
          </div>
          {trainees.length > 0 && (
            <button
              onClick={handleSelectAll}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: 8,
                color: 'var(--text-primary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            >
              {selectedTraineeIds.length === trainees.length ? <CheckSquare size={14} /> : <Square size={14} />}
              <span>{selectedTraineeIds.length === trainees.length ? 'Clear Selection' : 'Select All'}</span>
            </button>
          )}
        </div>

        {loadingTrainees ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 60 }}>
            <MorphLoader text="Loading pool roster..." />
          </div>
        ) : trainees.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 60, color: 'var(--text-secondary)' }}>
            <Users size={36} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>No trainees found in this pool date or matching this status filter.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '14px 20px', width: 40 }}></th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 700 }}>Superset ID</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 700 }}>Trainee Name</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 700 }}>Registered Email</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 700 }}>College / School</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 700 }}>Skill Set</th>
                  <th style={{ padding: '14px 20px', width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainees.map(t => {
                  const isEditing = editingTraineeId === t.id;
                  const isSelected = selectedTraineeIds.includes(t.id);
                  const st = getStatusColor(t.status);
                  
                  return (
                    <tr 
                      key={t.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(112, 214, 255, 0.02)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <button
                          onClick={() => handleSelectTrainee(t.id)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: isSelected ? 'var(--powder-blue)' : 'var(--text-secondary)' }}
                        >
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </td>
                      
                      {/* Superset ID */}
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                        {isEditing ? (
                          <input 
                            value={editFields.registrationNumber || ''} 
                            onChange={(e) => setEditFields(p => ({ ...p, registrationNumber: e.target.value }))}
                            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}
                          />
                        ) : (
                          t.registrationNumber || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>None</span>
                        )}
                      </td>
                      
                      {/* Name */}
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {isEditing ? (
                          <input 
                            value={editFields.fullName || ''} 
                            onChange={(e) => setEditFields(p => ({ ...p, fullName: e.target.value }))}
                            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}
                          />
                        ) : (
                          t.fullName
                        )}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                        {isEditing ? (
                          <input 
                            value={editFields.email || ''} 
                            onChange={(e) => setEditFields(p => ({ ...p, email: e.target.value }))}
                            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}
                          />
                        ) : (
                          t.email
                        )}
                      </td>

                      {/* College */}
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                        {isEditing ? (
                          <input 
                            value={editFields.college || ''} 
                            onChange={(e) => setEditFields(p => ({ ...p, college: e.target.value }))}
                            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}
                          />
                        ) : (
                          t.college || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>None</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 20px' }}>
                        {isEditing ? (
                          <select 
                            value={editFields.status || 'UNASSIGNED'} 
                            onChange={(e) => setEditFields(p => ({ ...p, status: e.target.value as any }))}
                            className="glass-input"
                            style={{ padding: '6px 10px', fontSize: 13 }}
                          >
                            <option value="UNASSIGNED">Unassigned</option>
                            <option value="SPARK_1">Spark 1</option>
                            <option value="SPARK_2">Spark 2</option>
                            <option value="FOUNDATION">Foundation</option>
                            <option value="STREAM">Stream</option>
                            <option value="ELIMINATED">Eliminated</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        ) : (
                          <span style={{
                            padding: '4px 10px', borderRadius: 9999, border: `1px solid ${st?.border}`,
                            background: st?.bg, color: st?.text, fontSize: 11, fontWeight: 700, letterSpacing: '0.03em'
                          }}>
                            {t.status}
                          </span>
                        )}
                      </td>

                      {/* Foundation Language */}
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                        {isEditing ? (
                          <input 
                            value={editFields.foundationLanguage || ''} 
                            onChange={(e) => setEditFields(p => ({ ...p, foundationLanguage: e.target.value }))}
                            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}
                          />
                        ) : (
                          t.foundationLanguage || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button 
                              onClick={() => saveEdit(t.id)}
                              style={{ border: 'none', background: 'transparent', color: '#22c55e', cursor: 'pointer', padding: 4 }}
                              title="Save details"
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              onClick={() => setEditingTraineeId(null)}
                              style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                              title="Cancel editing"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => startEditing(t)}
                            style={{ border: 'none', background: 'transparent', color: 'var(--powder-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warning capacity alert modal */}
      <AnimatePresence>
        {showWarningModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1200,
            backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
          }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: '#ffffff', borderRadius: 20, width: '100%', maxWidth: 480,
                padding: 24, boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
                border: '1px solid #e2e8f0', color: '#0f172a'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: '#fef3c7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <ShieldAlert size={20} color="#d97706" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>Capacity Exceeded Warning</h3>
                  <p style={{ fontSize: 13, color: '#4b5563', marginTop: 6, lineHeight: 1.5, margin: '6px 0 0 0' }}>
                    {warningMessage}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowWarningModal(false)}
                  style={{
                    padding: '8px 16px', borderRadius: 10, background: 'transparent',
                    border: '1px solid #cbd5e1', color: '#4b5563', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => proceedAssignment(false, 7)}
                  style={{
                    padding: '8px 16px', borderRadius: 10, background: '#d97706',
                    border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(217, 119, 6, 0.25)'
                  }}
                >
                  Proceed with First {
                    (() => {
                      const selectedBatch = batches.find(b => b._id === targetBatchId);
                      if (selectedBatch && selectedBatch.sizeLimit) {
                        return Math.max(0, selectedBatch.sizeLimit - selectedBatch.candidatesCount);
                      }
                      return '';
                    })()
                  }
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Cohort Split Confirmation Modal */}
      <AnimatePresence>
        {showSplitModal && splitInfo && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1200,
            backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
          }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 520,
                padding: 28, boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
                border: '1px solid #e2e8f0', color: '#0f172a'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)'
                }}>
                  <Zap size={22} color="#ffffff" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>Automated Cohort Splitting</h3>
                  <p style={{ fontSize: 13.5, color: '#4b5563', marginTop: 8, lineHeight: 1.5, margin: '8px 0 0 0' }}>
                    {splitInfo.message}
                  </p>
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                borderRadius: 16, padding: 18, border: '1px solid #e2e8f0',
                fontSize: 13, color: '#334155', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 6
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Original Batch Mapping:</span>
                  <strong style={{ color: '#0f172a' }}>{splitInfo.availableSlots} Trainees</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Remaining Trainees:</span>
                  <strong style={{ color: '#0f172a' }}>{splitInfo.remainingCount} Trainees</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Split Cohorts to Create:</span>
                  <strong style={{ color: '#0ea5e9' }}>{splitInfo.suggestedSplits} Split Cohort(s)</strong>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Gap between cohorts (in Days)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input 
                    type="number"
                    min="1"
                    max="60"
                    value={gapDays}
                    onChange={(e) => setGapDays(Math.max(1, Number(e.target.value)))}
                    style={{
                      width: 100, padding: '10px 14px', borderRadius: 10,
                      border: '1px solid #cbd5e1', outline: 'none', fontSize: 13.5,
                      fontWeight: 600, color: '#0f172a', background: '#f8fafc'
                    }}
                  />
                  <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 500 }}>
                    Days of separation from the previous split cohort's end date.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowSplitModal(false)}
                  style={{
                    padding: '10px 20px', borderRadius: 12, background: 'transparent',
                    border: '1px solid #cbd5e1', color: '#4b5563', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => proceedAssignment(true, gapDays)}
                  style={{
                    padding: '10px 22px', borderRadius: 12, background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                    border: 'none', color: '#ffffff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)', transition: 'all 0.2s'
                  }}
                >
                  Yes, Create Splits & Map
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
