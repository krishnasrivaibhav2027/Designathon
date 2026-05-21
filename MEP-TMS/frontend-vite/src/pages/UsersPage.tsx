import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Mail, Shield, UserX, Edit2, Users, 
  BookOpen, GraduationCap, ChevronLeft, ChevronRight, ArrowLeft 
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useBatches } from '@/context/BatchContext';

type Category = 'NONE' | 'TRAINERS' | 'TRAINEES';

interface Trainer {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  assignedBatches: string[];
  batchNames: string[];
}

interface Trainee {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  registrationNumber: string;
  batchId: string;
  batchName: string;
}

export default function UsersPage() {
  const { batches } = useBatches();
  
  // Selection States
  const [activeCategory, setActiveCategory] = useState<Category>('NONE');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  
  // Data States
  const [trainersData, setTrainersData] = useState<Trainer[]>([]);
  const [traineesData, setTraineesData] = useState<Trainee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Reset pagination when category changes
  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(1);
    setTotalRecords(0);
    setTrainersData([]);
    setTraineesData([]);
    if (activeCategory === 'TRAINEES') {
      setSelectedBatchId('');
    }
  }, [activeCategory]);

  // Fetch trainers
  const fetchTrainers = async (page: number) => {
    setIsLoading(true);
    try {
      const response = await api.get('/users/trainers', {
        params: { page, limit: 10 }
      });
      setTrainersData(response.data.data);
      setTotalRecords(response.data.total);
      setTotalPages(response.data.pages);
      setCurrentPage(response.data.page);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to load trainers. Ensure backend is running.');
      setTrainersData([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch trainees
  const fetchTrainees = async (batchId: string, page: number) => {
    if (!batchId) return;
    setIsLoading(true);
    try {
      const response = await api.get('/users/trainees', {
        params: { batch_id: batchId, page, limit: 10 }
      });
      setTraineesData(response.data.data);
      setTotalRecords(response.data.total);
      setTotalPages(response.data.pages);
      setCurrentPage(response.data.page);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to load trainees. Ensure backend is running.');
      setTraineesData([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger load when page changes or when batch changes
  useEffect(() => {
    if (activeCategory === 'TRAINERS') {
      fetchTrainers(currentPage);
    }
  }, [activeCategory, currentPage]);

  useEffect(() => {
    if (activeCategory === 'TRAINEES' && selectedBatchId) {
      fetchTrainees(selectedBatchId, currentPage);
    }
  }, [selectedBatchId, currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      {/* Top Navigation / Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeCategory !== 'NONE' && (
              <button 
                onClick={() => setActiveCategory('NONE')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 8, borderRadius: '50%', border: 'none', background: '#f5f5f5',
                  cursor: 'pointer', color: '#636e72', transition: 'all 0.2s'
                }}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2d3436' }}>
              {activeCategory === 'NONE' && 'User Management'}
              {activeCategory === 'TRAINERS' && 'Trainer Management'}
              {activeCategory === 'TRAINEES' && 'Trainee Management'}
            </h1>
          </div>
          <p style={{ fontSize: 14, color: '#b2bec3', marginTop: 4 }}>
            {activeCategory === 'NONE' && 'Filter and query platform trainers and trainees.'}
            {activeCategory === 'TRAINERS' && 'Displaying all system trainers.'}
            {activeCategory === 'TRAINEES' && 'Select a batch to list candidates.'}
          </p>
        </div>

        <button style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 12, border: 'none',
          background: '#5b5fc7', color: '#fff', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(91,95,199,0.2)',
        }}>
          <Plus size={18} /><span>Add User</span>
        </button>
      </div>

      {/* 1. SELECTION STATE: Category choosing */}
      {activeCategory === 'NONE' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 12 }}>
          {/* Trainers Card */}
          <motion.div 
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => setActiveCategory('TRAINERS')}
            className="card"
            style={{
              padding: 40, cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden',
              background: 'linear-gradient(135deg, #ffffff, #fafaff)', border: '1px solid rgba(91, 95, 199, 0.08)'
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #e8eaf6, #c5cae9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
            }}>
              <BookOpen size={32} color="#5b5fc7" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2d3436' }}>Platform Trainers</h3>
            <p style={{ fontSize: 14, color: '#636e72', marginTop: 8, lineHeight: 1.6, maxWidth: 280 }}>
              Query and view all registered platform trainers. Resolves dynamic batch assignments.
            </p>
          </motion.div>

          {/* Trainees Card */}
          <motion.div 
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => setActiveCategory('TRAINEES')}
            className="card"
            style={{
              padding: 40, cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden',
              background: 'linear-gradient(135deg, #ffffff, #f7fcf8)', border: '1px solid rgba(102, 187, 106, 0.08)'
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
            }}>
              <GraduationCap size={32} color="#4caf50" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2d3436' }}>Platform Trainees</h3>
            <p style={{ fontSize: 14, color: '#636e72', marginTop: 8, lineHeight: 1.6, maxWidth: 280 }}>
              Query batch cohorts to manage enrolled trainees and performance metrics.
            </p>
          </motion.div>
        </div>
      )}

      {/* 2. TRAINERS VIEW */}
      {activeCategory === 'TRAINERS' && (
        <div className="card" style={{ padding: 24 }}>
          {isLoading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#b2bec3' }}>
              Loading trainer records...
            </div>
          ) : trainersData.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <Users size={48} color="#e0e0e0" style={{ marginBottom: 16 }} />
              <p style={{ color: '#b2bec3', fontSize: 15, fontWeight: 500 }}>No data is available</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#b2bec3', fontWeight: 600 }}>Trainer</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#b2bec3', fontWeight: 600 }}>Assigned To</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#b2bec3', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: '#b2bec3', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainersData.map((t, idx) => (
                      <motion.tr 
                        key={t.id} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: idx * 0.05 }}
                        style={{ borderBottom: '1px solid #fcfcfc' }}
                      >
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ 
                              width: 40, height: 40, borderRadius: '50%', 
                              background: 'linear-gradient(135deg, #5b5fc7, #42a5f5)', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              color: '#fff', fontWeight: 700 
                            }}>
                              {t.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#2d3436' }}>{t.fullName}</div>
                              <div style={{ fontSize: 12, color: '#636e72', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Mail size={12} />{t.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {t.batchNames && t.batchNames.length > 0 ? (
                              t.batchNames.map(name => (
                                <span 
                                  key={name} 
                                  style={{ 
                                    padding: '4px 10px', borderRadius: 20, fontSize: 11, 
                                    fontWeight: 600, background: '#e8eaf6', color: '#5b5fc7' 
                                  }}
                                >
                                  {name}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: 12, color: '#b2bec3', fontStyle: 'italic' }}>Unassigned</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, 
                            background: t.isActive ? '#e8f5e9' : '#ffeaea', 
                            color: t.isActive ? '#66bb6a' : '#ff6b6b' 
                          }}>
                            {t.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button style={{ padding: 8, borderRadius: 8, border: 'none', background: '#e8eaf6', color: '#5b5fc7', cursor: 'pointer' }}><Edit2 size={16} /></button>
                            <button style={{ padding: 8, borderRadius: 8, border: 'none', background: '#ffeaea', color: '#ff6b6b', cursor: 'pointer' }}><UserX size={16} /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                <span style={{ fontSize: 13, color: '#636e72' }}>
                  Showing {Math.min((currentPage - 1) * 10 + 1, totalRecords)} to {Math.min(currentPage * 10, totalRecords)} of {totalRecords} records
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    disabled={currentPage === 1}
                    onClick={handlePrevPage}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8,
                      border: '1px solid #e0e0e0', background: '#fff', fontSize: 13, fontWeight: 600,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={handleNextPage}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8,
                      border: '1px solid #e0e0e0', background: '#fff', fontSize: 13, fontWeight: 600,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. TRAINEES VIEW */}
      {activeCategory === 'TRAINEES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Batch Selector Dropdown */}
          <div className="card" style={{ padding: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 8 }}>Choose Cohort / Batch</label>
            <select 
              value={selectedBatchId} 
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%', maxWidth: 400, padding: '12px 16px', borderRadius: 12, border: '1px solid #e0e0e0',
                outline: 'none', fontSize: 14, color: '#2d3436', background: '#fafffe', transition: 'border 0.2s'
              }}
            >
              <option value="">-- Select a Batch --</option>
              {batches.map(b => (
                <option key={b._id} value={b._id}>{b.batchName}</option>
              ))}
            </select>
          </div>

          {/* Trainees Table Container */}
          <div className="card" style={{ padding: 24 }}>
            {!selectedBatchId ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#b2bec3' }}>
                <GraduationCap size={48} color="#e0e0e0" style={{ marginBottom: 16 }} />
                <p style={{ fontSize: 15, fontWeight: 500 }}>Please select a batch from the filter dropdown above to load trainee records.</p>
              </div>
            ) : isLoading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#b2bec3' }}>
                Loading trainees...
              </div>
            ) : traineesData.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <Users size={48} color="#e0e0e0" style={{ marginBottom: 16 }} />
                <p style={{ color: '#b2bec3', fontSize: 15, fontWeight: 500 }}>No data is available</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#b2bec3', fontWeight: 600 }}>Trainee</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#b2bec3', fontWeight: 600 }}>Reg Number</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#b2bec3', fontWeight: 600 }}>Assigned To</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: '#b2bec3', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {traineesData.map((t, idx) => (
                        <motion.tr 
                          key={t.id} 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          transition={{ delay: idx * 0.05 }}
                          style={{ borderBottom: '1px solid #fcfcfc' }}
                        >
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ 
                                width: 40, height: 40, borderRadius: '50%', 
                                background: 'linear-gradient(135deg, #66bb6a, #4db6ac)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                color: '#fff', fontWeight: 700 
                              }}>
                                {t.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#2d3436' }}>{t.fullName}</div>
                                <div style={{ fontSize: 12, color: '#636e72', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                  <Mail size={12} />{t.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#636e72', fontFamily: 'monospace' }}>
                              {t.registrationNumber}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ 
                              padding: '4px 10px', borderRadius: 20, fontSize: 11, 
                              fontWeight: 600, background: '#e8f5e9', color: '#4caf50' 
                            }}>
                              {t.batchName}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <button style={{ padding: 8, borderRadius: 8, border: 'none', background: '#e8eaf6', color: '#5b5fc7', cursor: 'pointer' }}><Edit2 size={16} /></button>
                              <button style={{ padding: 8, borderRadius: 8, border: 'none', background: '#ffeaea', color: '#ff6b6b', cursor: 'pointer' }}><UserX size={16} /></button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                  <span style={{ fontSize: 13, color: '#636e72' }}>
                    Showing {Math.min((currentPage - 1) * 10 + 1, totalRecords)} to {Math.min(currentPage * 10, totalRecords)} of {totalRecords} records
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      disabled={currentPage === 1}
                      onClick={handlePrevPage}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8,
                        border: '1px solid #e0e0e0', background: '#fff', fontSize: 13, fontWeight: 600,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1
                      }}
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={handleNextPage}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8,
                        border: '1px solid #e0e0e0', background: '#fff', fontSize: 13, fontWeight: 600,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1
                      }}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
