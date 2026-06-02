import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export interface AgentSlide {
  title: string;
  bullets: string[];
}

export interface AgentSubtopic {
  name: string;
  slides: AgentSlide[];
}

export interface AgentTopicContent {
  topic: string;
  subtopics: AgentSubtopic[];
}

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
  category?: 'SPARK' | 'FOUNDATIONAL' | 'STREAM';
  phase?: 'PHASE_1' | 'PHASE_2' | null;
  onboardingDate?: string | null;
  questions?: Array<{
    topic: string;
    questions: Array<{
      question: string;
      options: string[];
      correctAnswer: string;
    }>;
  }>;
  codingQuestions?: Array<{
    topic: string;
    problemStatement: string;
    inputFormat: string;
    outputFormat: string;
    constraints: string;
    sampleInput: string;
    sampleOutput: string;
    testCases: Array<{
      input: string;
      expectedOutput: string;
      isHidden: boolean;
    }>;
  }>;
  agent?: {
    agentName?: string;
    modelName: string;
    temperature: number;
    promptInstruction?: string;
    additionalInstruction?: string;
    createdBy?: string;
    createdAt?: string;
    status?: 'preparing' | 'ready' | 'failed';
    content?: AgentTopicContent[];
  };
}

interface BatchContextType {
  batches: Batch[];
  addBatch: (batch: Omit<Batch, '_id' | 'batchId' | 'candidatesCount' | 'status'> & { 
    category?: string, 
    phase?: string | null, 
    onboardingDate?: string | null, 
    trainees?: { fullName: string, email: string }[],
    autoSplit?: boolean,
    gapDays?: number
  }) => Promise<void>;
  updateBatch: (id: string, batchData: Partial<Omit<Batch, '_id' | 'batchId' | 'candidatesCount' | 'status'>>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  updateBatchStatus: (id: string, status: Batch['status']) => Promise<void>;
  assignTrainees: (skillCategory: string, numTrainees: number) => void;
  fetchBatches: () => Promise<void>;
  generateAssessment: (id: string) => Promise<void>;
  generateCodingAssessment: (id: string) => Promise<void>;
  createAgent: (id: string, agentData: { agentName?: string, modelName: string, temperature: number, promptInstruction?: string | null, additionalInstruction?: string | null }) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
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
  trainer: b.trainers && b.trainers.length > 0 ? b.trainers[0] : undefined,
  category: b.category || 'SPARK',
  phase: b.phase || null,
  onboardingDate: b.onboardingDate || undefined,
  questions: b.questions || [],
  codingQuestions: b.codingQuestions || [],
  agent: b.agent || undefined
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
      // Poll every 30 seconds so backend auto-transitions PLANNED→RUNNING
      const pollId = setInterval(() => {
        fetchBatches();
      }, 30_000);
      return () => clearInterval(pollId);
    }
  }, [isAuthenticated]);

  // Client-side real-time reconciliation: every 15 s check if any
  // PLANNED batch has reached its start date and flip it locally,
  // then trigger a server re-fetch to persist the transition.
  useEffect(() => {
    const tickId = setInterval(() => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      let needsRefresh = false;
      setBatches(prev =>
        prev.map(b => {
          if (b.status !== 'PLANNED') return b;
          const sd = new Date(b.startDate);
          sd.setHours(0, 0, 0, 0);
          if (sd.getTime() <= now.getTime()) {
            needsRefresh = true;
            return { ...b, status: 'RUNNING' as const };
          }
          return b;
        })
      );

      if (needsRefresh) {
        // Server-side will persist the status change on the next fetch
        fetchBatches();
      }
    }, 15_000);

    return () => clearInterval(tickId);
  }, [isAuthenticated]);

  const addBatch = async (newBatchData: Omit<Batch, '_id' | 'batchId' | 'candidatesCount' | 'status'> & { 
    category?: string, 
    phase?: string | null, 
    onboardingDate?: string | null, 
    trainees?: { fullName: string, email: string }[],
    autoSplit?: boolean,
    gapDays?: number
  }) => {
    try {
      setLoading(true);
      const payload = {
        batchName: newBatchData.batchName,
        startDate: new Date(newBatchData.startDate).toISOString(),
        endDate: new Date(newBatchData.endDate).toISOString(),
        trainers: newBatchData.trainer ? [newBatchData.trainer] : [],
        description: "",
        topics: newBatchData.topics,
        sizeLimit: newBatchData.sizeLimit,
        trainees: newBatchData.trainees || [],
        category: newBatchData.category || "SPARK",
        phase: newBatchData.phase || null,
        onboardingDate: newBatchData.onboardingDate || null,
        autoSplit: newBatchData.autoSplit || false,
        gapDays: newBatchData.gapDays || 7
      };
      
      const response = await api.post('/batch/create', payload);
      if (response.data) {
        if (response.data.warning) {
          toast(response.data.warningMessage, {
            icon: '⚠️',
            duration: 6000,
            style: {
              border: '1px solid #d97706',
              padding: '12px 16px',
              color: '#d97706',
              fontWeight: 600,
              background: '#fffbeb'
            }
          });
        } else {
          toast.success('Batch created successfully!');
        }
        await fetchBatches();
      }
    } catch (error: any) {
      console.error("Failed to add batch:", error);
      const errMsg = error.response?.data?.detail || "Failed to create batch on server.";
      toast.error(errMsg);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateBatch = async (id: string, updatedData: Partial<Omit<Batch, '_id' | 'batchId' | 'candidatesCount' | 'status'>>) => {
    try {
      setLoading(true);
      const payload: any = {
        batchName: updatedData.batchName,
        topics: updatedData.topics,
        sizeLimit: updatedData.sizeLimit,
      };
      if (updatedData.startDate) {
        payload.startDate = new Date(updatedData.startDate).toISOString();
      }
      if (updatedData.endDate) {
        payload.endDate = new Date(updatedData.endDate).toISOString();
      }
      if (updatedData.trainer !== undefined) {
        payload.trainers = updatedData.trainer ? [updatedData.trainer] : [];
      }
      
      const response = await api.put(`/batch/${id}`, payload);
      if (response.data) {
        toast.success("Batch updated successfully!");
        await fetchBatches();
      }
    } catch (error: any) {
      console.error("Failed to update batch:", error);
      const errMsg = error.response?.data?.detail || "Failed to update batch on server.";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const deleteBatch = async (id: string) => {
    try {
      setLoading(true);
      const response = await api.delete(`/batch/${id}`);
      if (response.data) {
        toast.success("Batch deleted successfully!");
        await fetchBatches();
      }
    } catch (error: any) {
      console.error("Failed to delete batch:", error);
      const errMsg = error.response?.data?.detail || "Failed to delete batch on server.";
      toast.error(errMsg);
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
    } catch (error: any) {
      console.error("Failed to update batch status:", error);
      const errMsg = error.response?.data?.detail || "Failed to update batch status on server.";
      toast.error(errMsg);
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

  const generateAssessment = async (id: string) => {
    try {
      setLoading(true);
      const response = await api.post(`/assessment/${id}/generate-questions`);
      if (response.data) {
        const updatedBatch = mapBackendToFrontend(response.data);
        setBatches(prev => prev.map(b => b._id === id ? updatedBatch : b));
        toast.success("AI Assessment questions generated successfully!");
      }
    } catch (error: any) {
      console.error("Failed to generate assessment:", error);
      const errMsg = error.response?.data?.detail || "Failed to generate assessment questions.";
      toast.error(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const generateCodingAssessment = async (id: string) => {
    try {
      setLoading(true);
      const response = await api.post(`/assessment/${id}/generate-coding-questions`);
      if (response.data) {
        const updatedBatch = mapBackendToFrontend(response.data);
        setBatches(prev => prev.map(b => b._id === id ? updatedBatch : b));
        toast.success("AI Coding challenges generated successfully!");
      }
    } catch (error: any) {
      console.error("Failed to generate coding assessment:", error);
      const errMsg = error.response?.data?.detail || "Failed to generate coding challenges.";
      toast.error(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async (id: string, agentData: { agentName?: string, modelName: string, temperature: number, promptInstruction?: string | null, additionalInstruction?: string | null }) => {
    try {
      setLoading(true);
      const response = await api.post(`/agent/create/${id}`, agentData);
      if (response.data) {
        const updatedBatch = mapBackendToFrontend(response.data);
        setBatches(prev => prev.map(b => b._id === id ? updatedBatch : b));
      }
    } catch (error: any) {
      console.error("Failed to create agent:", error);
      const errMsg = error.response?.data?.detail || "Failed to create agent.";
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      setLoading(true);
      const response = await api.delete(`/agent/${id}`);
      if (response.data) {
        const updatedBatch = mapBackendToFrontend(response.data);
        setBatches(prev => prev.map(b => b._id === id ? updatedBatch : b));
      }
    } catch (error: any) {
      console.error("Failed to delete agent:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <BatchContext.Provider value={{ batches, addBatch, updateBatch, deleteBatch, updateBatchStatus, assignTrainees, fetchBatches, generateAssessment, generateCodingAssessment, createAgent, deleteAgent, loading }}>
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
