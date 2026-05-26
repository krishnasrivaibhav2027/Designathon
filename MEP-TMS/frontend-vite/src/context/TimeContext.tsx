import React, { createContext, useContext, ReactNode } from 'react';

interface TimeContextType {
  // Helper to check if current time is within a range (e.g., '09:00' to '10:00')
  isTimeBetween: (start: string, end: string) => boolean;
  // Helper to check if current time is equal or past a specific time
  isTimePastOrEqual: (target: string) => boolean;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export function TimeProvider({ children }: { children: ReactNode }) {
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const isTimeBetween = (start: string, end: string) => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    return currentMins >= timeToMinutes(start) && currentMins <= timeToMinutes(end);
  };

  const isTimePastOrEqual = (target: string) => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    return currentMins >= timeToMinutes(target);
  };

  return (
    <TimeContext.Provider value={{ isTimeBetween, isTimePastOrEqual }}>
      {children}
    </TimeContext.Provider>
  );
}

export function useSimulatedTime() {
  const context = useContext(TimeContext);
  if (context === undefined) {
    throw new Error('useSimulatedTime must be used within a TimeProvider');
  }
  return context;
}
