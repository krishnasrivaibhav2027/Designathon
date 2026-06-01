import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Mail, Shield, UserX, UserCheck, Edit2, Users, 
  BookOpen, GraduationCap, ChevronLeft, ChevronRight, ArrowLeft, ShieldAlert,
  Eye, EyeOff, X 
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useBatches } from '@/context/BatchContext';
import CustomSelect from '@/components/CustomSelect';

type Category = 'NONE' | 'TRAINERS' | 'TRAINEES' | 'COORDINATORS';

interface Trainer {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  assignedBatches: string[];
  batchNames: string[];
  assignedBatchesDetail?: Array<{
    id: string;
    name: string;
    duration: string;
    poolDate: string;
  }>;
}

interface Trainee {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  registrationNumber: string;
  batchId: string;
  batchName: string;
  onboardingDate?: string;
  status?: string;
  foundationLanguage?: string;
  streamTraining?: string;
  poolId?: string;
}

const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'UNASSIGNED':
      return {
        label: 'Unassigned',
        style: {
          background: 'rgba(148, 163, 184, 0.15)',
          color: '#cbd5e1',
          border: '1px solid #64748b'
        }
      };
    case 'SPARK_1':
      return {
        label: 'Spark Phase 1',
        style: {
          background: 'rgba(56, 189, 248, 0.15)',
          color: '#bae6fd',
          border: '1px solid #0284c7'
        }
      };
    case 'FOUNDATION':
      return {
        label: 'Foundational',
        style: {
          background: 'rgba(34, 197, 94, 0.15)',
          color: '#bbf7d0',
          border: '1px solid #22c55e'
        }
      };
    case 'SPARK_2':
      return {
        label: 'Spark Phase 2',
        style: {
          background: 'rgba(129, 140, 248, 0.15)',
          color: '#e0e7ff',
          border: '1px solid #4f46e5'
        }
      };
    case 'STREAM':
      return {
        label: 'Stream Based',
        style: {
          background: 'rgba(217, 70, 239, 0.15)',
          color: '#f5d0fe',
          border: '1px solid #c084fc'
        }
      };
    case 'ELIMINATED':
      return {
        label: 'Eliminated',
        style: {
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#fecaca',
          border: '1px solid #ef4444'
        }
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        style: {
          background: 'rgba(13, 148, 136, 0.15)',
          color: '#ccfbf1',
          border: '1px solid #0d9488'
        }
      };
    default:
      return {
        label: status || 'Unassigned',
        style: {
          background: 'rgba(148, 163, 184, 0.15)',
          color: '#cbd5e1',
          border: '1px solid #64748b'
        }
      };
  }
};

