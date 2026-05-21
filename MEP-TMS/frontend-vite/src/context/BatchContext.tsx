import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Batch {
  _id: string;
  batchId: string;
  batchName: string;
  topics: string[];
  startDate: string;
  endDate: string;
  sizeLimit: number | null; // null means infinite
  candidatesCount: number;
  status: 'PLANNED' | 'RUNNING' | 'COMPLETED';
  trainer?: string;
}

interface BatchContextType {
  batches: Batch[];
  addBatch: (batch: Omit<Batch, '_id' | 'batchId' | 'candidatesCount' | 'status'>) => void;
  assignTrainees: (skillCategory: string, numTrainees: number) => void;
}

const BatchContext = createContext<BatchContextType | undefined>(undefined);

export function BatchProvider({ children }: { children: ReactNode }) {
  const [batches, setBatches] = useState<Batch[]>([]);

  const addBatch = (newBatchData: Omit<Batch, '_id' | 'batchId' | 'candidatesCount' | 'status'>) => {
    const newBatch: Batch = {
      ...newBatchData,
      _id: Date.now().toString(),
      batchId: `BATCH-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      candidatesCount: 0,
      status: 'PLANNED'
    };
    setBatches(prev => [...prev, newBatch]);
  };

  // Option B: Auto-split overflow batches
  const assignTrainees = (skillCategory: string, numTrainees: number) => {
    let traineesLeft = numTrainees;
    
    setBatches(prevBatches => {
      let updatedBatches = [...prevBatches];

      // 1. Find existing batches that match the skill category (simple string match for mock)
      const matchingBatches = updatedBatches.filter(b => 
        b.batchName.toLowerCase().includes(skillCategory.toLowerCase()) ||
        b.topics.some(t => t.toLowerCase().includes(skillCategory.toLowerCase()))
      );

      // 2. Fill existing batches first
      for (const batch of matchingBatches) {
        if (traineesLeft <= 0) break;

        const availableSpace = batch.sizeLimit ? batch.sizeLimit - batch.candidatesCount : Infinity;
        
        if (availableSpace > 0) {
          const assignCount = Math.min(availableSpace, traineesLeft);
          batch.candidatesCount += assignCount;
          traineesLeft -= assignCount;
          
          if (batch.candidatesCount > 0 && batch.status === 'PLANNED') {
            batch.status = 'RUNNING'; // Auto start if it has trainees for now
          }
        }
      }

      // 3. If trainees are still left, create overflow batches (Option B)
      if (traineesLeft > 0) {
        // Use the first matching batch as a template, or create a generic one if none exist
        const templateBatch = matchingBatches[0] || {
          batchName: `${skillCategory} Cohort`,
          topics: [skillCategory],
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          sizeLimit: 100 // Default overflow size
        };

        let overflowIndex = 2; // Start naming as "Batch 2"

        while (traineesLeft > 0) {
          const newSizeLimit = templateBatch.sizeLimit || 100;
          const assignCount = Math.min(newSizeLimit, traineesLeft);
          
          const newBatch: Batch = {
            _id: Date.now().toString() + Math.random(),
            batchId: `BATCH-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            batchName: `${templateBatch.batchName.split(' - ')[0]} - Overflow ${overflowIndex}`,
            topics: [...templateBatch.topics],
            startDate: templateBatch.startDate,
            endDate: templateBatch.endDate,
            sizeLimit: newSizeLimit,
            candidatesCount: assignCount,
            status: 'RUNNING'
          };

          updatedBatches.push(newBatch);
          traineesLeft -= assignCount;
          overflowIndex++;
        }
      }

      return updatedBatches;
    });
  };

  return (
    <BatchContext.Provider value={{ batches, addBatch, assignTrainees }}>
      {children}
    </BatchContext.Provider>
  );
}

export function useBatches() {
  const context = useContext(BatchContext);
  if (context === undefined) {
    throw new Error('useBatches must be used within a BatchProvider');
  }
  return context;
}
