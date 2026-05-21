import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export interface Batch {
  _id: string;
  batchId: string;
  batchName: string;
  topics: string[];
  startDate: string;
  endDate: string;
  sizeLimit: number | null; // null means infinite
  candidatesCount: number;
  status: 'PLANNED' | 'RUNNING' | 'COMPLETED' | 'CLOSED';
  trainer?: string;
}

interface BatchContextType {
  batches: Batch[];
  addBatch: (batch: Omit<Batch, '_id' | 'batchId' | 'candidatesCount' | 'status'>) => Promise<void>;
  updateBatchStatus: (id: string, status: Batch['status']) => Promise<void>;
  assignTrainees: (skillCategory: string, numTrainees: number) => void;
  fetchBatches: () => Promise<void>;
  loading: boolean;
}

const BatchContext = createContext<BatchContextType | undefined>(undefined);

const mapBackendToFrontend = (b: any): Batch => ({
  _id: b.id,
  batchId: b.batchId,
  batchName: b.batchName,
  topics: b.topics || [],
  startDate: b.startDate ? b.startDate.substring(0, 10) : '',
  endDate: b.endDate ? b.endDate.substring(0, 10) : '',
  sizeLimit: b.sizeLimit,
  candidatesCount: b.candidatesCount || 0,
  status: b.status,
  trainer: b.trainers && b.trainers.length > 0 ? b.trainers[0] : undefined
});

export function BatchProvider({ children }: { children: ReactNode }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();

  const fetchBatches = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const response = await api.get('/batch/list');
      const mapped = response.data.map(mapBackendToFrontend);
      setBatches(mapped);
    } catch (error) {
      console.error("Failed to fetch batches:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchBatches();
    }
  }, [isAuthenticated]);

  const addBatch = async (newBatchData: Omit<Batch, '_id' | 'batchId' | 'candidatesCount' | 'status'>) => {
    try {
      setLoading(true);
      const payload = {
        batchName: newBatchData.batchName,
        startDate: new Date(newBatchData.startDate).toISOString(),
        endDate: new Date(newBatchData.endDate).toISOString(),
        trainers: newBatchData.trainer ? [newBatchData.trainer] : [],
        description: "",
        topics: newBatchData.topics,
        sizeLimit: newBatchData.sizeLimit
      };
      
      const response = await api.post('/batch/create', payload);
      if (response.data) {
        await fetchBatches();
      }
    } catch (error) {
      console.error("Failed to add batch:", error);
      toast.error("Failed to create batch on server.");
    } finally {
      setLoading(false);
    }
  };

  const updateBatchStatus = async (id: string, status: Batch['status']) => {
    try {
      setLoading(true);
      const response = await api.put(`/batch/${id}`, { status });
      if (response.data) {
        toast.success(`Batch status updated to ${status}`);
        await fetchBatches();
      }
    } catch (error) {
      console.error("Failed to update batch status:", error);
      toast.error("Failed to update batch status on server.");
    } finally {
      setLoading(false);
    }
  };

  // Option B: Auto-split overflow batches (local simulator updates state)
  const assignTrainees = (skillCategory: string, numTrainees: number) => {
    let traineesLeft = numTrainees;
    
    setBatches(prevBatches => {
      let updatedBatches = [...prevBatches];

      // 1. Find existing batches that match the skill category
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
            batch.status = 'RUNNING'; 
          }
        }
      }

      // 3. If trainees are still left, create overflow batches (Option B)
      if (traineesLeft > 0) {
        const templateBatch = matchingBatches[0] || {
          batchName: `${skillCategory} Cohort`,
          topics: [skillCategory],
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          sizeLimit: 100 
        };

        let overflowIndex = 2;

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
    <BatchContext.Provider value={{ batches, addBatch, updateBatchStatus, assignTrainees, fetchBatches, loading }}>
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
