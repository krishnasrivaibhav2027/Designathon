import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Filter, FileSpreadsheet, Trophy, Check, X, Search, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBatches } from '@/context/BatchContext';
import api from '@/services/api';
import CustomSelect from '@/components/CustomSelect';

export default function ReportsPage() {
  const { batches, fetchBatches } = useBatches();
  
  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [batchSearch, setBatchSearch] = useState('');
  const [poolDates, setPoolDates] = useState<string[]>([]);
  const [selectedPoolDate, setSelectedPoolDate] = useState('');
  const [loadingPoolDates, setLoadingPoolDates] = useState(false);

  useEffect(() => {
    fetchBatches();
    fetchOnboardingDates();
  }, []);

  const fetchOnboardingDates = async () => {
    try {
      setLoadingPoolDates(true);
      const res = await api.get('/onboarding/dates');
      setPoolDates(res.data || []);
    } catch (err) {
      console.error('Failed to fetch onboarding pool dates:', err);
    } finally {
      setLoadingPoolDates(false);
    }
  };

  // Helper to get batch UUIDs from selection
  const getSelectedUuidString = () => {
    return selectedBatchIds.join(',');
  };

  // Toggle batch selection
  const handleToggleBatch = (id: string) => {
    setSelectedBatchIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Select all batches
  const handleSelectAllBatches = () => {
    const filtered = batches
      .filter(b => b.batchName.toLowerCase().includes(batchSearch.toLowerCase()) || b.batchId.toLowerCase().includes(batchSearch.toLowerCase()))
      .map(b => b._id);
    setSelectedBatchIds(prev => Array.from(new Set([...prev, ...filtered])));
  };

  // Clear all batch selections
  const handleClearAllBatches = () => {
    setSelectedBatchIds([]);
  };

  // Download logic
  const handleDownload = async (reportType: string, isPdf: boolean = false) => {
    if (selectedBatchIds.length === 0) {
      toast.error('Please select at least one batch in the Global Filters.');
      setShowFilters(true);
      return;
    }

    if (isPdf) {
      toast.error('PDF generation is being configured. Exporting Excel sheet instead.');
    }

    const batchIdsStr = getSelectedUuidString();

    if (reportType === 'attendance') {
      const params: any = { batch_ids: batchIdsStr };
      if (selectedPoolDate) {
        params.pool_date = selectedPoolDate;
      }
      await downloadFile('/report/attendance-consolidated', params, 'Consolidated_Attendance_Report.xlsx');
    } 
    
    else if (reportType === 'scores') {
      if (selectedBatchIds.length > 1) {
        toast.error('Please select exactly one batch for Spark Assessment Scores.');
        setShowFilters(true);
        return;
      }
      const params = { batch_id: selectedBatchIds[0] };
      await downloadFile('/report/assessment-scores', params, 'Spark_Assessment_Scores.xlsx');
    } 
    
    else if (reportType === 'toppers') {
      const params = { batch_ids: batchIdsStr, limit: 10 };
      await downloadFile('/report/toppers/export', params, 'Batch_Toppers_Leaderboard.xlsx');
    } 
    
    else if (reportType === 'consolidated') {
      const params = { batch_ids: batchIdsStr };
      await downloadFile('/report/consolidated', params, 'Consolidated_Batch_Report.xlsx');
    }
  };

  const downloadFile = async (url: string, params: any, defaultFilename: string) => {
    const toastId = toast.loading('Compiling report data & generating Excel...');
    try {
      const response = await api.get(url, {
        params,
        responseType: 'blob'
      });
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = defaultFilename;
      if (contentDisposition && typeof contentDisposition === 'string') {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Report downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Failed to download report:', err);
      toast.error('Failed to generate report. Please verify connection and try again.', { id: toastId });
    }
  };

  const reports = [
    { 
      id: 'attendance',
      title: 'Batch-wise Attendance', 
      description: 'Consolidated attendance report across all selected batches. Can be filtered by onboarding pool.', 
      icon: FileSpreadsheet, 
      color: 'var(--powder-blue)', 
      bg: 'var(--powder-blue-glow)',
      glowClass: 'card-glow-blue'
    },
    { 
      id: 'scores',
      title: 'Assessment Scores', 
      description: 'Detailed view of Spark Phase 1 and Spark Phase 2 assessment, communication, and soft skill scores.', 
      icon: FileSpreadsheet, 
      color: 'var(--pale-orange)', 
      bg: 'var(--pale-orange-glow)',
      glowClass: 'card-glow-orange'
    },
    { 
      id: 'toppers',
      title: 'Topper List', 
      description: 'Automatically generated top performers using Option A (Weighted Phase Average) across active report cards.', 
      icon: Trophy, 
      color: 'var(--yellow)', 
      bg: 'var(--yellow-glow)',
      glowClass: 'card-glow-yellow'
    },
    { 
      id: 'consolidated',
      title: 'Consolidated Batch Report', 
      description: 'Complete journey mapping across Spark 1, Spark 2, Foundational, and Stream training records.', 
      icon: FileSpreadsheet, 
      color: 'var(--powder-blue)', 
      bg: 'var(--powder-blue-glow)',
      glowClass: 'card-glow-blue'
    },
  ];

  // Filtering batches in search box
  const filteredBatches = batches.filter(b => 
    b.batchName.toLowerCase().includes(batchSearch.toLowerCase()) || 
    b.batchId.toLowerCase().includes(batchSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Reports & Downloads</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Generate and export platform analytics</p>
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary theme-reset"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', fontSize: 14,
            borderColor: showFilters ? 'var(--pale-orange)' : 'var(--border-color)',
            background: showFilters ? 'var(--pale-orange-glow)' : 'var(--bg-card)'
          }}
        >
          <Filter size={18} color={showFilters ? 'var(--pale-orange)' : 'var(--text-secondary)'} />
          <span style={{ color: showFilters ? 'var(--pale-orange)' : 'var(--text-primary)', fontWeight: 700 }}>Global Filters</span>
          {selectedBatchIds.length > 0 && (
            <span style={{ 
              background: 'var(--pale-orange)', 
              color: '#121824', 
              fontSize: 11, 
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 6,
              marginLeft: 4
            }}>
              {selectedBatchIds.length}
            </span>
          )}
        </button>
      </div>

      {/* Global Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: showFilters ? 'visible' : 'hidden' }}
          >
            <div className="card card-static" style={{ 
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                {/* Batches Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Select Batches</span>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text"
                      placeholder="Search batches..."
                      value={batchSearch}
                      onChange={(e) => setBatchSearch(e.target.value)}
                      className="glass-input"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        borderRadius: 10,
                        fontSize: 13,
                      }}
                    />
                    <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                    <button onClick={handleSelectAllBatches} style={{ border: 'none', background: 'transparent', color: 'var(--powder-blue)', fontWeight: 700, cursor: 'pointer' }}>Select All</button>
                    <span style={{ color: 'var(--text-muted)' }}>|</span>
                    <button onClick={handleClearAllBatches} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>Clear All</button>
                  </div>
                  
                  {/* Checklist container */}
                  <div className="glass-recessed" style={{ 
                    maxHeight: 180, 
                    overflowY: 'auto', 
                    borderRadius: 10, 
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}>
                    {filteredBatches.length > 0 ? (
                      filteredBatches.map(batch => {
                        const batchUuid = batch._id;
                        const isSelected = selectedBatchIds.includes(batchUuid);
                        return (
                          <div 
                            key={batchUuid}
                            onClick={() => handleToggleBatch(batchUuid)}
                            style={{ 
                               display: 'flex', 
                               alignItems: 'center', 
                               gap: 10, 
                               padding: '6px 10px', 
                               borderRadius: 8,
                               cursor: 'pointer',
                               background: isSelected ? 'var(--powder-blue-glow)' : 'transparent',
                               transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(112, 214, 255, 0.08)'; }}
                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <div style={{
                              width: 16, height: 16, borderRadius: 4, 
                              border: `1px solid ${isSelected ? 'var(--powder-blue)' : 'var(--border-color)'}`,
                              background: isSelected ? 'var(--powder-blue)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--powder-blue)' : 'var(--text-primary)' }}>{batch.batchName}</span>
                              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                                {batch.batchId} ({batch.status})
                                {batch.onboardingDate && ` • Pool: ${new Date(batch.onboardingDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', padding: 12, textAlign: 'center' }}>No batches found</span>
                    )}
                  </div>
                </div>
 
                {/* Onboarding Pool Date Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={14} /> Onboarding Pool Filter
                  </span>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Limit consolidated reports to trainees onboarded on a specific date. Useful for batches containing mixed pools.
                  </p>
                  <CustomSelect
                    value={selectedPoolDate}
                    onChange={setSelectedPoolDate}
                    options={[
                      { value: '', label: 'All Onboarding Pools (No Date Filter)' },
                      ...poolDates.map((d) => ({
                        value: d,
                        label: new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      }))
                    ]}
                    style={{ width: '100%' }}
                  />
                </div>
 
                {/* Filters Summary Panel */}
                <div className="glass-recessed" style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 12, 
                  borderRadius: 10, 
                  padding: 14,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Selection</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Selected Batches:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{selectedBatchIds.length}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Pool Date:</span>
                      <strong style={{ color: selectedPoolDate ? 'var(--pale-orange)' : 'var(--text-primary)' }}>
                        {selectedPoolDate ? new Date(selectedPoolDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'All Pools'}
                      </strong>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowFilters(false)}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: 12.5, width: '100%' }}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reports Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 24 }}>
        {reports.map((report, idx) => (
          <motion.div 
            key={report.title} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: idx * 0.1 }}
            className={`card ${report.glowClass}`} 
            style={{ display: 'flex', gap: 20, alignItems: 'flex-start', padding: 24 }}
          >
            <div style={{ 
              padding: 16, 
              borderRadius: 16, 
              background: report.bg,
              border: `1px solid ${report.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <report.icon size={24} color={report.color} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{report.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>{report.description}</p>
              <div style={{ display: 'flex', gap: 20 }}>
                <button 
                  onClick={() => handleDownload(report.id, false)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 6, 
                    border: 'none', background: 'transparent', 
                    color: 'var(--powder-blue)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <Download size={16} /> Export Excel
                </button>
                <button 
                  onClick={() => handleDownload(report.id, true)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 6, 
                    border: 'none', background: 'transparent', 
                    color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <Download size={16} /> Export PDF
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
