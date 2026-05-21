import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Upload, Calendar as CalendarIcon, CheckCircle2, Clock, Bell, XCircle, Flame, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useSimulatedTime } from '@/context/TimeContext';
import { useBatches } from '@/context/BatchContext';

export default function AttendancePage() {
  const { user } = useAuth();
  const { simulatedTime, isTimeBetween, isTimePastOrEqual } = useSimulatedTime();
  
  // Trainer / Coordinator State
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Trainee State
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());
  const [isAttendanceMarked, setIsAttendanceMarked] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const { batches } = useBatches();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`File ${file.name} ready for upload. Template parsing will be implemented soon.`);
    }
  };

  // Trainee Logic
  const today = new Date().getDate();
  const isToday = selectedDate === today;
  const canMarkAttendance = isToday && isTimeBetween('09:00', '10:00') && !isAttendanceMarked;
  const isTooEarly = isToday && !isTimePastOrEqual('09:00');
  const isTooLate = isToday && isTimePastOrEqual('10:01') && !isAttendanceMarked;
  const showWarningAlert = isToday && simulatedTime === '09:45' && !isAttendanceMarked;
  
  // Generate 7 days for the top calendar
  const weekDays = Array.from({ length: 7 }, (_, i) => today - 3 + i);

  // Generate Heatmap Data
  const heatmapData = useMemo(() => {
    const data = [];
    const todayDate = new Date();
    
    for (let i = 89; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() - i);
      const dayOfWeek = d.getDay(); // 0 = Sunday
      
      let status = 0; // 0: None, 1: Absent, 2: Leave/Half, 3: Present, 4: Weekend
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        status = 4;
      } else if (i === 0) {
        status = isAttendanceMarked ? 3 : 0;
      } else {
        const rand = Math.random();
        if (rand > 0.10) status = 3;
        else if (rand > 0.03) status = 2;
        else status = 1;
      }
      
      data.push({
        date: d.toISOString().split('T')[0],
        formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dayOfWeek,
        status
      });
    }
    return data;
  }, [isAttendanceMarked]);

  const getHeatmapColor = (status: number) => {
    switch(status) {
      case 1: return '#ffcdd2'; // Absent
      case 2: return '#fbc531'; // Leave/Half Day
      case 3: return '#4cd137'; // Present
      case 4: return '#f5f6fa'; // Weekend
      default: return '#ebedf0'; // Empty
    }
  };

  const getStatusText = (status: number) => {
    switch(status) {
      case 1: return 'Absent';
      case 2: return 'Leave';
      case 3: return 'Present';
      case 4: return 'Weekend';
      default: return 'No Data';
    }
  };

  const firstDayOfWeek = new Date(heatmapData[0].date).getDay();
  const emptyPrefixCells = Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} style={{ width: 14, height: 14 }} />);

  const handleMarkAttendance = () => {
    if (canMarkAttendance) {
      setIsAttendanceMarked(true);
      toast.success('Attendance recorded successfully!');
    }
  };

  if (user?.role === 'TRAINEE') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2d3436' }}>My Attendance</h1>
          <p style={{ fontSize: 14, color: '#b2bec3', marginTop: 4 }}>Mark your daily attendance here between 9:00 AM and 10:00 AM.</p>
        </div>

        {showWarningAlert && (
          <div style={{ 
            background: '#fff3e0', border: '1px solid #ffb74d', padding: '16px 20px', 
            borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 
          }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ffe0b2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={20} color="#e65100" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#e65100' }}>Trainer Alert: Attendance Closing Soon!</p>
              <p style={{ fontSize: 14, color: '#ef6c00', marginTop: 4 }}>It is 9:45 AM. You have 15 minutes left to mark your attendance for today. Please click the button below.</p>
            </div>
          </div>
        )}

        {isTooLate && (
          <div style={{ 
            background: '#ffebee', border: '1px solid #ef9a9a', padding: '16px 20px', 
            borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 
          }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ffcdd2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={20} color="#c62828" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#c62828' }}>Attendance Closed</p>
              <p style={{ fontSize: 14, color: '#d32f2f', marginTop: 4 }}>The 9:00 AM - 10:00 AM window has closed. You have been marked absent for today.</p>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Calendar Widget */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarIcon size={20} color="#5b5fc7" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d3436' }}>Weekly Calendar</h3>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#636e72' }}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
            
            {/* Week View */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
              {weekDays.map((day) => {
                const isSelected = day === selectedDate;
                const isPast = day < today;
                const isTodayDot = day === today;
                
                return (
                  <motion.div 
                    whileHover={{ y: -4 }}
                    key={day}
                    onClick={() => setSelectedDate(day)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      padding: '12px 16px', borderRadius: 16, cursor: 'pointer',
                      background: isSelected ? 'linear-gradient(135deg, #5b5fc7, #3b3e99)' : '#f8f9fa',
                      color: isSelected ? '#fff' : '#2d3436',
                      boxShadow: isSelected ? '0 8px 16px rgba(91, 95, 199, 0.25)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, opacity: isSelected ? 0.9 : 0.5, textTransform: 'uppercase' }}>Day</span>
                    <span style={{ fontSize: 20, fontWeight: 800 }}>{day}</span>
                    <div style={{ 
                      width: 6, height: 6, borderRadius: '50%', 
                      background: isSelected ? '#fff' : (isPast ? '#4cd137' : (isTodayDot ? '#fbc531' : '#dfe6e9')),
                      marginTop: 4
                    }} />
                  </motion.div>
                );
              })}
            </div>

            {/* Action Area */}
            <div style={{ 
              marginTop: 'auto', padding: 24, borderRadius: 16, 
              background: isAttendanceMarked ? '#e8f5e9' : '#f8f9fa',
              border: `1px dashed ${isAttendanceMarked ? '#81c784' : '#cfd8dc'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
            }}>
              {!isToday ? (
                <p style={{ color: '#636e72', fontSize: 15 }}>You can only mark attendance for the current day.</p>
              ) : isAttendanceMarked ? (
                <>
                  <CheckCircle2 size={32} color="#4caf50" style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#2e7d32' }}>Attendance Recorded</p>
                  <p style={{ fontSize: 13, color: '#388e3c', marginTop: 4 }}>You are marked present for today. This will reflect in your excel records.</p>
                </>
              ) : (
                <>
                  <Clock size={32} color={canMarkAttendance ? '#5b5fc7' : '#90a4ae'} style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#2d3436' }}>Today's Attendance</p>
                  
                  {isTooEarly && <p style={{ fontSize: 13, color: '#f57c00', marginTop: 4 }}>Attendance opens at 09:00 AM.</p>}
                  {isTooLate && <p style={{ fontSize: 13, color: '#c62828', marginTop: 4 }}>Window closed at 10:00 AM.</p>}
                  {canMarkAttendance && <p style={{ fontSize: 13, color: '#5b5fc7', marginTop: 4 }}>Window is open. Please mark your attendance.</p>}

                  <button 
                    onClick={handleMarkAttendance}
                    disabled={!canMarkAttendance}
                    style={{
                      marginTop: 16, padding: '12px 32px', borderRadius: 12, fontSize: 15, fontWeight: 600,
                      background: canMarkAttendance ? '#5b5fc7' : '#e0e0e0',
                      color: canMarkAttendance ? '#fff' : '#9e9e9e',
                      border: 'none', cursor: canMarkAttendance ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s', boxShadow: canMarkAttendance ? '0 4px 12px rgba(91, 95, 199, 0.3)' : 'none'
                    }}
                  >
                    Hit Attendance
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(249, 165, 27, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame size={28} color="#f9a51b" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#919a9f', textTransform: 'uppercase' }}>Current Streak</p>
                <h3 style={{ fontSize: 28, fontWeight: 800, color: '#131313' }}>14 Days</h3>
              </div>
            </div>
            <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(76, 209, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={28} color="#4cd137" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#919a9f', textTransform: 'uppercase' }}>Longest Streak</p>
                <h3 style={{ fontSize: 28, fontWeight: 800, color: '#131313' }}>22 Days</h3>
              </div>
            </div>
            <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(91, 95, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={28} color="#5b5fc7" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#919a9f', textTransform: 'uppercase' }}>Overall Attendance</p>
                <h3 style={{ fontSize: 28, fontWeight: 800, color: '#131313' }}>94%</h3>
              </div>
            </div>
          </div>
        </div>

        {/* LeetCode Heatmap */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d3436', marginBottom: 16 }}>Attendance Consistency (Last 90 Days)</h3>
          
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 14px)', gap: 4, marginTop: 18 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <span key={d} style={{ fontSize: 10, color: '#b2bec3', lineHeight: '14px', height: 14 }}>{i % 2 === 0 ? d : ''}</span>
              ))}
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 14px)', gridAutoFlow: 'column', gap: 4 }}>
                {emptyPrefixCells}
                {heatmapData.map((d, i) => (
                  <div
                    key={d.date}
                    onMouseEnter={() => setHoveredDate(d.date)}
                    onMouseLeave={() => setHoveredDate(null)}
                    style={{
                      width: 14, height: 14, borderRadius: 3, cursor: 'pointer',
                      background: getHeatmapColor(d.status),
                      transition: 'transform 0.1s',
                      transform: hoveredDate === d.date ? 'scale(1.2)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>

              {hoveredDate && (
                <div style={{
                  position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
                  background: '#131313', color: '#fff', padding: '6px 10px', borderRadius: 6,
                  fontSize: 12, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10
                }}>
                  {heatmapData.find(d => d.date === hoveredDate)?.formattedDate} : {' '}
                  <span style={{ color: getHeatmapColor(heatmapData.find(d => d.date === hoveredDate)?.status || 0) }}>
                    {getStatusText(heatmapData.find(d => d.date === hoveredDate)?.status || 0)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <span style={{ fontSize: 11, color: '#919a9f', fontWeight: 600 }}>Less</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2, 3].map(status => (
                <div key={status} style={{ width: 12, height: 12, borderRadius: 2, background: getHeatmapColor(status === 0 ? 0 : status === 1 ? 2 : status === 2 ? 3 : 3) }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: '#919a9f', fontWeight: 600 }}>More</span>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === 'COORDINATOR') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2d3436' }}>Attendance Overview</h1>
          <p style={{ fontSize: 14, color: '#b2bec3', marginTop: 4 }}>View attendance records for all batches and trainees.</p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 8 }}>Select Batch</label>
              <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e0e0e0',
                  outline: 'none', fontSize: 14, color: '#2d3436', background: '#fafffe', transition: 'border 0.2s'
                }}>
                <option value="">-- Choose Batch to View --</option>
                {batches.map(b => <option key={b._id} value={b.batchId}>{b.batchName}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 8 }}>Date Filter</label>
              <div style={{ position: 'relative' }}>
                <CalendarIcon size={18} color="#b2bec3" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid #e0e0e0',
                    outline: 'none', fontSize: 14, color: '#2d3436', background: '#fafffe', transition: 'border 0.2s'
                  }} />
              </div>
            </div>
          </div>

          {!selectedBatch ? (
             <div style={{ padding: '60px 0', textAlign: 'center', color: '#b2bec3', fontSize: 15 }}>
               Please select a batch to view trainee attendance records.
             </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#b2bec3', fontWeight: 600 }}>Trainee Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#b2bec3', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#b2bec3', fontWeight: 600 }}>Check-in Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} style={{ padding: '40px 0', textAlign: 'center', color: '#b2bec3', fontSize: 14 }}>
                      No attendance data available for this date.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin / Trainer Logic
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2d3436' }}>Attendance Tracking</h1>
        <p style={{ fontSize: 14, color: '#b2bec3', marginTop: 4 }}>Upload daily attendance for your batches (Cutoff: 10:00 AM)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 8 }}>Select Batch</label>
                <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e0e0e0',
                    outline: 'none', fontSize: 14, color: '#2d3436', background: '#fafffe', transition: 'border 0.2s'
                  }}>
                  <option value="">-- Choose Batch --</option>
                  {batches.map(b => <option key={b._id} value={b.batchId}>{b.batchName}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#2d3436', marginBottom: 8 }}>Date</label>
                <div style={{ position: 'relative' }}>
                  <CalendarIcon size={18} color="#b2bec3" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid #e0e0e0',
                      outline: 'none', fontSize: 14, color: '#2d3436', background: '#fafffe', transition: 'border 0.2s'
                    }} />
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ padding: 20, borderRadius: 16, background: '#e3f2fd', border: '1px solid #bbdefb' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Clock size={20} color="#42a5f5" style={{ marginTop: 2 }} />
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1565c0' }}>Daily Cutoff</h4>
                <p style={{ fontSize: 13, color: '#1e88e5', marginTop: 4, lineHeight: 1.5 }}>Please ensure attendance is marked before 10:00 AM daily to avoid alerts to the Coordinator.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card" style={{ height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(91,95,199,0.03), rgba(102,187,106,0.03))', pointerEvents: 'none' }} />
            
            <motion.div whileHover={{ scale: 1.05 }} style={{ width: 80, height: 80, borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Upload size={32} color="#66bb6a" />
            </motion.div>
            
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2d3436', marginBottom: 8 }}>Upload Attendance</h3>
            <p style={{ fontSize: 14, color: '#636e72', maxWidth: 300, marginBottom: 32, lineHeight: 1.5 }}>
              Select an Excel file containing the daily attendance. The system expects the file to match the predefined template.
            </p>

            <label style={{
              position: 'relative', cursor: !selectedBatch ? 'not-allowed' : 'pointer',
              background: !selectedBatch ? '#e0e0e0' : 'linear-gradient(135deg, #66bb6a, #4caf50)',
              color: !selectedBatch ? '#9e9e9e' : '#fff', padding: '14px 28px', borderRadius: 12,
              fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: !selectedBatch ? 'none' : '0 4px 16px rgba(102,187,106,0.3)', transition: 'transform 0.15s'
            }}>
              <input type="file" accept=".xlsx,.xls,.csv" style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }} onChange={handleFileUpload} disabled={!selectedBatch} />
              <CheckCircle2 size={20} />
              Select Excel File
            </label>
            {!selectedBatch && <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 16, fontWeight: 500 }}>Please select a batch first</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
