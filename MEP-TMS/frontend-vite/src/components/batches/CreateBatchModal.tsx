import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Search, User, Zap } from 'lucide-react';
import { useBatches } from '@/context/BatchContext';
import { useNotifications } from '@/context/NotificationContext';
import toast from 'react-hot-toast';
import api from '@/services/api';

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Trainer {
  id: string;
  fullName: string;
  email: string;
}

export default function CreateBatchModal({ isOpen, onClose }: CreateBatchModalProps) {
  const { addBatch } = useBatches();
  const { addNotification } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [batchName, setBatchName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sizeLimit, setSizeLimit] = useState<number | ''>('');
  const [topics, setTopics] = useState<string[]>(['']);
  
  // Trainer search & select states
  const [availableTrainers, setAvailableTrainers] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [trainerSearch, setTrainerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch trainers from backend
  useEffect(() => {
    if (isOpen) {
      api.get('/users/trainers', { params: { limit: 100 } })
        .then(response => {
          if (response.data && response.data.data) {
            const trainersList = response.data.data.map((t: any) => ({
              id: t.id,
              fullName: t.fullName,
              email: t.email
            }));
            setAvailableTrainers(trainersList);
          }
        })
        .catch(err => {
          console.warn('Failed to load trainers:', err);
          setAvailableTrainers([]);
        });
    }
  }, [isOpen]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleAddTopic = () => {
    setTopics([...topics, '']);
  };

  const handleTopicChange = (index: number, value: string) => {
    const newTopics = [...topics];
    newTopics[index] = value;
    setTopics(newTopics);
  };

  const handleRemoveTopic = (index: number) => {
    const newTopics = topics.filter((_, i) => i !== index);
    if (newTopics.length === 0) newTopics.push('');
    setTopics(newTopics);
  };

  const handleSelectTrainer = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setTrainerSearch('');
    setShowDropdown(false);
  };

  const handleRemoveTrainer = () => {
    setSelectedTrainer(null);
  };

  const filteredTrainers = availableTrainers.filter(t => 
    t.fullName.toLowerCase().includes(trainerSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!batchName || !startDate || !endDate) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const filteredTopics = topics.filter(t => t.trim() !== '');
    if (filteredTopics.length === 0) {
      toast.error('Please add at least one topic.');
      return;
    }

    addBatch({
      batchName,
      topics: filteredTopics,
      startDate,
      endDate,
      sizeLimit: sizeLimit === '' ? null : Number(sizeLimit),
      trainer: selectedTrainer ? selectedTrainer.fullName : undefined,
    });

    addNotification('BATCH_CREATION', `New batch "${batchName}" has been successfully planned and assigned to trainer "${selectedTrainer ? selectedTrainer.fullName : 'unassigned'}".`);
    toast.success('Batch created successfully!');
    onClose();
    
    // Reset form
    setBatchName('');
    setStartDate('');
    setEndDate('');
    setSizeLimit('');
    setTopics(['']);
    setSelectedTrainer(null);
    setTrainerSearch('');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(19, 19, 19, 0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: 20, width: '100%', maxWidth: 580,
        maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
        boxShadow: '0 10px 40px rgba(19, 19, 19, 0.12)', border: '1px solid #dbdbd9'
      }}>
        
        {/* Modal Header */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '20px 28px', borderBottom: '1px solid #dbdbd9', background: '#f9f9f8',
          borderTopLeftRadius: 20, borderTopRightRadius: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #f9a51b, #fac95a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Zap size={16} color="#131313" strokeWidth={2.5} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#131313', fontFamily: 'Outfit, sans-serif' }}>Create New Batch</h2>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'transparent', border: 'none', cursor: 'pointer', color: '#919a9f',
              width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center',
              justifyContent: 'center', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(19,19,19,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form body */}
        <form onSubmit={handleSubmit} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Batch Title */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#131313', marginBottom: 8 }}>Batch Title *</label>
            <input 
              type="text" value={batchName} onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. React Native Mobile Cohort"
              required
              style={{ 
                width: '100%', padding: '12px 16px', borderRadius: 12, 
                border: '1px solid #dbdbd9', outline: 'none', fontSize: 13.5,
                background: '#f9f9f8', color: '#131313', fontWeight: 500,
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#f9a51b'}
              onBlur={(e) => e.target.style.borderColor = '#dbdbd9'}
            />
          </div>

          {/* Dates row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#131313', marginBottom: 8 }}>Start Date *</label>
              <input 
                type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                required
                style={{ 
                  width: '100%', padding: '11px 14px', borderRadius: 12, 
                  border: '1px solid #dbdbd9', outline: 'none', fontSize: 13.5,
                  background: '#f9f9f8', color: '#131313', fontWeight: 600,
                  transition: 'border 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#f9a51b'}
                onBlur={(e) => e.target.style.borderColor = '#dbdbd9'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#131313', marginBottom: 8 }}>End Date *</label>
              <input 
                type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                required
                style={{ 
                  width: '100%', padding: '11px 14px', borderRadius: 12, 
                  border: '1px solid #dbdbd9', outline: 'none', fontSize: 13.5,
                  background: '#f9f9f8', color: '#131313', fontWeight: 600,
                  transition: 'border 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#f9a51b'}
                onBlur={(e) => e.target.style.borderColor = '#dbdbd9'}
              />
            </div>
          </div>

          {/* Batch Size Limit */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#131313', marginBottom: 8 }}>
              Batch Size Limit <span style={{ color: '#919a9f', fontWeight: 500 }}>(Leave blank for infinite)</span>
            </label>
            <input 
              type="number" value={sizeLimit} onChange={(e) => setSizeLimit(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 40" min="1"
              style={{ 
                width: '100%', padding: '12px 16px', borderRadius: 12, 
                border: '1px solid #dbdbd9', outline: 'none', fontSize: 13.5,
                background: '#f9f9f8', color: '#131313', fontWeight: 500,
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#f9a51b'}
              onBlur={(e) => e.target.style.borderColor = '#dbdbd9'}
            />
          </div>

          {/* Search-and-Select Trainer Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#131313', marginBottom: 8 }}>Assign Trainer</label>
            
            {selectedTrainer ? (
              /* Premium Selected Banner card */
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(249, 165, 27, 0.2)',
                background: 'rgba(249, 165, 27, 0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: 'rgba(249, 165, 27, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <User size={14} color="#f9a51b" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#131313' }}>{selectedTrainer.fullName}</div>
                    <div style={{ fontSize: 11, color: '#919a9f', marginTop: 1, fontWeight: 600 }}>{selectedTrainer.email}</div>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={handleRemoveTrainer}
                  style={{ 
                    border: 'none', background: 'transparent', color: '#ff6b6b', 
                    cursor: 'pointer', display: 'inline-flex', padding: 6,
                    borderRadius: 8, transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              /* Search Input */
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#919a9f" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  value={trainerSearch} 
                  onChange={(e) => {
                    setTrainerSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search and select a trainer..."
                  style={{ 
                    width: '100%', padding: '12px 16px 12px 38px', borderRadius: 12, 
                    border: '1px solid #dbdbd9', outline: 'none', fontSize: 13.5,
                    background: '#f9f9f8', color: '#131313', fontWeight: 500,
                    transition: 'border 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#f9a51b'}
                  onBlur={(e) => e.target.style.borderColor = '#dbdbd9'}
                />
              </div>
            )}

            {/* Dropdown Options Popup (Glassmorphic) */}
            {!selectedTrainer && showDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1100,
                background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(249, 165, 27, 0.2)', borderRadius: 12,
                boxShadow: '0 6px 20px rgba(19, 19, 19, 0.08)', marginTop: 6,
                maxHeight: 180, overflowY: 'auto', backdropFilter: 'blur(8px)',
                padding: '4px 0'
              }}>
                {filteredTrainers.length === 0 ? (
                  <div style={{ padding: 12, textAlign: 'center', color: '#919a9f', fontSize: 13, fontWeight: 500 }}>
                    No available trainers found
                  </div>
                ) : (
                  filteredTrainers.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => handleSelectTrainer(t)}
                      style={{
                        padding: '10px 16px', cursor: 'pointer', transition: 'background 0.2s',
                        display: 'flex', flexDirection: 'column', fontSize: 13
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(249, 165, 27, 0.08)';
                        e.currentTarget.style.color = '#f9a51b';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#131313';
                      }}
                    >
                      <span style={{ fontWeight: 700, color: 'inherit' }}>{t.fullName}</span>
                      <span style={{ fontSize: 11, color: '#919a9f', marginTop: 2 }}>{t.email}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Topics / Curriculum */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#131313', marginBottom: 8 }}>Topics / Curriculum *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topics.map((topic, index) => (
                <div key={index} style={{ display: 'flex', gap: 12 }}>
                  <input 
                    type="text" value={topic} onChange={(e) => handleTopicChange(index, e.target.value)}
                    placeholder={`Topic ${index + 1}`}
                    style={{ 
                      flex: 1, padding: '10px 16px', borderRadius: 12, 
                      border: '1px solid #dbdbd9', outline: 'none', fontSize: 13.5,
                      background: '#f9f9f8', color: '#131313', fontWeight: 500,
                      transition: 'border 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f9a51b'}
                    onBlur={(e) => e.target.style.borderColor = '#dbdbd9'}
                  />
                  <button 
                    type="button" onClick={() => handleRemoveTopic(index)}
                    style={{ 
                      padding: '0 12px', background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', 
                      border: 'none', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s' 
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,107,107,0.18)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button 
              type="button" onClick={handleAddTopic}
              style={{ 
                marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, 
                fontSize: 13, color: '#f9a51b', background: 'transparent', 
                border: 'none', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' 
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fac95a'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#f9a51b'}
            >
              <Plus size={16} strokeWidth={2.5} /> Add Another Topic
            </button>
          </div>

          {/* Modal Footer Controls */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #dbdbd9', paddingTop: 20 }}>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ 
                padding: '11px 22px', borderRadius: 12, background: 'transparent', 
                color: '#919a9f', border: '1px solid #dbdbd9', fontWeight: 700, 
                fontSize: 13.5, cursor: 'pointer', transition: 'all 0.2s' 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(19,19,19,0.03)';
                e.currentTarget.style.color = '#131313';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#919a9f';
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ 
                padding: '11px 22px', borderRadius: 12, background: '#f9a51b', 
                color: '#131313', border: 'none', fontWeight: 700, 
                fontSize: 13.5, cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(249, 165, 27, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.background = '#fac95a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = '#f9a51b';
              }}
            >
              Create Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
