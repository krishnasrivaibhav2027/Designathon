import React, { createContext, useContext, useState, ReactNode } from 'react';

// Possible mock times for our simulation scenarios
export type SimulatedTime = '08:30' | '09:00' | '09:30' | '09:45' | '10:05';

interface TimeContextType {
  simulatedTime: SimulatedTime;
  setSimulatedTime: (time: SimulatedTime) => void;
  // Helper to check if current time is within a range (e.g., '09:00' to '10:00')
  isTimeBetween: (start: string, end: string) => boolean;
  // Helper to check if current time is equal or past a specific time
  isTimePastOrEqual: (target: string) => boolean;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export function TimeProvider({ children }: { children: ReactNode }) {
  // Default to 8:30 AM before attendance opens
  const [simulatedTime, setSimulatedTime] = useState<SimulatedTime>('08:30');

  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const isTimeBetween = (start: string, end: string) => {
    const currentMins = timeToMinutes(simulatedTime);
    return currentMins >= timeToMinutes(start) && currentMins <= timeToMinutes(end);
  };

  const isTimePastOrEqual = (target: string) => {
    return timeToMinutes(simulatedTime) >= timeToMinutes(target);
  };

  return (
    <TimeContext.Provider value={{ simulatedTime, setSimulatedTime, isTimeBetween, isTimePastOrEqual }}>
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