export default function UsersPage() {
  const { batches, fetchBatches } = useBatches();
  const { user } = useAuth();
  
  // Add User State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFullName, setAddFullName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addRole, setAddRole] = useState<'TRAINER' | 'COORDINATOR'>('TRAINER');

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFullName.trim() || !addEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }
    try {
      await api.post('/users', {
        email: addEmail.trim(),
        fullName: addFullName.trim(),
        phone: addPhone.trim() || null,
        role: addRole
      });
      toast.success('Account created successfully. Login email sent!');
      setShowAddModal(false);
      setAddFullName('');
      setAddEmail('');
      setAddPhone('');
      setAddRole('TRAINER');
      if (activeCategory === 'TRAINERS') {
        fetchTrainers(currentPage);
      } else if (activeCategory === 'COORDINATORS') {
        fetchCoordinators(currentPage);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to create user');
    }
  };

  // Selection States
  const [activeCategory, setActiveCategory] = useState<Category>('NONE');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  // Modals & Forms States
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
  
  const [isEditTrainerOpen, setIsEditTrainerOpen] = useState(false);
  const [isEditTraineeOpen, setIsEditTraineeOpen] = useState(false);
  const [isToggleActiveOpen, setIsToggleActiveOpen] = useState(false);
  const [isEliminateOpen, setIsEliminateOpen] = useState(false);

  const [editTrainerForm, setEditTrainerForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    isActive: true
  });

  const [editTraineeForm, setEditTraineeForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    foundationLanguage: '',
    streamTraining: '',
    status: '',
    eliminatedPhase: ''
  });

  // Trainer Action Handlers
  const handleOpenEditTrainer = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setEditTrainerForm({
      fullName: trainer.fullName || '',
      email: trainer.email || '',
      phone: trainer.phone || '',
      isActive: trainer.isActive !== false
    });
    setIsEditTrainerOpen(true);
  };

  const handleUpdateTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainer) return;
    setIsLoading(true);
    try {
      await api.put(`/users/${selectedTrainer.id}`, editTrainerForm);
      const isCoordinator = selectedTrainer.role === 'COORDINATOR' || activeCategory === 'COORDINATORS';
      toast.success(`${isCoordinator ? 'Coordinator' : 'Trainer'} updated successfully`);
      setIsEditTrainerOpen(false);
      if (isCoordinator) {
        fetchCoordinators(currentPage);
      } else {
        fetchTrainers(currentPage);
      }
    } catch (error: any) {
      console.error(error);
      const isCoordinator = selectedTrainer.role === 'COORDINATOR' || activeCategory === 'COORDINATORS';
      toast.error(error.response?.data?.detail || `Failed to update ${isCoordinator ? 'coordinator' : 'trainer'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenToggleActive = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setIsToggleActiveOpen(true);
  };

  const handleToggleActiveSubmit = async () => {
    if (!selectedTrainer) return;
    setIsLoading(true);
    try {
      await api.put(`/users/${selectedTrainer.id}/toggle-active`);
      const isCoordinator = selectedTrainer.role === 'COORDINATOR' || activeCategory === 'COORDINATORS';
      toast.success(`${isCoordinator ? 'Coordinator' : 'Trainer'} account ${selectedTrainer.isActive !== false ? 'deactivated' : 'activated'} successfully`);
      setIsToggleActiveOpen(false);
      if (isCoordinator) {
        fetchCoordinators(currentPage);
      } else {
        fetchTrainers(currentPage);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to toggle status');
    } finally {
      setIsLoading(false);
    }
  };

  // Trainee Action Handlers
  const handleOpenEditTrainee = (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setEditTraineeForm({
      fullName: trainee.fullName || '',
      email: trainee.email || '',
      phone: trainee.phone || '',
      foundationLanguage: trainee.foundationLanguage || '',
      streamTraining: trainee.streamTraining || '',
      status: trainee.status || 'UNASSIGNED',
      eliminatedPhase: ''
    });
    setIsEditTraineeOpen(true);
  };

  const handleUpdateTraineeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainee || !selectedTrainee.poolId) {
      toast.error('Trainee pool information is missing.');
      return;
    }
    setIsLoading(true);
    try {
      await api.put(`/onboarding/pool/${selectedTrainee.poolId}`, editTraineeForm);
      toast.success('Trainee updated successfully');
      setIsEditTraineeOpen(false);
      fetchTrainees(selectedBatchId, currentPage);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to update trainee');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEliminate = (trainee: Trainee) => {
    setSelectedTrainee(trainee);
    setIsEliminateOpen(true);
  };

  const handleEliminateSubmit = async () => {
    if (!selectedTrainee || !selectedTrainee.poolId) {
      toast.error('Trainee pool information is missing.');
      return;
    }
    setIsLoading(true);
    try {
      await api.put(`/onboarding/pool/${selectedTrainee.poolId}`, {
        status: 'ELIMINATED'
      });
      toast.success('Trainee eliminated successfully');
      setIsEliminateOpen(false);
      fetchTrainees(selectedBatchId, currentPage);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to eliminate trainee');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Data States
  const [trainersData, setTrainersData] = useState<Trainer[]>([]);
  const [traineesData, setTraineesData] = useState<Trainee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Reset pagination when category changes
  const [coordinatorsData, setCoordinatorsData] = useState<any[]>([]);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(1);
    setTotalRecords(0);
    setTrainersData([]);
    setTraineesData([]);
    setCoordinatorsData([]);
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

  // Fetch coordinators
  const fetchCoordinators = async (page: number) => {
    setIsLoading(true);
    try {
      const response = await api.get('/users/coordinators', {
        params: { page, limit: 10 }
      });
      setCoordinatorsData(response.data.data);
      setTotalRecords(response.data.total);
      setTotalPages(response.data.pages);
      setCurrentPage(response.data.page);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to load coordinators. Ensure backend is running.');
      setCoordinatorsData([]);
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
    } else if (activeCategory === 'COORDINATORS') {
      fetchCoordinators(currentPage);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }} className="fade-in">
      {/* Top Navigation / Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {activeCategory !== 'NONE' && (
              <button 
                onClick={() => setActiveCategory('NONE')}
                className="btn-secondary"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 8, borderRadius: '50%',
                  cursor: 'pointer', transition: 'all 0.2s', width: 36, height: 36
                }}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
              {activeCategory === 'NONE' && 'User Management'}
              {activeCategory === 'TRAINERS' && 'Trainer Management'}
              {activeCategory === 'TRAINEES' && 'Trainee Management'}
              {activeCategory === 'COORDINATORS' && 'Coordinator Management'}
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            {activeCategory === 'NONE' && (user?.role === 'ADMIN' ? 'Filter and query platform trainers and coordinators.' : 'Filter and query platform trainers and trainees.')}
            {activeCategory === 'TRAINERS' && 'Displaying all system trainers.'}
            {activeCategory === 'TRAINEES' && 'Select a batch to list candidates.'}
            {activeCategory === 'COORDINATORS' && 'Displaying all system coordinators.'}
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ fontSize: 14 }}>
            <Plus size={18} /><span>Add User</span>
          </button>
        )}
      </div>

      {/* 1. SELECTION STATE: Category choosing */}
      {activeCategory === 'NONE' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 12 }}>
          {/* Trainers Card */}
          <motion.div 
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => setActiveCategory('TRAINERS')}
            className="card card-glow-blue"
            style={{
              padding: 40, cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center', position: 'relative'
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'var(--powder-blue-glow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
              border: '1px solid var(--powder-blue)'
            }}>
              <BookOpen size={32} color="var(--powder-blue)" />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Platform Trainers</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.6, maxWidth: 280 }}>
              Query and view all registered platform trainers. Resolves dynamic batch assignments.
            </p>
          </motion.div>

          {/* Platform Coordinators (for ADMIN) or Platform Trainees (for others) */}
          {user?.role === 'ADMIN' ? (
            <motion.div 
              whileHover={{ scale: 1.02, y: -4 }}
              onClick={() => setActiveCategory('COORDINATORS')}
              className="card card-glow-orange"
              style={{
                padding: 40, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center', position: 'relative'
              }}
            >
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: 'var(--pale-orange-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                border: '1px solid var(--pale-orange)'
              }}>
                <Shield size={32} color="var(--pale-orange)" />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Platform Coordinators</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.6, maxWidth: 280 }}>
                Query and view all registered platform coordinators.
              </p>
            </motion.div>
          ) : (
            <motion.div 
              whileHover={{ scale: 1.02, y: -4 }}
              onClick={() => setActiveCategory('TRAINEES')}
              className="card card-glow-orange"
              style={{
                padding: 40, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center', position: 'relative'
              }}
            >
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: 'var(--pale-orange-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                border: '1px solid var(--pale-orange)'
              }}>
                <GraduationCap size={32} color="var(--pale-orange)" />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Platform Trainees</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.6, maxWidth: 280 }}>
                Query batch cohorts to manage enrolled trainees and performance metrics.
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* 2. TRAINERS VIEW */}
      {activeCategory === 'TRAINERS' && (
        <div className="card card-glow-blue" style={{ padding: 24 }}>
          {isLoading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading trainer records...
            </div>
          ) : trainersData.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <Users size={48} color="var(--text-muted)" style={{ marginBottom: 16, margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>No data is available</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Trainer ID</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Trainer Name</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Assigned Batches & Timelines</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainersData.map((t, idx) => (
                      <motion.tr 
                        key={t.id} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: idx * 0.05 }}
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                      >
                        <td style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                          {`TRN-${t.id.substring(0, 8).toUpperCase()}`}
                        </td>
                        <td style={{ padding: '16px', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ 
                              width: 40, height: 40, borderRadius: '50%', 
                              background: 'linear-gradient(135deg, var(--powder-blue) 0%, var(--pale-orange) 100%)', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              color: '#121824', fontWeight: 700, flexShrink: 0
                            }}>
                              {t.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t.fullName}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Mail size={12} />{t.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {t.isActive === false ? (
                              <span style={{ 
                                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, 
                                background: 'rgba(239, 68, 68, 0.15)', 
                                color: '#fecaca',
                                border: '1px solid #ef4444'
                              }}>
                                Inactive
                              </span>
                            ) : (
                              <span style={{ 
                                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, 
                                background: 'rgba(34, 197, 94, 0.15)', 
                                color: '#86efac',
                                border: '1px solid #22c55e'
                              }}>
                                Active
                              </span>
                            )}
                            {t.assignedBatches && t.assignedBatches.length > 0 ? (
                              <span style={{ 
                                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, 
                                background: 'rgba(56, 189, 248, 0.15)', 
                                color: '#bae6fd',
                                border: '1px solid #0284c7'
                              }}>
                                Assigned
                              </span>
                            ) : (
                              <span style={{ 
                                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, 
                                background: 'rgba(100, 116, 139, 0.15)', 
                                color: '#cbd5e1',
                                border: '1px solid #64748b'
                              }}>
                                Unassigned
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px', verticalAlign: 'top' }}>
                          <div 
                            className="custom-scrollbar"
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: 10, 
                              maxWidth: 360,
                              maxHeight: t.assignedBatchesDetail && t.assignedBatchesDetail.length > 3 ? '210px' : 'none',
                              overflowY: t.assignedBatchesDetail && t.assignedBatchesDetail.length > 3 ? 'auto' : 'visible',
                              paddingRight: t.assignedBatchesDetail && t.assignedBatchesDetail.length > 3 ? '6px' : '0px'
                            }}
                          >
                            {t.assignedBatchesDetail && t.assignedBatchesDetail.length > 0 ? (
                              t.assignedBatchesDetail.map(b => (
                                <motion.div 
                                  key={b.id} 
                                  whileHover={{ y: -2, borderColor: 'rgba(112, 214, 255, 0.25)', boxShadow: '0 4px 12px rgba(112, 214, 255, 0.08)' }}
                                  transition={{ duration: 0.2 }}
                                  style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: 6, 
                                    padding: '10px 14px', 
                                    background: 'linear-gradient(135deg, rgba(112, 214, 255, 0.04) 0%, rgba(255, 160, 89, 0.02) 100%)', 
                                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                                    borderRadius: 12,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                    cursor: 'default'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--powder-blue)' }}>{b.name}</span>
                                    {b.poolDate && (
                                      <span style={{ 
                                        fontSize: 10, 
                                        color: 'var(--yellow)', 
                                        background: 'var(--yellow-glow)', 
                                        padding: '2px 8px', 
                                        borderRadius: 6,
                                        fontWeight: 700,
                                        border: '1px solid rgba(255, 208, 0, 0.2)'
                                      }}>
                                        Pool: {b.poolDate}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ opacity: 0.7 }}>Timeline:</span> {b.duration}
                                  </div>
                                </motion.div>
                              ))
                            ) : (
                              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>-</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button 
                              onClick={() => handleOpenEditTrainer(t)}
                              className="btn-secondary" 
                              title="Edit Trainer"
                              style={{ padding: '6px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleOpenToggleActive(t)}
                              className="btn-secondary" 
                              title={t.isActive === false ? "Activate Trainer" : "Deactivate Trainer"}
                              style={{ 
                                padding: '6px 10px', 
                                borderRadius: 8, 
                                color: t.isActive === false ? 'rgba(34, 197, 94, 0.9)' : 'var(--pale-orange)', 
                                borderColor: t.isActive === false ? 'rgba(34, 197, 94, 0.3)' : 'var(--pale-orange-glow)', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                              }}
                            >
                              {t.isActive === false ? <UserCheck size={14} /> : <UserX size={14} />}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Showing {Math.min((currentPage - 1) * 10 + 1, totalRecords)} to {Math.min(currentPage * 10, totalRecords)} of {totalRecords} records
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    disabled={currentPage === 1}
                    onClick={handlePrevPage}
                    className="btn-secondary"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8,
                      fontSize: 13, fontWeight: 600,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={handleNextPage}
                    className="btn-secondary"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8,
                      fontSize: 13, fontWeight: 600,
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

      {/* 2b. COORDINATORS VIEW */}
      {activeCategory === 'COORDINATORS' && (
        <div className="card card-glow-orange" style={{ padding: 24 }}>
          {isLoading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading coordinator records...
            </div>
          ) : coordinatorsData.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <Users size={48} color="var(--text-muted)" style={{ marginBottom: 16, margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>No data is available</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Coordinator ID</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Coordinator Name</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Phone</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coordinatorsData.map((c, idx) => (
                      <motion.tr 
                        key={c.id} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: idx * 0.05 }}
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                      >
                        <td style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {`COO-${c.id.substring(0, 8).toUpperCase()}`}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ 
                              width: 40, height: 40, borderRadius: '50%', 
                              background: 'linear-gradient(135deg, var(--pale-orange) 0%, var(--powder-blue) 100%)', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              color: '#121824', fontWeight: 700 
                            }}>
                              {c.fullName ? c.fullName.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{c.fullName || 'N/A'}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Mail size={12} />{c.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          {c.isActive ? (
                            <span style={{ 
                              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, 
                              background: 'rgba(34, 197, 94, 0.15)', 
                              color: '#86efac',
                              border: '1px solid #22c55e'
                            }}>
                              Active
                            </span>
                          ) : (
                            <span style={{ 
                              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, 
                              background: 'rgba(239, 68, 68, 0.15)', 
                              color: '#fecaca',
                              border: '1px solid #ef4444'
                            }}>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                          {c.phone || '-'}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button 
                              onClick={() => handleOpenEditTrainer(c)}
                              className="btn-secondary" 
                              title="Edit Coordinator"
                              style={{ padding: '6px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleOpenToggleActive(c)}
                              className="btn-secondary" 
                              title={c.isActive === false ? "Activate Coordinator" : "Deactivate Coordinator"}
                              style={{ 
                                padding: '6px 10px', 
                                borderRadius: 8, 
                                color: c.isActive === false ? 'rgba(34, 197, 94, 0.9)' : 'var(--pale-orange)', 
                                borderColor: c.isActive === false ? 'rgba(34, 197, 94, 0.3)' : 'var(--pale-orange-glow)', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                              }}
                            >
                              {c.isActive === false ? <UserCheck size={14} /> : <UserX size={14} />}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Showing {Math.min((currentPage - 1) * 10 + 1, totalRecords)} to {Math.min(currentPage * 10, totalRecords)} of {totalRecords} records
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    disabled={currentPage === 1}
                    onClick={handlePrevPage}
                    className="btn-secondary"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8,
                      fontSize: 13, fontWeight: 600,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={handleNextPage}
                    className="btn-secondary"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8,
                      fontSize: 13, fontWeight: 600,
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
          <div className="card card-glow-orange card-static" style={{ padding: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Choose Cohort / Batch</label>
            <CustomSelect
              value={selectedBatchId}
              onChange={(val) => {
                setSelectedBatchId(val);
                setCurrentPage(1);
              }}
              options={[
                { value: '', label: '-- Select a Batch --' },
                ...batches.map((b) => ({
                  value: b._id,
                  label: b.batchName
                }))
              ]}
              style={{ width: '100%', maxWidth: 400 }}
            />
          </div>

          {/* Trainees Table Container */}
          <div className="card card-glow-blue" style={{ padding: 24 }}>
            {!selectedBatchId ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <GraduationCap size={48} color="var(--text-muted)" style={{ marginBottom: 16, margin: '0 auto 16px' }} />
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)' }}>Please select a batch from the filter dropdown above to load trainee records.</p>
              </div>
            ) : isLoading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading trainees...
              </div>
            ) : traineesData.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <Users size={48} color="var(--text-muted)" style={{ marginBottom: 16, margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>No data is available</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Trainee ID</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Trainee Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Onboarding Date</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Current Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Specialization</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Assigned Cohort</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {traineesData.map((t, idx) => (
                        <motion.tr 
                          key={t.id} 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          transition={{ delay: idx * 0.05 }}
                          style={{ borderBottom: '1px solid var(--border-color)' }}
                        >
                          <td style={{ padding: '16px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {t.registrationNumber}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ 
                                width: 40, height: 40, borderRadius: '50%', 
                                background: 'linear-gradient(135deg, var(--pale-orange) 0%, var(--yellow) 100%)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                color: '#121824', fontWeight: 700 
                              }}>
                                {t.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t.fullName}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                  <Mail size={12} />{t.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                            {t.onboardingDate ? t.onboardingDate.substring(0, 10) : '-'}
                          </td>
                          <td style={{ padding: '16px' }}>
                            {(() => {
                              const badge = getStatusBadge(t.status);
                              return (
                                <span style={{ 
                                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, 
                                  ...badge.style
                                }}>
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {t.foundationLanguage || '-'}
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span 
                              className="badge-glow-orange"
                              style={{ 
                                padding: '4px 10px', borderRadius: 20, fontSize: 11.5, 
                                fontWeight: 700, display: 'inline-block', width: 'fit-content'
                              }}
                            >
                              {t.batchName}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <button 
                                onClick={() => handleOpenEditTrainee(t)}
                                className="btn-secondary" 
                                title="Edit Trainee"
                                style={{ padding: '6px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleOpenEliminate(t)}
                                disabled={t.status === 'ELIMINATED'}
                                className="btn-secondary" 
                                title="Eliminate Trainee"
                                style={{ 
                                  padding: '6px 10px', 
                                  borderRadius: 8, 
                                  color: t.status === 'ELIMINATED' ? 'var(--text-muted)' : 'var(--pale-orange)', 
                                  borderColor: t.status === 'ELIMINATED' ? 'transparent' : 'var(--pale-orange-glow)', 
                                  cursor: t.status === 'ELIMINATED' ? 'not-allowed' : 'pointer',
                                  opacity: t.status === 'ELIMINATED' ? 0.4 : 1,
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center' 
                                }}
                              >
                                <UserX size={14} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Showing {Math.min((currentPage - 1) * 10 + 1, totalRecords)} to {Math.min(currentPage * 10, totalRecords)} of {totalRecords} records
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      disabled={currentPage === 1}
                      onClick={handlePrevPage}
                      className="btn-secondary"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8,
                        fontSize: 13, fontWeight: 600,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1
                      }}
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={handleNextPage}
                      className="btn-secondary"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8,
                        fontSize: 13, fontWeight: 600,
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

      {/* Edit Trainer Modal */}
      {isEditTrainerOpen && selectedTrainer && createPortal(
        <div 
          onClick={() => setIsEditTrainerOpen(false)}
          className="modal-overlay"
          style={{ alignItems: 'flex-start' }}
        >
          <AnimatePresence>
            <motion.div 
              key="edit-trainer-modal"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{
                background: 'var(--bg-dropdown)', borderRadius: 20, width: '100%', maxWidth: 500,
                padding: 28, border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-card)', backdropFilter: 'var(--card-blur)'
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20, fontFamily: 'Outfit, sans-serif' }}>
                {selectedTrainer.role === 'COORDINATOR' || activeCategory === 'COORDINATORS' ? 'Edit Coordinator Profile' : 'Edit Trainer Profile'}
              </h3>
              <form onSubmit={handleUpdateTrainerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={editTrainerForm.fullName}
                    onChange={(e) => setEditTrainerForm({ ...editTrainerForm, fullName: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', background: 'var(--bg-card)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Email</label>
                  <input 
                    type="email" 
                    required
                    value={editTrainerForm.email}
                    onChange={(e) => setEditTrainerForm({ ...editTrainerForm, email: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%', background: 'var(--bg-card)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Phone Number</label>
                  <input 
                    type="text" 
                    value={editTrainerForm.phone}
                    onChange={(e) => setEditTrainerForm({ ...editTrainerForm, phone: e.target.value })}
                    className="glass-input"
                    placeholder="+1-555-0100"
                    style={{ width: '100%', background: 'var(--bg-card)' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <input 
                    type="checkbox" 
                    id="trainer-active-toggle"
                    checked={editTrainerForm.isActive}
                    onChange={(e) => setEditTrainerForm({ ...editTrainerForm, isActive: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--powder-blue)' }}
                  />
                  <label htmlFor="trainer-active-toggle" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Active Status
                  </label>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setIsEditTrainerOpen(false)}
                    className="btn-secondary"
                    style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isLoading}
                    style={{
                      padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      background: 'var(--powder-blue)', border: 'none', color: '#121824',
                      boxShadow: '0 0 15px var(--powder-blue-glow)', opacity: isLoading ? 0.7 : 1
                    }}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}

      {/* Edit Trainee Modal */}
      {isEditTraineeOpen && selectedTrainee && createPortal(
        <div 
          onClick={() => setIsEditTraineeOpen(false)}
          className="modal-overlay"
          style={{ alignItems: 'flex-start' }}
        >
          <AnimatePresence>
            <motion.div 
              key="edit-trainee-modal"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{
                background: 'var(--bg-dropdown)', borderRadius: 20, width: '100%', maxWidth: 520,
                padding: 28, border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-card)', backdropFilter: 'var(--card-blur)'
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20, fontFamily: 'Outfit, sans-serif' }}>
                Edit Trainee Profile
              </h3>
              <form onSubmit={handleUpdateTraineeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={editTraineeForm.fullName}
                      onChange={(e) => setEditTraineeForm({ ...editTraineeForm, fullName: e.target.value })}
                      className="glass-input"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Email</label>
                    <input 
                      type="email" 
                      required
                      value={editTraineeForm.email}
                      onChange={(e) => setEditTraineeForm({ ...editTraineeForm, email: e.target.value })}
                      className="glass-input"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)' }}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Phone</label>
                    <input 
                      type="text" 
                      value={editTraineeForm.phone}
                      onChange={(e) => setEditTraineeForm({ ...editTraineeForm, phone: e.target.value })}
                      className="glass-input"
                      placeholder="+1-555-0100"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Training Status</label>
                    <CustomSelect 
                      value={editTraineeForm.status}
                      onChange={(val) => setEditTraineeForm({ ...editTraineeForm, status: val })}
                      options={[
                        { value: 'UNASSIGNED', label: 'Unassigned' },
                        { value: 'SPARK_1', label: 'Spark Phase 1' },
                        { value: 'FOUNDATION', label: 'Foundational' },
                        { value: 'SPARK_2', label: 'Spark Phase 2' },
                        { value: 'STREAM', label: 'Stream Based' },
                        { value: 'ELIMINATED', label: 'Eliminated' },
                        { value: 'COMPLETED', label: 'Completed' },
                      ]}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
 
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Foundation Lang.</label>
                  <input 
                    type="text" 
                    value={editTraineeForm.foundationLanguage}
                    onChange={(e) => setEditTraineeForm({ ...editTraineeForm, foundationLanguage: e.target.value })}
                    placeholder="e.g. Java, Python"
                    className="glass-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)' }}
                  />
                </div>
 
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Stream Specialization</label>
                  <input 
                    type="text" 
                    value={editTraineeForm.streamTraining}
                    onChange={(e) => setEditTraineeForm({ ...editTraineeForm, streamTraining: e.target.value })}
                    placeholder="e.g. Java Full Stack, C# Basics"
                    className="glass-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)' }}
                  />
                </div>

                {editTraineeForm.status === 'ELIMINATED' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Eliminated Phase</label>
                    <CustomSelect 
                      value={editTraineeForm.eliminatedPhase || ''}
                      onChange={(val) => setEditTraineeForm({ ...editTraineeForm, eliminatedPhase: val })}
                      options={[
                        { value: '', label: '-- Choose Phase --' },
                        { value: 'SPARK_1', label: 'Spark Phase 1' },
                        { value: 'FOUNDATION', label: 'Foundational' },
                        { value: 'SPARK_2', label: 'Spark Phase 2' },
                        { value: 'STREAM', label: 'Stream Based' },
                      ]}
                      style={{ width: '100%' }}
                    />
                  </motion.div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setIsEditTraineeOpen(false)}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isLoading}
                    style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      background: 'var(--pale-orange)', border: 'none', color: '#121824',
                      boxShadow: '0 0 15px var(--pale-orange-glow)', opacity: isLoading ? 0.7 : 1
                    }}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}

      {/* Toggle Trainer Active Confirmation Modal */}
      {isToggleActiveOpen && selectedTrainer && createPortal(
        <div 
          onClick={() => setIsToggleActiveOpen(false)}
          className="modal-overlay"
          style={{ alignItems: 'center' }}
        >
          <AnimatePresence>
            <motion.div 
              key="toggle-active-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{
                background: 'var(--bg-dropdown)', borderRadius: 20, width: '100%', maxWidth: 440,
                padding: 24, border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-card)', backdropFilter: 'var(--card-blur)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, 
                  background: selectedTrainer.isActive !== false ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  border: selectedTrainer.isActive !== false ? '1px solid #ef4444' : '1px solid #22c55e'
                }}>
                  <ShieldAlert size={20} color={selectedTrainer.isActive !== false ? '#ef4444' : '#22c55e'} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {selectedTrainer.isActive !== false
                      ? (selectedTrainer.role === 'COORDINATOR' || activeCategory === 'COORDINATORS' ? 'Deactivate Coordinator Account' : 'Deactivate Trainer Account')
                      : (selectedTrainer.role === 'COORDINATOR' || activeCategory === 'COORDINATORS' ? 'Reactivate Coordinator Account' : 'Reactivate Trainer Account')
                    }
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                    Are you sure you want to {selectedTrainer.isActive !== false ? 'deactivate' : 'reactivate'} the account of {selectedTrainer.role === 'COORDINATOR' || activeCategory === 'COORDINATORS' ? 'coordinator' : 'trainer'} <strong>{selectedTrainer.fullName}</strong>?
                    {selectedTrainer.isActive !== false && ' They will be marked as Inactive and their login access will be temporarily restricted.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsToggleActiveOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleToggleActiveSubmit}
                  disabled={isLoading}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: selectedTrainer.isActive !== false ? 'rgba(239, 68, 68, 0.85)' : 'rgba(34, 197, 94, 0.85)',
                    border: 'none', color: '#ffffff',
                    boxShadow: selectedTrainer.isActive !== false ? '0 0 15px rgba(239, 68, 68, 0.2)' : '0 0 15px rgba(34, 197, 94, 0.2)',
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  {isLoading ? 'Processing...' : (selectedTrainer.isActive !== false ? 'Deactivate' : 'Activate')}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}

      {/* Eliminate Trainee Confirmation Modal */}
      {isEliminateOpen && selectedTrainee && createPortal(
        <div 
          onClick={() => setIsEliminateOpen(false)}
          className="modal-overlay"
          style={{ alignItems: 'center' }}
        >
          <AnimatePresence>
            <motion.div 
              key="eliminate-trainee-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{
                background: 'var(--bg-dropdown)', borderRadius: 20, width: '100%', maxWidth: 440,
                padding: 24, border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-card)', backdropFilter: 'var(--card-blur)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  border: '1px solid #ef4444'
                }}>
                  <ShieldAlert size={20} color="#ef4444" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Eliminate Trainee
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
                    Are you sure you want to mark trainee <strong>{selectedTrainee.fullName}</strong> as <strong>ELIMINATED</strong>?
                    This will permanently flag them as eliminated from the training program cohort.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsEliminateOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEliminateSubmit}
                  disabled={isLoading}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: 'rgba(239, 68, 68, 0.85)', border: 'none', color: '#ffffff',
                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)', opacity: isLoading ? 0.7 : 1
                  }}
                >
                  {isLoading ? 'Processing...' : 'Eliminate'}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}

      {/* Add User Modal */}
      {showAddModal && createPortal(
        <div 
          className="modal-overlay" 
          style={{ alignItems: 'flex-start' }}
        >
          <div className="card card-glow-blue fade-in" style={{ width: '100%', maxWidth: 500, padding: 24, position: 'relative', background: 'var(--bg-dropdown)' }}>
            <button 
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', right: 20, top: 20, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20, fontFamily: 'Outfit, sans-serif' }}>
              Create Staff Account
            </h3>
            
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Account Role</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setAddRole('TRAINER')}
                    className={`role-select-btn role-select-btn-trainer ${addRole === 'TRAINER' ? 'active' : ''}`}
                    style={{ width: '100%' }}
                  >
                    <span>Trainer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddRole('COORDINATOR')}
                    className={`role-select-btn role-select-btn-coordinator ${addRole === 'COORDINATOR' ? 'active' : ''}`}
                    style={{ width: '100%' }}
                  >
                    <span>Coordinator</span>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Full Name</label>
                <input 
                  type="text" 
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  className="glass-input" 
                  style={{ width: '100%' }}
                  placeholder={addRole === 'TRAINER' ? "Trainer's Full Name" : "Coordinator's Full Name"}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Email Address</label>
                <input 
                  type="email" 
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="glass-input" 
                  style={{ width: '100%' }}
                  placeholder="e.g. name@maverick.com"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Phone Number (Optional)</label>
                <input 
                  type="text" 
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className="glass-input" 
                  style={{ width: '100%' }}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>
                  Create {addRole === 'TRAINER' ? 'Trainer' : 'Coordinator'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
