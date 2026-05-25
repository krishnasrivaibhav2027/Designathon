import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Calendar as CalendarIcon, CheckCircle2, Clock, Bell, XCircle, Flame, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useSimulatedTime } from '@/context/TimeContext';
import { useBatches } from '@/context/BatchContext';
import api from '@/services/api';

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
  const [candidate, setCandidate] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingTrainee, setLoadingTrainee] = useState(true);

  const fetchTraineeAttendance = async () => {
    try {
      setLoadingTrainee(true);
      const candRes = await api.get('/users/me/candidate');
      if (candRes.data) {
        setCandidate(candRes.data);
        const candId = candRes.data.id || candRes.data._id;
        if (candId) {
          const attRes = await api.get(`/attendance/candidate/${candId}`);
          setAttendanceRecords(attRes.data || []);
          
          // Check if attendance is already marked for today
          const todayStr = new Date().toISOString().split('T')[0];
          const todayMarked = (attRes.data || []).some((rec: any) => {
            const recDateStr = new Date(rec.date).toISOString().split('T')[0];
            return recDateStr === todayStr && rec.status === 'PRESENT';
          });
          setIsAttendanceMarked(todayMarked);
        }
      }
    } catch (err) {
      console.error('Failed to load trainee attendance data:', err);
    } finally {
      setLoadingTrainee(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'TRAINEE') {
      fetchTraineeAttendance();
    }
  }, [user]);

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
      const dateStr = d.toISOString().split('T')[0];
      
      let status = 0; // 0: None, 1: Absent, 2: Leave/Half, 3: Present, 4: Weekend
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        status = 4;
      } else {
        const match = attendanceRecords.find(rec => {
          const recDateStr = new Date(rec.date).toISOString().split('T')[0];
          return recDateStr === dateStr;
        });

        if (match) {
          if (match.status === 'PRESENT') status = 3;
          else if (match.status === 'LEAVE') status = 2;
          else if (match.status === 'ABSENT') status = 1;
        } else {
          const compDate = new Date(d);
          compDate.setHours(0, 0, 0, 0);
          const compToday = new Date();
          compToday.setHours(0, 0, 0, 0);
          
          if (compDate.getTime() < compToday.getTime()) {
            status = 1; // Absent if past date and not marked
          } else if (compDate.getTime() === compToday.getTime()) {
            status = isAttendanceMarked ? 3 : 0;
          } else {
            status = 0; // Future date
          }
        }
      }
      
      data.push({
        date: dateStr,
        formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dayOfWeek,
        status
      });
    }
    return data;
  }, [isAttendanceMarked, attendanceRecords]);

  // Compute Stats from database
  const stats = useMemo(() => {
    const activeRecords = attendanceRecords.filter(rec => ['PRESENT', 'ABSENT', 'LEAVE'].includes(rec.status));
    const presentCount = activeRecords.filter(rec => rec.status === 'PRESENT').length;
    const leaveCount = activeRecords.filter(rec => rec.status === 'LEAVE').length;
    const absentCount = activeRecords.filter(rec => rec.status === 'ABSENT').length;
    
    const totalDays = presentCount + absentCount + leaveCount;
    const overallPct = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 100;
    
    const sortedPresentDates = attendanceRecords
      .filter(rec => rec.status === 'PRESENT')
      .map(rec => new Date(rec.date).toISOString().split('T')[0])
      .sort();
      
    const uniqueDates = Array.from(new Set(sortedPresentDates));
    
    let longestStreak = 0;
    let currentStreak = 0;
    
    if (uniqueDates.length > 0) {
      let tempStreak = 0;
      const dateObjects = uniqueDates.map(d => new Date(d));
      
      const areConsecutiveWorkDays = (d1: Date, d2: Date) => {
        const timeDiff = d2.getTime() - d1.getTime();
        const dayDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) return true;
        if (d1.getDay() === 5 && d2.getDay() === 1 && dayDiff === 3) return true;
        return false;
      };
      
      for (let i = 0; i < dateObjects.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          if (areConsecutiveWorkDays(dateObjects[i - 1], dateObjects[i])) {
            tempStreak++;
          } else {
            if (tempStreak > longestStreak) {
              longestStreak = tempStreak;
            }
            tempStreak = 1;
          }
        }
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      
      const mostRecent = dateObjects[dateObjects.length - 1];
      const todayDate = new Date();
      todayDate.setHours(0,0,0,0);
      mostRecent.setHours(0,0,0,0);
      
      const diffFromToday = Math.round((todayDate.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
      
      let isStreakActive = false;
      if (diffFromToday === 0 || diffFromToday === 1 || (todayDate.getDay() === 1 && mostRecent.getDay() === 5 && diffFromToday <= 3)) {
        isStreakActive = true;
      }
      
      if (isStreakActive) {
        let streak = 1;
        for (let i = dateObjects.length - 1; i > 0; i--) {
          if (areConsecutiveWorkDays(dateObjects[i - 1], dateObjects[i])) {
            streak++;
          } else {
            break;
          }
        }
        currentStreak = streak;
      } else {
        currentStreak = 0;
      }
    }
    
    return { overallPct, currentStreak, longestStreak };
  }, [attendanceRecords]);

  const getHeatmapColor = (status: number) => {
    switch(status) {
      case 1: return '#ff6b6b'; // Absent (Danger color)
      case 2: return 'var(--yellow)'; // Leave/Half Day
      case 3: return 'var(--powder-blue)'; // Present
      case 4: return 'var(--bg-main)'; // Weekend
      default: return 'var(--border-color)'; // Empty
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

  const handleMarkAttendance = async () => {
    if (canMarkAttendance && candidate) {
      try {
        const payload = {
          batchId: candidate.batchId,
          candidateId: candidate.id || candidate._id,
          date: new Date().toISOString(),
          status: 'PRESENT'
        };
        await api.post('/attendance/mark', payload);
        setIsAttendanceMarked(true);
        toast.success('Attendance recorded successfully!');
        fetchTraineeAttendance();
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.detail || 'Failed to record attendance.');
      }
    }
  };

  if (user?.role === 'TRAINEE') {
    if (loadingTrainee) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 600 }}>Loading attendance metrics...</p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto' }} className="fade-in">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>My Attendance</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Mark your daily attendance here between 9:00 AM and 10:00 AM.</p>
        </div>

        {showWarningAlert && (
          <div style={{ 
            background: 'var(--pale-orange-glow)', border: '1px solid var(--pale-orange)', padding: '16px 20px', 
            borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: '0 4px 12px var(--pale-orange-glow)'
          }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--pale-orange)' }}>
              <Bell size={20} color="var(--pale-orange)" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Trainer Alert: Attendance Closing Soon!</p>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>It is 9:45 AM. You have 15 minutes left to mark your attendance for today. Please click the button below.</p>
            </div>
          </div>
        )}

        {isTooLate && (
          <div style={{ 
            background: 'rgba(255, 107, 107, 0.1)', border: '1px solid #ff6b6b', padding: '16px 20px', 
            borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: '0 4px 12px rgba(255, 107, 107, 0.15)'
          }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ff6b6b' }}>
              <XCircle size={20} color="#ff6b6b" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Attendance Closed</p>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>The 9:00 AM - 10:00 AM window has closed. You have been marked absent for today.</p>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Calendar Widget */}
          <div className="card card-glow-blue" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarIcon size={20} color="var(--powder-blue)" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Weekly Calendar</h3>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
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
                      background: isSelected ? 'linear-gradient(135deg, var(--powder-blue), var(--pale-orange))' : 'var(--bg-main)',
                      color: isSelected ? '#121824' : 'var(--text-primary)',
                      border: isSelected ? 'none' : '1px solid var(--border-color)',
                      boxShadow: isSelected ? '0 8px 16px var(--pale-orange-glow)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, opacity: isSelected ? 0.9 : 0.5, textTransform: 'uppercase' }}>Day</span>
                    <span style={{ fontSize: 20, fontWeight: 800 }}>{day}</span>
                    <div style={{ 
                      width: 6, height: 6, borderRadius: '50%', 
                      background: isSelected ? '#121824' : (isPast ? 'var(--powder-blue)' : (isTodayDot ? 'var(--yellow)' : 'var(--border-color)')),
                      marginTop: 4
                    }} />
                  </motion.div>
                );
              })}
            </div>

            {/* Action Area */}
            <div style={{ 
              marginTop: 'auto', padding: 24, borderRadius: 16, 
              background: isAttendanceMarked ? 'var(--powder-blue-glow)' : 'var(--bg-main)',
              border: `1px dashed ${isAttendanceMarked ? 'var(--powder-blue)' : 'var(--border-color)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
            }}>
              {!isToday ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>You can only mark attendance for the current day.</p>
              ) : isAttendanceMarked ? (
                <>
                  <CheckCircle2 size={32} color="var(--powder-blue)" style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Attendance Recorded</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>You are marked present for today. This will reflect in your excel records.</p>
                </>
              ) : (
                <>
                  <Clock size={32} color={canMarkAttendance ? 'var(--powder-blue)' : 'var(--text-muted)'} style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Today's Attendance</p>
                  
                  {isTooEarly && <p style={{ fontSize: 13, color: 'var(--pale-orange)', marginTop: 4, fontWeight: 700 }}>Attendance opens at 09:00 AM.</p>}
                  {isTooLate && <p style={{ fontSize: 13, color: '#ff6b6b', marginTop: 4, fontWeight: 700 }}>Window closed at 10:00 AM.</p>}
                  {canMarkAttendance && <p style={{ fontSize: 13, color: 'var(--powder-blue)', marginTop: 4, fontWeight: 700 }}>Window is open. Please mark your attendance.</p>}

                  <button 
                    onClick={handleMarkAttendance}
                    disabled={!canMarkAttendance}
                    className={canMarkAttendance ? "btn-primary" : ""}
                    style={{
                      marginTop: 16, padding: '12px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700,
                      background: canMarkAttendance ? 'linear-gradient(135deg, var(--pale-orange), var(--yellow))' : 'var(--border-color)',
                      color: canMarkAttendance ? '#121824' : 'var(--text-muted)',
                      border: 'none', cursor: canMarkAttendance ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s', 
                      boxShadow: canMarkAttendance ? '0 4px 12px var(--pale-orange-glow)' : 'none'
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
            <div className="card card-glow-orange" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--pale-orange-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--pale-orange)' }}>
                <Flame size={28} color="var(--pale-orange)" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Streak</p>
                <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{stats.currentStreak} {stats.currentStreak === 1 ? 'Day' : 'Days'}</h3>
              </div>
            </div>
            
            <div className="card card-glow-yellow" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--yellow-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--yellow)' }}>
                <Trophy size={28} color="var(--yellow)" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Longest Streak</p>
                <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{stats.longestStreak} {stats.longestStreak === 1 ? 'Day' : 'Days'}</h3>
              </div>
            </div>
            
            <div className="card card-glow-blue" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--powder-blue-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--powder-blue)' }}>
                <CheckCircle2 size={28} color="var(--powder-blue)" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Overall Attendance</p>
                <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>{stats.overallPct}%</h3>
              </div>
            </div>
          </div>
        </div>

        {/* LeetCode Heatmap */}
        <div className="card card-glow-orange" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Attendance Consistency (Last 90 Days)</h3>
          
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 14px)', gap: 4, marginTop: 18 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <span key={d} style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: '14px', height: 14, fontWeight: 600 }}>{i % 2 === 0 ? d : ''}</span>
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
                  background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                  padding: '6px 10px', borderRadius: 8, boxShadow: 'var(--shadow-card)',
                  fontSize: 12, fontWeight: 700, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10
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
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Less</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2, 3].map(status => (
                <div key={status} style={{ width: 12, height: 12, borderRadius: 2, background: getHeatmapColor(status === 0 ? 0 : status === 1 ? 2 : status === 2 ? 3 : 3) }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>More</span>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === 'COORDINATOR') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto' }} className="fade-in">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Attendance Overview</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>View attendance records for all batches and trainees.</p>
        </div>

        <div className="card card-glow-blue" style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Select Batch</label>
              <select 
                value={selectedBatch} 
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="glass-input"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-color)',
                  outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-main)', 
                  transition: 'border 0.2s'
                }}
              >
                <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>-- Choose Batch to View --</option>
                {batches.map(b => (
                  <option key={b._id} value={b.batchId} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    {b.batchName}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Date Filter</label>
              <div style={{ position: 'relative' }}>
                <CalendarIcon size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="glass-input"
                  style={{
                    width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid var(--border-color)',
                    outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-main)', 
                    transition: 'border 0.2s'
                  }} 
                />
              </div>
            </div>
          </div>

          {!selectedBatch ? (
             <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600 }}>
               Please select a batch to view trainee attendance records.
             </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700 }}>Trainee Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700 }}>Check-in Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto' }} className="fade-in">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Attendance Tracking</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Upload daily attendance for your batches (Cutoff: 10:00 AM)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card card-glow-blue">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Select Batch</label>
                <select 
                  value={selectedBatch} 
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="glass-input"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-color)',
                    outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-main)', 
                    transition: 'border 0.2s'
                  }}
                >
                  <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>-- Choose Batch --</option>
                  {batches.map(b => (
                    <option key={b._id} value={b.batchId} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      {b.batchName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Date</label>
                <div style={{ position: 'relative' }}>
                  <CalendarIcon size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="glass-input"
                    style={{
                      width: '100%', padding: '12px 16px 12px 44px', borderRadius: 12, border: '1px solid var(--border-color)',
                      outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-main)', 
                      transition: 'border 0.2s'
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ 
            padding: 20, borderRadius: 16, 
            background: 'var(--pale-orange-glow)', 
            border: '1px solid var(--pale-orange)',
            boxShadow: '0 4px 12px var(--pale-orange-glow)'
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Clock size={20} color="var(--pale-orange)" style={{ marginTop: 2 }} />
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Daily Cutoff</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>Please ensure attendance is marked before 10:00 AM daily to avoid alerts to the Coordinator.</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card card-glow-orange" style={{ height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--powder-blue-glow) 0%, var(--pale-orange-glow) 100%)', pointerEvents: 'none' }} />
            
            <motion.div whileHover={{ scale: 1.05 }} style={{ 
              width: 80, height: 80, borderRadius: '50%', 
              background: 'var(--powder-blue-glow)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              marginBottom: 24, border: '1px solid var(--powder-blue)'
            }}>
              <Upload size={32} color="var(--powder-blue)" />
            </motion.div>
            
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'Outfit, sans-serif' }}>Upload Attendance</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 300, marginBottom: 32, lineHeight: 1.5 }}>
              Select an Excel file containing the daily attendance. The system expects the file to match the predefined template.
            </p>

            <label style={{
              position: 'relative', cursor: !selectedBatch ? 'not-allowed' : 'pointer',
              background: !selectedBatch ? 'var(--border-color)' : 'linear-gradient(135deg, var(--pale-orange), var(--yellow))',
              color: !selectedBatch ? 'var(--text-muted)' : '#121824', padding: '14px 28px', borderRadius: 12,
              fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: !selectedBatch ? 'none' : '0 4px 16px var(--pale-orange-glow)', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (selectedBatch) {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.filter = 'brightness(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedBatch) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'none';
              }
            }}
            >
              <input type="file" accept=".xlsx,.xls,.csv" style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }} onChange={handleFileUpload} disabled={!selectedBatch} />
              <CheckCircle2 size={20} />
              Select Excel File
            </label>
            {!selectedBatch && <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 16, fontWeight: 700 }}>Please select a batch first</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

