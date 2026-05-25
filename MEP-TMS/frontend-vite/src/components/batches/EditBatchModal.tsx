import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Search, User, Edit3, Calendar, BookOpen, Sliders, AlertCircle } from 'lucide-react';
import { useBatches, Batch } from '@/context/BatchContext';
import { useNotifications } from '@/context/NotificationContext';
import toast from 'react-hot-toast';
import api from '@/services/api';

interface EditBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch | null;
}

export interface TopicInput {
  name: string;
  subtopics: string[];
}

interface Trainer {
  id: string;
  fullName: string;
  email: string;
}

export default function EditBatchModal({ isOpen, onClose, batch }: EditBatchModalProps) {
  const { updateBatch } = useBatches();
  const { addNotification } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [batchName, setBatchName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sizeLimit, setSizeLimit] = useState<number | ''>('');
  const [topics, setTopics] = useState<TopicInput[]>([{ name: '', subtopics: [''] }]);
  
  // Trainer search & select states
  const [availableTrainers, setAvailableTrainers] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [trainerSearch, setTrainerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch trainers from backend & populate data on open
  useEffect(() => {
    if (isOpen && batch) {
      // Set simple fields
      setBatchName(batch.batchName);
      setStartDate(batch.startDate);
      setEndDate(batch.endDate);
      setSizeLimit(batch.sizeLimit === null ? '' : batch.sizeLimit);
      
      // Parse serialized topics back into name & subtopics
      if (batch.topics && batch.topics.length > 0) {
        const parsed = batch.topics.map(topicStr => {
          const colonIndex = topicStr.indexOf(':');
          if (colonIndex !== -1) {
            const name = topicStr.substring(0, colonIndex).trim();
            const subtopicsStr = topicStr.substring(colonIndex + 1).trim();
            const subtopics = subtopicsStr.split(',').map(s => s.trim()).filter(s => s !== '');
            return { name, subtopics: subtopics.length > 0 ? subtopics : [''] };
          }
          return { name: topicStr.trim(), subtopics: [''] };
        });
        setTopics(parsed);
      } else {
        setTopics([{ name: '', subtopics: [''] }]);
      }
      
      // Load trainers
      api.get('/users/trainers', { params: { limit: 100 } })
        .then(response => {
          if (response.data && response.data.data) {
            const trainersList = response.data.data.map((t: any) => ({
              id: t.id,
              fullName: t.fullName,
              email: t.email
            }));
            setAvailableTrainers(trainersList);
            
            // Try to pre-select current trainer
            if (batch.trainer) {
              const currentTrainer = trainersList.find((t: Trainer) => t.fullName === batch.trainer);
              if (currentTrainer) {
                setSelectedTrainer(currentTrainer);
              } else {
                setSelectedTrainer({
                  id: 'existing',
                  fullName: batch.trainer,
                  email: ''
                });
              }
            } else {
              setSelectedTrainer(null);
            }
          }
        })
        .catch(err => {
          console.warn('Failed to load trainers:', err);
          setAvailableTrainers([]);
        });
    }
  }, [isOpen, batch]);

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

  if (!isOpen || !batch) return null;

  const handleAddTopic = () => {
    setTopics([...topics, { name: '', subtopics: [''] }]);
  };

  const handleTopicNameChange = (index: number, value: string) => {
    const newTopics = [...topics];
    newTopics[index].name = value;
    setTopics(newTopics);
  };

  const handleRemoveTopic = (index: number) => {
    const newTopics = topics.filter((_, i) => i !== index);
    if (newTopics.length === 0) {
      setTopics([{ name: '', subtopics: [''] }]);
    } else {
      setTopics(newTopics);
    }
  };

  const handleAddSubtopic = (topicIndex: number) => {
    const newTopics = [...topics];
    newTopics[topicIndex].subtopics.push('');
    setTopics(newTopics);
  };

  const handleSubtopicChange = (topicIndex: number, subtopicIndex: number, value: string) => {
    const newTopics = [...topics];
    newTopics[topicIndex].subtopics[subtopicIndex] = value;
    setTopics(newTopics);
  };

  const handleRemoveSubtopic = (topicIndex: number, subtopicIndex: number) => {
    const newTopics = [...topics];
    newTopics[topicIndex].subtopics = newTopics[topicIndex].subtopics.filter((_, i) => i !== subtopicIndex);
    if (newTopics[topicIndex].subtopics.length === 0) {
      newTopics[topicIndex].subtopics.push('');
    }
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

    const serializedTopics = topics
      .filter(t => t.name.trim() !== '')
      .map(t => {
        const subs = t.subtopics.filter(s => s.trim() !== '');
        return subs.length > 0 ? `${t.name.trim()}: ${subs.join(', ')}` : t.name.trim();
      });

    if (serializedTopics.length === 0) {
      toast.error('Please add at least one topic.');
      return;
    }

    updateBatch(batch._id, {
      batchName,
      topics: serializedTopics,
      startDate,
      endDate,
      sizeLimit: sizeLimit === '' ? null : Number(sizeLimit),
      trainer: selectedTrainer ? selectedTrainer.fullName : undefined,
    });

    addNotification('BATCH_UPDATE', `Batch "${batchName}" details have been updated.`);
    onClose();
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 1000,
      backdropFilter: 'blur(10px)', overflowY: 'auto', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '40px 24px'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 1100,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)', border: '1px solid #e2e8f0',
        position: 'relative', overflow: 'hidden', fontFamily: 'Outfit, sans-serif'
      }}>
        
        {/* Modal Header */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '24px 32px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)'
            }}>
              <Edit3 size={18} color="#ffffff" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: 0 }}>Configure Cohort</h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0', fontWeight: 500 }}>Update batch details, curriculum mapping, and trainer assignment</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'transparent', cursor: 'pointer', color: '#94a3b8',
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center',
              justifyContent: 'center', transition: 'all 0.2s', border: '1px solid #e2e8f0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1.1fr 1.9fr', 
            gap: 40, 
            padding: '32px',
            maxHeight: 'calc(80vh - 180px)',
            overflowY: 'auto',
            background: '#ffffff'
          }}>
            
            {/* Left Column: General Configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, borderRight: '1px solid #f1f5f9', paddingRight: 32 }}>
              
              <div style={{
                fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex',
                alignItems: 'center', gap: 8, letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: 10
              }}>
                <Sliders size={16} color="#0ea5e9" strokeWidth={2.5} />
                <span>GENERAL SETTINGS</span>
              </div>

              {/* Batch Title */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Batch Title *</label>
                <input 
                  type="text" value={batchName} onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g. React Native Mobile Cohort"
                  required
                  style={{ 
                    width: '100%', padding: '12px 16px', borderRadius: 12, 
                    border: '1px solid #cbd5e1', outline: 'none', fontSize: 13.5,
                    background: '#f8fafc', color: '#0f172a', fontWeight: 500,
                    transition: 'all 0.15s ease-in-out'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0ea5e9';
                    e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Start Date */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} color="#64748b" /> Start Date *
                  </span>
                </label>
                <input 
                  type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  required
                  style={{ 
                    width: '100%', padding: '11px 14px', borderRadius: 12, 
                    border: '1px solid #cbd5e1', outline: 'none', fontSize: 13.5,
                    background: '#f8fafc', color: '#0f172a', fontWeight: 600,
                    transition: 'all 0.15s ease-in-out'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0ea5e9';
                    e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* End Date */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} color="#64748b" /> End Date *
                  </span>
                </label>
                <input 
                  type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  required
                  style={{ 
                    width: '100%', padding: '11px 14px', borderRadius: 12, 
                    border: '1px solid #cbd5e1', outline: 'none', fontSize: 13.5,
                    background: '#f8fafc', color: '#0f172a', fontWeight: 600,
                    transition: 'all 0.15s ease-in-out'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0ea5e9';
                    e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Batch Size Limit */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Batch Size Limit <span style={{ color: '#94a3b8', fontWeight: 500, textTransform: 'none' }}>(optional)</span>
                </label>
                <input 
                  type="number" value={sizeLimit} onChange={(e) => setSizeLimit(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 40 (leave blank for unlimited)" min="1"
                  style={{ 
                    width: '100%', padding: '12px 16px', borderRadius: 12, 
                    border: '1px solid #cbd5e1', outline: 'none', fontSize: 13.5,
                    background: '#f8fafc', color: '#0f172a', fontWeight: 500,
                    transition: 'all 0.15s ease-in-out'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0ea5e9';
                    e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Search-and-Select Trainer */}
              <div ref={dropdownRef} style={{ position: 'relative', paddingBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Assign Trainer</label>
                
                {selectedTrainer ? (
                  /* Selected Trainer Card */
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(14, 165, 233, 0.25)',
                    background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.05), rgba(37, 99, 235, 0.02))',
                    boxShadow: '0 2px 6px rgba(14, 165, 233, 0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(14, 165, 233, 0.2)'
                      }}>
                        <User size={16} color="#ffffff" strokeWidth={2.5} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{selectedTrainer.fullName}</div>
                        {selectedTrainer.email && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: 500 }}>{selectedTrainer.email}</div>}
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleRemoveTrainer}
                      style={{ 
                        border: 'none', background: 'transparent', color: '#ef4444', 
                        cursor: 'pointer', display: 'inline-flex', padding: 8,
                        borderRadius: 10, transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fef2f2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  /* Search Input */
                  <div style={{ position: 'relative' }}>
                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text" 
                      value={trainerSearch} 
                      onChange={(e) => {
                        setTrainerSearch(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={(e) => {
                        setShowDropdown(true);
                        e.target.style.borderColor = '#0ea5e9';
                        e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                      }}
                      placeholder="Search and select trainer..."
                      style={{ 
                        width: '100%', padding: '12px 16px 12px 38px', borderRadius: 12, 
                        border: '1px solid #cbd5e1', outline: 'none', fontSize: 13.5,
                        background: '#f8fafc', color: '#0f172a', fontWeight: 500,
                        transition: 'all 0.15s ease-in-out'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#cbd5e1';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Dropdown Options Popup */}
                {!selectedTrainer && showDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1100,
                    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14,
                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)', 
                    marginTop: 6, maxHeight: 180, overflowY: 'auto', padding: 6
                  }}>
                    {filteredTrainers.length === 0 ? (
                      <div style={{ padding: 12, textAlign: 'center', color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                        No trainers found matching "{trainerSearch}"
                      </div>
                    ) : (
                      filteredTrainers.map(t => (
                        <div 
                          key={t.id}
                          onClick={() => handleSelectTrainer(t)}
                          style={{
                            padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s',
                            display: 'flex', flexDirection: 'column', fontSize: 13,
                            borderRadius: 8
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.color = '#0ea5e9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#0f172a';
                          }}
                        >
                          <span style={{ fontWeight: 700, color: 'inherit' }}>{t.fullName}</span>
                          <span style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{t.email}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Curriculum Configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              <div style={{
                fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'flex',
                alignItems: 'center', gap: 8, letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: 10
              }}>
                <BookOpen size={16} color="#0ea5e9" strokeWidth={2.5} />
                <span>CURRICULUM SCHEMA & TOPICS</span>
              </div>

              {/* Topics Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {topics.map((topic, topicIdx) => (
                  <div 
                    key={topicIdx} 
                    style={{ 
                      border: '1px solid #e2e8f0', 
                      borderRadius: 16, 
                      padding: 20, 
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                      boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.02), 0 2px 4px -2px rgba(15, 23, 42, 0.02)',
                      borderLeft: '4px solid #0ea5e9',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                          Topic Group {topicIdx + 1} Name
                        </label>
                        <input 
                          type="text" 
                          value={topic.name} 
                          onChange={(e) => handleTopicNameChange(topicIdx, e.target.value)}
                          placeholder="e.g. Core Fundamentals"
                          required
                          style={{ 
                            width: '100%', padding: '11px 14px', borderRadius: 10, 
                            border: '1px solid #cbd5e1', outline: 'none', fontSize: 13.5,
                            background: '#f8fafc', color: '#0f172a', fontWeight: 700,
                            transition: 'all 0.15s ease-in-out'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#0ea5e9';
                            e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#cbd5e1';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      
                      {topics.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTopic(topicIdx)}
                          style={{ 
                            padding: 10, background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', 
                            border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                            marginTop: 18
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Subtopics Section */}
                    <div style={{ 
                      marginLeft: 14, 
                      borderLeft: '2px dashed #e2e8f0', 
                      paddingLeft: 20, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 10 
                    }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subtopics</label>
                      
                      {topic.subtopics.map((subtopic, subIdx) => (
                        <div key={subIdx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <input 
                            type="text" 
                            value={subtopic} 
                            onChange={(e) => handleSubtopicChange(topicIdx, subIdx, e.target.value)}
                            placeholder={`Add Subtopic ${subIdx + 1}`}
                            style={{ 
                              flex: 1, padding: '8px 12px', borderRadius: 8, 
                              border: '1px solid #e2e8f0', outline: 'none', fontSize: 13,
                              background: '#f8fafc', color: '#0f172a', fontWeight: 500,
                              transition: 'all 0.15s ease-in-out'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#0ea5e9';
                              e.target.style.boxShadow = '0 0 0 2px rgba(14, 165, 233, 0.08)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = '#e2e8f0';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                          {topic.subtopics.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveSubtopic(topicIdx, subIdx)}
                              style={{ 
                                padding: 6, background: 'transparent', color: '#94a3b8', 
                                border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s' 
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ef4444';
                                e.currentTarget.style.background = '#fef2f2';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#94a3b8';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      <button 
                        type="button" 
                        onClick={() => handleAddSubtopic(topicIdx)}
                        style={{ 
                          alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, 
                          fontSize: 12.5, color: '#0ea5e9', background: 'transparent', 
                          border: 'none', cursor: 'pointer', fontWeight: 700, marginTop: 4, transition: 'all 0.2s' 
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#0ea5e9'}
                      >
                        <Plus size={14} strokeWidth={2.5} /> Add Subtopic
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                type="button" 
                onClick={handleAddTopic}
                style={{ 
                  marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, 
                  padding: '12px 20px', borderRadius: 14, border: '2px dashed #e2e8f0',
                  fontSize: 13.5, color: '#64748b', background: '#f8fafc', 
                  cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#0ea5e9';
                  e.currentTarget.style.borderColor = '#0ea5e9';
                  e.currentTarget.style.background = 'rgba(14, 165, 233, 0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = '#f8fafc';
                }}
              >
                <Plus size={16} strokeWidth={2.5} /> Add Another Topic Group
              </button>
            </div>

          </div>

          {/* Modal Footer Controls */}
          <div style={{ 
            display: 'flex', justifyContent: 'flex-end', gap: 14, 
            borderTop: '1px solid #e2e8f0', padding: '24px 32px', 
            background: '#f8fafc', borderBottomLeftRadius: 24, borderBottomRightRadius: 24
          }}>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ 
                padding: '11px 24px', borderRadius: 12, background: 'transparent', 
                color: '#64748b', border: '1px solid #cbd5e1', fontWeight: 700, 
                fontSize: 13.5, cursor: 'pointer', transition: 'all 0.2s' 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={{ 
                padding: '11px 26px', borderRadius: 12, 
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', 
                color: '#ffffff', border: 'none', fontWeight: 700, 
                fontSize: 13.5, cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(14, 165, 233, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.3)';
              }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
