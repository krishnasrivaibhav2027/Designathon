import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  style?: React.CSSProperties;
}

export default function CustomDatePicker({
  value,
  onChange,
  style = {},
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // Safe local parsing of YYYY-MM-DD to avoid timezone shifting
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
    return new Date();
  };

  // Local state for the calendar view (month and year)
  const [viewDate, setViewDate] = useState(() => parseLocalDate(value));

  // Sync viewDate when value changes externally
  useEffect(() => {
    if (value) {
      setViewDate(parseLocalDate(value));
    }
  }, [value]);

  // Close calendar when clicking outside (using 'click' to guarantee button handlers execute first)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideTrigger = containerRef.current && containerRef.current.contains(target);
      const clickedInsideCalendar = calendarRef.current && calendarRef.current.contains(target);

      if (!clickedInsideTrigger && !clickedInsideCalendar) {
        setIsOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      let left = rect.left;
      const calendarWidth = 280;
      // Prevent calendar from spilling over the right edge of viewport
      if (left + calendarWidth > window.innerWidth) {
        left = Math.max(12, window.innerWidth - calendarWidth - 12);
      }
      setCoords({
        top: rect.bottom,
        left,
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0-indexed

  // Months labels
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Weekdays labels (starting Monday as in the user's screenshot)
  const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  // Get days in a month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get starting day of the month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    // Convert Sunday = 0 to Sunday = 6, Monday = 1 to Monday = 0
    return day === 0 ? 6 : day - 1;
  };

  const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
  const daysInPrevMonth = getDaysInMonth(currentYear, currentMonth - 1);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Generate calendar days grid
  const calendarDays = [];

  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    calendarDays.push({
      day: daysInPrevMonth - i,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    calendarDays.push({
      day: i,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true,
    });
  }

  // Next month padding days to fill 42 cells (6 rows)
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    calendarDays.push({
      day: i,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
    });
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (dayObj: { day: number; month: number; year: number }) => {
    const dateStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  // Format date for input display (e.g., DD-MM-YYYY)
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
    }
    return dateStr;
  };

  // Check if a day is the selected day
  const isSelectedDay = (dayObj: { day: number; month: number; year: number }) => {
    if (!value) return false;
    const valParts = value.split('-');
    return (
      dayObj.day === parseInt(valParts[2], 10) &&
      dayObj.month === parseInt(valParts[1], 10) - 1 &&
      dayObj.year === parseInt(valParts[0], 10)
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        ...style,
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '11px 14px',
          paddingLeft: '38px',
          borderRadius: 12,
          fontSize: '13.5px',
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          textAlign: 'left',
          position: 'relative',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          backdropFilter: 'var(--card-blur)',
          WebkitBackdropFilter: 'var(--card-blur)',
          boxShadow: isOpen ? '0 0 12px var(--powder-blue-glow)' : 'none',
          borderColor: isOpen ? 'var(--powder-blue)' : 'var(--border-color)',
          transition: 'all 0.3s ease',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        <CalendarIcon
          size={16}
          color="var(--text-secondary)"
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />
        <span>{formatDisplayDate(value)}</span>
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={calendarRef}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: coords.top + 6,
                left: coords.left,
                zIndex: 9999,
                width: '280px',
                background: 'var(--bg-dropdown, var(--bg-card))',
                border: '1px solid var(--border-color)',
                borderRadius: 16,
                boxShadow: 'var(--shadow-card)',
                backdropFilter: 'var(--card-blur)',
                WebkitBackdropFilter: 'var(--card-blur)',
                padding: 16,
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              {/* Calendar Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                  {months[currentMonth]} {currentYear}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    style={{
                      border: '1px solid var(--border-color)',
                      background: 'transparent',
                      borderRadius: 8,
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    style={{
                      border: '1px solid var(--border-color)',
                      background: 'transparent',
                      borderRadius: 8,
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Weekdays Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8, textAlign: 'center' }}>
                {weekdays.map((day) => (
                  <span key={day} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {day}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
                {calendarDays.map((dayObj, index) => {
                  const selected = isSelectedDay(dayObj);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectDay(dayObj)}
                      style={{
                        border: 'none',
                        outline: 'none',
                        borderRadius: 8,
                        height: 28,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: selected 
                          ? 'linear-gradient(135deg, var(--powder-blue) 0%, var(--yellow) 100%)' 
                          : 'transparent',
                        color: selected 
                          ? '#121824' 
                          : dayObj.isCurrentMonth 
                            ? 'var(--text-primary)' 
                            : 'var(--text-muted)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!selected) {
                          const isDark = document.documentElement.classList.contains('dark');
                          e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(135, 206, 235, 0.15)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selected) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {dayObj.day}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
