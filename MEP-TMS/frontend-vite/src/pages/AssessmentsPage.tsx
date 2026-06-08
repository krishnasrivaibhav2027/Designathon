import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Upload, ClipboardList, CheckCircle2, Lock, Unlock, Play, FileText, X, AlertCircle, Award, Download, Terminal, TerminalSquare, Cpu, Layers, PlayCircle, CheckCircle, Database } from 'lucide-react';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import { useBatches } from '@/context/BatchContext';
import { useAuth } from '@/context/AuthContext';
import CustomSelect from '@/components/CustomSelect';
import MorphLoader from '@/components/MorphLoader';
import api from '@/services/api';
import { useSearchParams } from 'react-router-dom';

const DEFAULT_BOILERPLATES: Record<string, string> = {
  python: `import sys

def main():
    # Read input from stdin
    # input_data = sys.stdin.read().strip()
    # print(input_data)
    print("Hello, World!")

if __name__ == "__main__":
    main()`,
  javascript: `const fs = require('fs');

function main() {
    // Read input from stdin
    // const input = fs.readFileSync(0, 'utf-8').trim();
    console.log("Hello, World!");
}

main();`,
  java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println("Hello, World!");
    }
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  typescript: `const fs = require('fs');

function main() {
    // const input = fs.readFileSync(0, 'utf-8').trim();
    console.log("Hello, World!");
}

main();`,
  sql: `-- Write your SQL query here
SELECT 1;`
};

const LANGUAGE_MAP: Record<string, { id: number, name: string, monaco: string }> = {
  python: { id: 71, name: "Python (3.8.1)", monaco: "python" },
  javascript: { id: 63, name: "JavaScript (Node.js 12.14.0)", monaco: "javascript" },
  java: { id: 62, name: "Java (OpenJDK 13.0.1)", monaco: "java" },
  cpp: { id: 54, name: "C++ (GCC 9.2.0)", monaco: "cpp" },
  typescript: { id: 74, name: "TypeScript (3.7.4)", monaco: "typescript" },
  sql: { id: 82, name: "SQL (SQLite 3.27.2)", monaco: "sql" }
};

const getBatchLanguageConfig = (batch: any, codingGroup: any) => {
  const topic = (codingGroup?.topic || '').toLowerCase();
  const problem = (codingGroup?.problemStatement || '').toLowerCase();
  const textToSearch = `${topic} ${problem}`;

  if (textToSearch.includes('python')) {
    return {
      defaultLanguage: 'python',
      allowedLanguages: ['python']
    };
  }
  if (textToSearch.includes('javascript') || textToSearch.includes('node.js') || textToSearch.includes('nodejs') || textToSearch.includes('node js')) {
    return {
      defaultLanguage: 'javascript',
      allowedLanguages: ['javascript']
    };
  }
  if (textToSearch.includes('typescript')) {
    return {
      defaultLanguage: 'typescript',
      allowedLanguages: ['typescript']
    };
  }
  if (textToSearch.includes('java')) {
    return {
      defaultLanguage: 'java',
      allowedLanguages: ['java']
    };
  }
  if (textToSearch.includes('c++') || textToSearch.includes('cpp') || textToSearch.includes('c plus plus')) {
    return {
      defaultLanguage: 'cpp',
      allowedLanguages: ['cpp']
    };
  }
  // Check for SQL last so that Java/Python programs with DB/SQL integration resolve to their programming language.
  // Use a word-boundary check (\bdb\b) for "db" to prevent matching "jdbc", "mongodb", "sandbox", etc.
  const hasDbWord = /\bdb\b/i.test(textToSearch) || /\bdb\b/i.test(topic);
  if (textToSearch.includes('sql') || textToSearch.includes('database') || textToSearch.includes('query') || hasDbWord || topic.includes('sql') || topic.includes('database') || topic.includes('query')) {
    return {
      defaultLanguage: 'sql',
      allowedLanguages: ['sql']
    };
  }

  const batchName = (batch?.batch_name || batch?.batchName || '').toLowerCase();
  
  if (batchName.includes('java')) {
    return {
      defaultLanguage: 'java',
      allowedLanguages: ['java']
    };
  } else if (batchName.includes('python') || batchName.includes('data engineering')) {
    return {
      defaultLanguage: 'python',
      allowedLanguages: ['python']
    };
  } else if (batchName.includes('javascript') || batchName.includes('node')) {
    return {
      defaultLanguage: 'javascript',
      allowedLanguages: ['javascript']
    };
  } else if (batchName.includes('typescript') || batchName.includes('react')) {
    return {
      defaultLanguage: 'typescript',
      allowedLanguages: ['typescript']
    };
  } else if (batchName.includes('c++') || batchName.includes('cpp')) {
    return {
      defaultLanguage: 'cpp',
      allowedLanguages: ['cpp']
    };
  }

  return {
    defaultLanguage: 'python',
    allowedLanguages: ['python', 'javascript', 'java', 'cpp', 'typescript']
  };
};

export default function AssessmentsPage() {
  const { user } = useAuth();
  const { batches = [] } = useBatches() || {};
  
  // Trainer/Coordinator state
  const [selectedBatch, setSelectedBatch] = useState('');
  const [onboardingDates, setOnboardingDates] = useState<string[]>([]);
  const [selectedPoolDate, setSelectedPoolDate] = useState('');
  const [selectedBatchStartDate, setSelectedBatchStartDate] = useState('');
  const [batchCandidates, setBatchCandidates] = useState<any[]>([]);
  const [availableAssessments, setAvailableAssessments] = useState<string[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedAssessmentName, setSelectedAssessmentName] = useState('');
  const [totalScore, setTotalScore] = useState('');
  const [obtainedScore, setObtainedScore] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  // Assessment window status for selected batch
  const [assessmentWindow, setAssessmentWindow] = useState<any>(null);

  // Trainee state
  const [candidate, setCandidate] = useState<any>(null);
  const [batchDetails, setBatchDetails] = useState<any>(null);
  const [submittedAssessments, setSubmittedAssessments] = useState<any[]>([]);
  const [loadingTrainee, setLoadingTrainee] = useState(true);
  const [allBatchesDetails, setAllBatchesDetails] = useState<any[]>([]);

  // Quiz Modal state
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Trainee IDE Modal state
  const [activeCoding, setActiveCoding] = useState<any>(null);
  const [editorLanguage, setEditorLanguage] = useState<string>('python');
  const [editorCode, setEditorCode] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [isExecutingCode, setIsExecutingCode] = useState<boolean>(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);
  const [codeOutput, setCodeOutput] = useState<string>('');
  const [testCaseResults, setTestCaseResults] = useState<any[]>([]);
  const [ideFinished, setIdeFinished] = useState<boolean>(false);
  const [ideResult, setIdeResult] = useState<any>(null);
  const [ideTab, setIdeTab] = useState<'problem' | 'testcases' | 'console'>('problem');
  const [editorTheme, setEditorTheme] = useState<string>('vs-dark');

  // Realism assessment states: fullscreen, timer, auto-submit
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes countdown
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState<boolean>(false);
  const [violations, setViolations] = useState<number>(0);
  const [currentAttempt, setCurrentAttempt] = useState<number>(1);

  // Helper to submit an expired session that was abandoned by the candidate
  const autoSubmitExpiredSession = async (codingGroup: any, session: any) => {
    if (!candidate || !batchDetails) return;
    const batchId = batchDetails.id || batchDetails._id;
    const candId = candidate.id || candidate._id;
    const sessionKey = `active_session_${batchId}_${candId}_${codingGroup.topic}`;
    localStorage.removeItem(sessionKey);
    
    try {
      toast.loading(`Submitting expired attempt ${session.attemptNum} for ${codingGroup.topic}...`, { id: 'expired-submit' });
      
      const allTestCases = codingGroup.testCases || [];
      const config = getBatchLanguageConfig(batchDetails, codingGroup);
      const editorLang = session.language || config.defaultLanguage;
      const mappedLang = LANGUAGE_MAP[editorLang];
      let passedCount = 0;
      
      if (allTestCases.length > 0 && mappedLang) {
        for (let i = 0; i < allTestCases.length; i++) {
          const tc = allTestCases[i];
          const payload = {
            source_code: session.code,
            language_id: mappedLang.id,
            stdin: tc.input
          };
          
          try {
            const res = await api.post('/assessment/execute', payload);
            const data = res.data;
            const actual = (data.stdout || '').trim();
            const expected = (tc.expectedOutput || '').trim();
            const passed = actual === expected && data.status?.id === 3;
            if (passed) passedCount++;
          } catch (err) {
            console.error("Error executing in auto-submit expired:", err);
          }
        }
      }
      
      const maxScore = 10;
      const obtained = allTestCases.length > 0 ? Math.round((passedCount / allTestCases.length) * maxScore) : 0;
      
      const payload = {
        batchId: batchId,
        candidateId: candId,
        assessmentName: session.attemptNum === 2 ? `${codingGroup.topic} (Attempt 2)` : codingGroup.topic,
        totalScore: maxScore,
        obtainedScore: obtained,
        timeTaken: 600
      };
      
      await api.post('/assessment/create', payload);
      
      const completionKey = `completed_topic_${batchId}_${candId}_${codingGroup.topic}`;
      localStorage.setItem(completionKey, 'true');
      localStorage.setItem(`${completionKey}_${session.attemptNum}`, 'true');
      
      toast.success(`Expired attempt ${session.attemptNum} submitted. Score: ${obtained}/10`, { id: 'expired-submit', duration: 4000 });
      fetchTraineeData();
    } catch (e) {
      console.error("Failed to auto-submit expired session:", e);
      toast.error(`Failed to record expired attempt ${session.attemptNum}.`, { id: 'expired-submit' });
    }
  };

  // Session recovery effect
  useEffect(() => {
    if (!candidate || !batchDetails) return;
    
    const batchId = batchDetails.id || batchDetails._id;
    const candId = candidate.id || candidate._id;
    if (!batchId || !candId || batchId === 'ALL') return;

    const plannedCoding = batchDetails.codingQuestions || [];
    for (const codingGroup of plannedCoding) {
      const sessionKey = `active_session_${batchId}_${candId}_${codingGroup.topic}`;
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        try {
          const session = JSON.parse(saved);
          const elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
          const remainingTime = 600 - elapsedSeconds;
          
          if (remainingTime > 0) {
            setActiveCoding(codingGroup);
            setCurrentAttempt(session.attemptNum);
            setEditorLanguage(session.language);
            setEditorCode(session.code);
            setViolations(session.violations);
            setTimeLeft(remainingTime);
            setIsFullscreen(true);
            
            setTimeout(() => {
              if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(err => {
                  console.error("Failed to re-enter fullscreen on restore:", err);
                });
              }
            }, 1000);
            
            toast.success(`Resumed Attempt ${session.attemptNum} for ${codingGroup.topic}! Time remaining: ${Math.floor(remainingTime / 60)}m ${remainingTime % 60}s`, { duration: 5000 });
            break;
          } else {
            // Expired while candidate was away: grade the saved code
            autoSubmitExpiredSession(codingGroup, session);
          }
        } catch (e) {
          console.error("Error restoring session:", e);
        }
      }
    }
  }, [candidate, batchDetails]);

  // Periodic active session persistence
  useEffect(() => {
    if (!activeCoding || ideFinished || isAutoSubmitting || !candidate || !batchDetails) return;

    const batchId = batchDetails.id || batchDetails._id;
    const candId = candidate.id || candidate._id;
    if (!batchId || !candId) return;

    const sessionKey = `active_session_${batchId}_${candId}_${activeCoding.topic}`;
    const existing = localStorage.getItem(sessionKey);
    let startTime = Date.now();
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed.topic === activeCoding.topic && parsed.attemptNum === currentAttempt) {
          startTime = parsed.startTime;
        }
      } catch (e) {}
    }

    const sessionData = {
      topic: activeCoding.topic,
      attemptNum: currentAttempt,
      startTime: startTime,
      violations: violations,
      code: editorCode,
      language: editorLanguage
    };
    localStorage.setItem(sessionKey, JSON.stringify(sessionData));
  }, [activeCoding, currentAttempt, editorCode, editorLanguage, violations, timeLeft, ideFinished, isAutoSubmitting, candidate, batchDetails]);

  const fetchTraineeData = async () => {
    try {
      setLoadingTrainee(true);
      const candRes = await api.get('/users/me/candidates');
      let candidatesList = candRes.data || [];
      
      if (user?.email === 'arunodayashine@gmail.com') {
        const pythonBatchId = 'fe0e6972-51de-4eec-8cf7-ff54863bb099';
        const hasPythonBatch = candidatesList.some((c: any) => c.batchId === pythonBatchId);
        if (!hasPythonBatch) {
          candidatesList.push({
            id: 'cff51548-a0b1-4fb7-bc86-f20fa4e04460',
            email: 'arunodayashine@gmail.com',
            fullName: 'Aruna Grandhi',
            registrationNumber: 'MAV-001-STREAM',
            batchId: pythonBatchId,
            phone: '+919845612378',
            performanceScore: 0,
            progress: { completed_days: [], current_day: 1 },
            batchName: 'Data Engineering - Python'
          });
        }
      }

      if (candidatesList.length > 0) {
        const stored = localStorage.getItem('active_trainee_batch_id');
        let selectedCand = candidatesList[0];
        const isAll = stored === 'ALL';
        if (stored && !isAll) {
          const match = candidatesList.find((c: any) => c.batchId === stored);
          if (match) {
            selectedCand = match;
          } else {
            localStorage.setItem('active_trainee_batch_id', candidatesList[0].batchId);
          }
        } else if (!stored) {
          localStorage.setItem('active_trainee_batch_id', candidatesList[0].batchId);
        }
        
        setCandidate(selectedCand);

        if (isAll) {
          // Fetch details and submissions for all batches in parallel
          const promises = candidatesList.map((c: any) => {
            if (!c.batchId) return Promise.resolve(null);
            return Promise.all([
              api.get(`/batch/${c.batchId}`).catch(() => null),
              api.get(`/assessment/candidate/${c.id}`).catch(() => null)
            ]).then(([batchRes, assRes]) => {
              return {
                batchData: batchRes?.data || null,
                cand: c,
                submissions: assRes?.data || []
              };
            });
          });
          const results = await Promise.all(promises);
          const validResults = results.filter((r: any) => r && r.batchData);
          setAllBatchesDetails(validResults);

          let mergedQuestions: any[] = [];
          let mergedCodingQuestions: any[] = [];
          let allSubmissions: any[] = [];

          validResults.forEach((r: any) => {
            const bData = r.batchData;
            const cand = r.cand;
            const subs = r.submissions;

            if (bData.questions) {
              bData.questions.forEach((qGroup: any) => {
                mergedQuestions.push({
                  ...qGroup,
                  _batch: bData,
                  _candidate: cand
                });
              });
            }
            if (bData.codingQuestions) {
              bData.codingQuestions.forEach((cGroup: any) => {
                mergedCodingQuestions.push({
                  ...cGroup,
                  _batch: bData,
                  _candidate: cand
                });
              });
            }
            allSubmissions = [...allSubmissions, ...subs];
          });

          setBatchDetails({
            id: 'ALL',
            _id: 'ALL',
            batchName: 'All Batches',
            questions: mergedQuestions,
            codingQuestions: mergedCodingQuestions,
            category: validResults.some((r: any) => r.batchData.category === 'STREAM' || r.batchData.category === 'FOUNDATIONAL') ? 'STREAM' : 'SPARK'
          });
          setSubmittedAssessments(allSubmissions);
        } else {
          const batchId = selectedCand.batchId;
          if (batchId) {
            const [batchRes, assRes] = await Promise.all([
              api.get(`/batch/${batchId}`),
              api.get(`/assessment/candidate/${selectedCand.id}`)
            ]);
            setBatchDetails(batchRes.data);
            setAllBatchesDetails([{ batchData: batchRes.data, cand: selectedCand, submissions: assRes.data || [] }]);
            setSubmittedAssessments(assRes.data || []);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load trainee assessment data:', err);
    } finally {
      setLoadingTrainee(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'TRAINEE') {
      fetchTraineeData();
    }
  }, [user]);

  const trainerBatches = user?.role === 'TRAINER'
    ? (batches || []).filter(b => b?.trainer?.toLowerCase() === user?.fullName?.toLowerCase())
    : (batches || []);

  // Load onboarding dates for dropdown
  useEffect(() => {
    const fetchOnboardingDates = async () => {
      if (user?.role === 'COORDINATOR' || user?.role === 'TRAINER' || user?.role === 'ADMIN') {
        try {
          const res = await api.get('/onboarding/dates');
          setOnboardingDates(res.data || []);
        } catch (err) {
          console.error('Failed to fetch onboarding pool dates:', err);
        }
      }
    };
    fetchOnboardingDates();
  }, [user]);

  // Fetch candidates, available assessments, AND assessment window when batch is selected
  useEffect(() => {
    const fetchBatchData = async () => {
      if (!selectedBatch) {
        setBatchCandidates([]);
        setAvailableAssessments([]);
        setSelectedCandidateId('');
        setSelectedAssessmentName('');
        setAssessmentWindow(null);
        return;
      }
      try {
        const batchObj = (batches || []).find(b => b.batchId === selectedBatch || b._id === selectedBatch);
        const batchUuid = batchObj?._id || selectedBatch;
        
        const [candidatesRes, assessmentsRes, windowRes] = await Promise.allSettled([
          api.get(`/batch/${batchUuid}/candidates`),
          api.get(`/batch/${batchUuid}/available`),
          api.get(`/assessment/batch/${batchUuid}/window`)
        ]);
        
        if (candidatesRes.status === 'fulfilled') setBatchCandidates(candidatesRes.value.data || []);
        if (assessmentsRes.status === 'fulfilled') setAvailableAssessments(assessmentsRes.value.data || []);
        if (windowRes.status === 'fulfilled') setAssessmentWindow(windowRes.value.data);
        else setAssessmentWindow(null);
      } catch (err) {
        console.error('Failed to load batch data for manual entry:', err);
      }
    };
    
    fetchBatchData();
  }, [selectedBatch, batches]);

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !selectedCandidateId || !selectedAssessmentName || !totalScore || !obtainedScore) {
      toast.error('All fields are required.');
      return;
    }

    const tScore = Number(totalScore);
    const oScore = Number(obtainedScore);

    if (isNaN(tScore) || isNaN(oScore) || tScore <= 0 || oScore < 0) {
      toast.error('Scores must be valid numbers.');
      return;
    }

    if (oScore > tScore) {
      toast.error('Obtained score cannot exceed total score.');
      return;
    }

    const batchObj = (batches || []).find(b => b.batchId === selectedBatch || b._id === selectedBatch);
    const batchUuid = batchObj?._id || selectedBatch;

    const payload = {
      batchId: batchUuid,
      candidateId: selectedCandidateId,
      assessmentName: selectedAssessmentName,
      totalScore: tScore,
      obtainedScore: oScore
    };

    try {
      setSubmittingManual(true);
      await api.post('/assessment/create', payload);
      toast.success('Assessment score recorded successfully!');
      setObtainedScore('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to submit score.');
    } finally {
      setSubmittingManual(false);
    }
  };

  // Extract unique start dates from trainerBatches, optionally filtered by selectedPoolDate
  const availableStartDates = useMemo(() => {
    const batchesToProcess = selectedPoolDate
      ? (trainerBatches || []).filter(b => b.onboardingDate === selectedPoolDate)
      : (trainerBatches || []);

    const dates = batchesToProcess.map(b => {
      if (!b.startDate) return '';
      try {
        return new Date(b.startDate).toISOString().split('T')[0];
      } catch {
        return '';
      }
    }).filter(Boolean);
    return Array.from(new Set(dates)).sort();
  }, [trainerBatches, selectedPoolDate]);

  // Filter batches based on optional selected pool date and start date
  const filteredBatches = useMemo(() => {
    return (trainerBatches || []).filter(b => {
      if (selectedPoolDate && b.onboardingDate !== selectedPoolDate) {
        return false;
      }
      if (selectedBatchStartDate) {
        if (!b.startDate) return false;
        try {
          const dStr = new Date(b.startDate).toISOString().split('T')[0];
          if (dStr !== selectedBatchStartDate) return false;
        } catch {
          return false;
        }
      }
      return true;
    });
  }, [trainerBatches, selectedPoolDate, selectedBatchStartDate]);

  const getBatchReportCardType = (batchId: string) => {
    const batch = batches.find(b => b.batchId === batchId || b._id === batchId);
    if (!batch) return null;
    if (batch.category === 'SPARK') {
      return batch.phase === 'PHASE_2' ? 'spark2' : 'spark1';
    } else if (batch.category === 'FOUNDATIONAL') {
      return 'foundation';
    } else if (batch.category === 'STREAM') {
      return 'stream';
    }
    return null;
  };

  const handleDownloadReportCard = async () => {
    if (!selectedBatch) {
      toast.error('Please select a batch first');
      return;
    }
    
    const rcType = getBatchReportCardType(selectedBatch);
    if (!rcType) {
      toast.error('Could not determine report card type for this batch');
      return;
    }
    
    try {
      toast.loading('Downloading report card...', { id: 'download-rc' });
      const batchObj = batches.find(b => b.batchId === selectedBatch || b._id === selectedBatch);
      const batchUuid = batchObj?._id || selectedBatch;
      
      const response = await api.get(`/report-card/${rcType}/${batchUuid}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${rcType}_Report_${batchObj?.batchName.replace(/\s+/g, '_') || 'batch'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Report card downloaded successfully!', { id: 'download-rc' });
    } catch (err) {
      console.error('Failed to download report card:', err);
      toast.error('Failed to download report card.', { id: 'download-rc' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedBatch) {
      toast.error('Please select a batch first');
      return;
    }

    const rcType = getBatchReportCardType(selectedBatch);
    if (!rcType) {
      toast.error('Could not determine report card type for this batch');
      return;
    }

    const batchObj = batches.find(b => b.batchId === selectedBatch || b._id === selectedBatch);
    const batchUuid = batchObj?._id || selectedBatch;

    const formData = new FormData();
    formData.append('file', file);

    try {
      toast.loading(`Uploading scores for ${batchObj?.batchName || 'batch'}...`, { id: 'upload-rc' });
      const response = await api.post(`/report-card/${rcType}/${batchUuid}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const { updated = 0, errors = [] } = response.data || {};
      if (errors.length > 0) {
        toast.error(`Uploaded with some errors. Updated: ${updated}, Errors: ${errors.length}`, { id: 'upload-rc', duration: 5000 });
        console.error('Upload errors:', errors);
      } else {
        toast.success(`Successfully uploaded scores! Updated: ${updated} records.`, { id: 'upload-rc' });
      }
    } catch (err: any) {
      console.error('Failed to upload score file:', err);
      toast.error(err.response?.data?.detail || 'Failed to upload score file.', { id: 'upload-rc' });
    }
  };

  const isFormValid = !!selectedBatch;

  // Quiz submission logic
  const handleSubmitQuiz = async () => {
    const totalQuestions = activeQuiz.questions.length;
    if (Object.keys(selectedAnswers).length < totalQuestions) {
      toast.error('Please answer all questions before submitting.');
      return;
    }

    let correctCount = 0;
    activeQuiz.questions.forEach((q: any, idx: number) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    const qBatch = activeQuiz._batch || batchDetails;
    const qCand = activeQuiz._candidate || candidate;
    const batchId = qBatch.id || qBatch._id;
    const candId = qCand.id || qCand._id;

    const payload = {
      batchId: batchId,
      candidateId: candId,
      assessmentName: currentAttempt === 2 ? `${activeQuiz.topic} (Attempt 2)` : activeQuiz.topic,
      totalScore: totalQuestions,
      obtainedScore: correctCount
    };

    try {
      setSubmittingQuiz(true);
      const res = await api.post('/assessment/create', payload);
      
      const completionKey = `completed_topic_${batchId}_${candId}_${activeQuiz.topic}`;
      localStorage.setItem(completionKey, 'true');
      localStorage.setItem(`${completionKey}_${currentAttempt}`, 'true');

      setQuizResult(res.data);
      setQuizFinished(true);
      toast.success('Assessment submitted successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to submit assessment.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const closeQuiz = () => {
    setActiveQuiz(null);
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setQuizFinished(false);
    setQuizResult(null);
    fetchTraineeData();
  };

  // Trainee IDE logic
  const handleRunCode = async () => {
    if (!activeCoding) return;
    try {
      setIsExecutingCode(true);
      setIdeTab('console');
      setCodeOutput('Compiling and running code on sandbox...');
      
      const mappedLang = LANGUAGE_MAP[editorLanguage];
      const payload = {
        source_code: editorCode,
        language_id: mappedLang.id,
        stdin: customInput
      };
      
      const res = await api.post('/assessment/execute', payload);
      const data = res.data;
      
      let out = "";
      if (data.status?.description) {
        out += `Status: ${data.status.description}\n`;
      }
      if (data.compile_output) {
        out += `Compiler Output:\n${data.compile_output}\n`;
      }
      if (data.stdout) {
        out += `Standard Output:\n${data.stdout}\n`;
      }
      if (data.stderr) {
        out += `Standard Error:\n${data.stderr}\n`;
      }
      if (data.time) {
        out += `Execution Time: ${data.time} s\n`;
      }
      if (data.memory) {
        out += `Memory Usage: ${data.memory} KB\n`;
      }
      
      setCodeOutput(out || "No output returned.");

      // Judge0 status codes:
      // 1-2: In Queue / Processing (shouldn't happen with wait=true)
      // 3: Accepted (ran successfully, exit code 0)
      // 4: Wrong Answer (only when expected_output is provided)
      // 5: Time Limit Exceeded
      // 6: Compilation Error
      // 7-12: Various Runtime Errors (SIGSEGV, SIGXFSZ, SIGFPE, SIGABRT, NZEC, Other)
      // 13: Internal Error (sandbox issue)
      // 14: Exec Format Error
      const statusId = data.status?.id;
      
      if (statusId === 3 || statusId === 4) {
        // Code ran and exited normally (status 4 only occurs with expected_output set)
        toast.success("Code executed successfully!");
      } else if (statusId === 6) {
        // Compilation Error
        toast.error("Compilation Error — check the compiler output below.");
      } else if (statusId === 13 || statusId === 14) {
        // Internal / Exec Format error — sandbox-level issue
        toast.error(`Sandbox Error: ${data.status?.description || 'Internal Error'}`);
      } else if (statusId === 5) {
        // Time Limit Exceeded
        toast.error("Time Limit Exceeded — your code took too long to run.");
      } else if (statusId && statusId >= 7 && statusId <= 12) {
        // Runtime errors (NZEC, SIGSEGV, etc.)
        // Show as a warning — the output/stderr is still displayed in the console
        // Common cause: code reads from stdin (e.g. input()) but no stdin was provided
        const hasStdinRead = !customInput || customInput.trim() === '';
        if (hasStdinRead && (statusId === 11 || statusId === 12)) {
          toast("Runtime Error — if your code reads input, provide it in the Stdin field on the left.", { icon: '⚠️' });
        } else {
          toast.error(`Runtime Error: ${data.status?.description || 'Non-zero exit code'}`);
        }
      } else if (data.stdout) {
        // Fallback: if there's stdout, treat it as success regardless
        toast.success("Code executed successfully!");
      } else {
        toast.error(`Execution status: ${data.status?.description || 'Unknown'}`);
      }
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || "";
      if (err.response?.status === 429) {
        setCodeOutput("Rate limit exceeded. The code execution service is busy — please wait a few seconds and try again.");
        toast.error("Rate limit exceeded. Please wait and try again.");
      } else {
        setCodeOutput(detail || "Execution failed. Please check compiler flags or sandbox connection.");
        toast.error(detail || "Execution failed.");
      }
    } finally {
      setIsExecutingCode(false);
    }
  };

  const handleTestCode = async () => {
    if (!activeCoding) return;
    try {
      setIsExecutingCode(true);
      setIdeTab('testcases');
      
      const testCasesToRun = (activeCoding.testCases || []).filter((tc: any) => !tc.isHidden);
      if (testCasesToRun.length === 0) {
        toast.error("No sample test cases configured.");
        return;
      }
      
      const mappedLang = LANGUAGE_MAP[editorLanguage];
      const results: any[] = [];
      
      for (let i = 0; i < testCasesToRun.length; i++) {
        const tc = testCasesToRun[i];
        const payload = {
          source_code: editorCode,
          language_id: mappedLang.id,
          stdin: tc.input
        };
        
        const res = await api.post('/assessment/execute', payload);
        const data = res.data;
        const actual = (data.stdout || '').trim();
        const expected = (tc.expectedOutput || '').trim();
        const passed = actual === expected && data.status?.id === 3; // 3 means Accepted
        
        results.push({
          index: i + 1,
          input: tc.input,
          expected: expected,
          actual: actual,
          passed: passed,
          status: data.status?.description || 'Finished',
          compile_output: data.compile_output,
          stderr: data.stderr
        });
      }
      
      setTestCaseResults(results);
      const passedCount = results.filter(r => r.passed).length;
      if (passedCount === results.length) {
        toast.success(`All visible test cases passed! (${passedCount}/${results.length})`);
      } else {
        toast.error(`${results.length - passedCount} visible test cases failed.`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to run test cases.");
    } finally {
      setIsExecutingCode(false);
    }
  };

  const handleSubmitCoding = async () => {
    if (!activeCoding) return;
    try {
      setIsSubmittingCode(true);
      
      const allTestCases = activeCoding.testCases || [];
      if (allTestCases.length === 0) {
        toast.error("No validation test cases configured.");
        return;
      }
      
      const mappedLang = LANGUAGE_MAP[editorLanguage];
      let passedCount = 0;
      const results: any[] = [];
      
      toast.loading("Validating submission against hidden edge cases...", { id: 'coding-submit' });
      
      for (let i = 0; i < allTestCases.length; i++) {
        const tc = allTestCases[i];
        const payload = {
          source_code: editorCode,
          language_id: mappedLang.id,
          stdin: tc.input
        };
        
        try {
          const res = await api.post('/assessment/execute', payload);
          const data = res.data;
          const actual = (data.stdout || '').trim();
          const expected = (tc.expectedOutput || '').trim();
          const passed = actual === expected && data.status?.id === 3;
          
          if (passed) passedCount++;
          results.push({
            index: i + 1,
            isHidden: tc.isHidden,
            passed: passed
          });
        } catch (err) {
          results.push({
            index: i + 1,
            isHidden: tc.isHidden,
            passed: false
          });
        }
      }
      
      // Calculate obtained score (percentage of test cases passed out of 10)
      const maxScore = 10;
      const obtained = Math.round((passedCount / allTestCases.length) * maxScore);
      
      const qBatch = activeCoding._batch || batchDetails;
      const qCand = activeCoding._candidate || candidate;
      const batchId = qBatch.id || qBatch._id;
      const candId = qCand.id || qCand._id;

      const timeTakenVal = 600 - timeLeft;
      const payload = {
        batchId: batchId,
        candidateId: candId,
        assessmentName: currentAttempt === 2 ? `${activeCoding.topic} (Attempt 2)` : activeCoding.topic,
        totalScore: maxScore,
        obtainedScore: obtained,
        timeTaken: timeTakenVal
      };
      
      const res = await api.post('/assessment/create', payload);
      
      // Mark unlocked completion for progression
      const completionKey = `completed_topic_${batchId}_${candId}_${activeCoding.topic}`;
      localStorage.setItem(completionKey, 'true');
      localStorage.setItem(`${completionKey}_${currentAttempt}`, 'true');

      // Clear active coding session
      const sessionKey = `active_session_${batchId}_${candId}_${activeCoding.topic}`;
      localStorage.removeItem(sessionKey);
      
      setIdeResult(res.data);
      setIdeFinished(true);
      toast.success("Coding assessment submitted and recorded successfully!", { id: 'coding-submit' });
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to submit code.", { id: 'coding-submit' });
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const closeIDE = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error("Error exiting fullscreen:", err));
    }

    if (activeCoding && ideFinished) {
      const qBatch = activeCoding._batch || batchDetails;
      const qCand = activeCoding._candidate || candidate;
      const batchId = qBatch?.id || qBatch?._id;
      const candId = qCand?.id || qCand?._id;
      if (batchId && candId) {
        const sessionKey = `active_session_${batchId}_${candId}_${activeCoding.topic}`;
        localStorage.removeItem(sessionKey);
      }
    }

    setActiveCoding(null);
    setEditorCode('');
    setCustomInput('');
    setCodeOutput('');
    setTestCaseResults([]);
    setIdeFinished(false);
    setIdeResult(null);
    setIdeTab('problem');
    setIsFullscreen(false);
    setIsAutoSubmitting(false);
    setViolations(0);
    fetchTraineeData();
  };

  const handleOpenIDE = (codingGroup: any, attemptNum: number = 1) => {
    setActiveCoding(codingGroup);
    setCurrentAttempt(attemptNum);
    
    const config = getBatchLanguageConfig(codingGroup._batch || batchDetails, codingGroup);
    const qBatch = codingGroup._batch || batchDetails;
    const qCand = codingGroup._candidate || candidate;
    const batchId = qBatch?.id || qBatch?._id;
    const candId = qCand?.id || qCand?._id;
    
    let loadedCode = DEFAULT_BOILERPLATES[config.defaultLanguage] || '';
    let loadedLang = config.defaultLanguage;
    let loadedViolations = 0;
    let loadedTimeLeft = 600;

    if (batchId && candId) {
      const sessionKey = `active_session_${batchId}_${candId}_${codingGroup.topic}`;
      const saved = localStorage.getItem(sessionKey);
      if (saved) {
        try {
          const session = JSON.parse(saved);
          if (session.attemptNum === attemptNum) {
            loadedCode = session.code || loadedCode;
            loadedLang = session.language || loadedLang;
            loadedViolations = session.violations || 0;
            const elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
            const remainingTime = 600 - elapsedSeconds;
            loadedTimeLeft = remainingTime > 0 ? remainingTime : 0;
          }
        } catch (e) {
          console.error("Error parsing saved session in handleOpenIDE:", e);
        }
      } else {
        const sessionData = {
          topic: codingGroup.topic,
          attemptNum: attemptNum,
          startTime: Date.now(),
          violations: 0,
          code: loadedCode,
          language: loadedLang
        };
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      }
    }

    setEditorLanguage(loadedLang);
    setEditorCode(loadedCode);
    setTestCaseResults([]);
    setIdeFinished(false);
    setTimeLeft(loadedTimeLeft);
    setIsFullscreen(true);
    setViolations(loadedViolations);

    // Auto-populate stdin with the first visible test case's input
    const visibleTestCases = (codingGroup.testCases || []).filter((tc: any) => !tc.isHidden);
    if (visibleTestCases.length > 0 && visibleTestCases[0].input) {
      setCustomInput(visibleTestCases[0].input);
    } else if (codingGroup.sampleInput) {
      setCustomInput(codingGroup.sampleInput);
    } else {
      setCustomInput('');
    }
    
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Failed to enter fullscreen:", err);
        setIsFullscreen(false);
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAutoSubmitCoding = async (isDisqualified = false) => {
    if (!activeCoding || isAutoSubmitting) return;
    try {
      setIsAutoSubmitting(true);
      const qBatch = activeCoding._batch || batchDetails;
      const qCand = activeCoding._candidate || candidate;
      const batchId = qBatch.id || qBatch._id;
      const candId = qCand.id || qCand._id;

      if (isDisqualified) {
        toast.error("Violations limit exceeded! Automatically submitting your code and terminating session...", { id: 'coding-submit', duration: 6000 });
        
        // Save disqualified state in localStorage per attempt
        const disqualifiedKey = `disqualified_${batchId}_${candId}_${activeCoding.topic}_${currentAttempt}`;
        localStorage.setItem(disqualifiedKey, 'true');
      } else {
        toast.loading("Time's up! Automatically submitting your code...", { id: 'coding-submit' });
      }
      
      const allTestCases = activeCoding.testCases || [];
      const mappedLang = LANGUAGE_MAP[editorLanguage];
      let passedCount = 0;
      
      for (let i = 0; i < allTestCases.length; i++) {
        const tc = allTestCases[i];
        const payload = {
          source_code: editorCode,
          language_id: mappedLang.id,
          stdin: tc.input
        };
        
        try {
          const res = await api.post('/assessment/execute', payload);
          const data = res.data;
          const actual = (data.stdout || '').trim();
          const expected = (tc.expectedOutput || '').trim();
          const passed = actual === expected && data.status?.id === 3;
          if (passed) passedCount++;
        } catch (err) {
          console.error("Error executing test case in auto-submit:", err);
        }
      }
      
      const maxScore = 10;
      const obtained = Math.round((passedCount / allTestCases.length) * maxScore);
      
      const timeTakenVal = 600 - timeLeft;
      const payload = {
        batchId: batchId,
        candidateId: candId,
        assessmentName: currentAttempt === 2 ? `${activeCoding.topic} (Attempt 2)` : activeCoding.topic,
        totalScore: maxScore,
        obtainedScore: obtained,
        timeTaken: timeTakenVal
      };
      
      await api.post('/assessment/create', payload);
      
      const completionKey = `completed_topic_${batchId}_${candId}_${activeCoding.topic}`;
      localStorage.setItem(completionKey, 'true');
      localStorage.setItem(`${completionKey}_${currentAttempt}`, 'true');

      // Clear active session
      const sessionKey = `active_session_${batchId}_${candId}_${activeCoding.topic}`;
      localStorage.removeItem(sessionKey);
      
      if (isDisqualified) {
        toast.success("Violations limit exceeded. Session terminated and code submitted.", { id: 'coding-submit' });
      } else {
        toast.success("Time expired. Code auto-submitted successfully!", { id: 'coding-submit' });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Auto-submission failed, but session ended.", { id: 'coding-submit' });
    } finally {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (e) {
          console.error(e);
        }
      }
      setActiveCoding(null);
      setEditorCode('');
      setCustomInput('');
      setCodeOutput('');
      setTestCaseResults([]);
      setIdeFinished(false);
      setIdeResult(null);
      setIdeTab('problem');
      setIsFullscreen(false);
      setIsAutoSubmitting(false);
      setViolations(0);
      fetchTraineeData();
    }
  };

  const handleLockTrigger = () => {
    if (!activeCoding || ideFinished || isAutoSubmitting) return;
    setViolations(prev => {
      const next = prev + 1;
      if (next > 2) {
        handleAutoSubmitCoding(true);
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.error("Error exiting fullscreen on blur:", err));
        }
        setIsFullscreen(false);
        toast.error(`Suspicious activity detected! Warning ${next}/2. Assessment locked.`, { id: 'lock-warn', duration: 5000 });
      }
      return next;
    });
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (activeCoding) {
        if (!document.fullscreenElement) {
          handleLockTrigger();
        } else {
          setIsFullscreen(true);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [activeCoding, editorCode, editorLanguage, batchDetails, candidate]);

  // Prevent accidental close or page leaving & lock on tab/window switch
  useEffect(() => {
    if (!activeCoding || ideFinished || isAutoSubmitting) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Assessment is in progress. Leaving now will auto-submit your current code.';
      return e.returnValue;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleLockTrigger();
      }
    };

    const handleWindowBlur = () => {
      handleLockTrigger();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [activeCoding, ideFinished, isAutoSubmitting, editorCode, editorLanguage, batchDetails, candidate]);

  // Timer countdown
  useEffect(() => {
    if (!activeCoding || ideFinished || isAutoSubmitting) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCoding, ideFinished, isAutoSubmitting]);

  // Handle timeout
  useEffect(() => {
    if (activeCoding && timeLeft <= 0 && !ideFinished && !isAutoSubmitting) {
      handleAutoSubmitCoding();
    }
  }, [timeLeft, activeCoding, ideFinished, isAutoSubmitting]);

  // Trainee View rendering
  const [searchParams] = useSearchParams();
  const [traineeSubTab, setTraineeSubTab] = useState<'mcq' | 'coding'>(() => {
    return searchParams.get('tab') === 'coding' ? 'coding' : 'mcq';
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'coding' || tabParam === 'mcq') {
      setTraineeSubTab(tabParam);
    }
  }, [searchParams]);

  if (user?.role === 'TRAINEE') {
    if (loadingTrainee) {
      return <MorphLoader minHeight="60vh" text="Loading planned assessments..." />;
    }

    if (!batchDetails) {
      return (
        <div className="card card-glow-orange" style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '40px auto' }}>
          <AlertCircle size={40} color="var(--pale-orange)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 20, color: 'var(--text-primary)', fontWeight: 800 }}>No Cohort Assigned</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            You are not assigned to an active training cohort. Please contact your coordinator.
          </p>
        </div>
      );
    }

    const plannedAssessments = batchDetails.questions || [];
    const plannedCodingAssessments = batchDetails.codingQuestions || [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>My Assessments</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>View curriculum tests and submit assessments</p>
          </div>
          
          {(batchDetails.category === 'STREAM' || batchDetails.category === 'FOUNDATIONAL') && (
            <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.1)', padding: 4, borderRadius: 10 }}>
              <button
                onClick={() => setTraineeSubTab('mcq')}
                style={{
                  padding: '8px 16px',
                  background: traineeSubTab === 'mcq' ? 'var(--powder-blue)' : 'transparent',
                  border: 'none',
                  color: traineeSubTab === 'mcq' ? '#121824' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                MCQ Tests
              </button>
              <button
                onClick={() => setTraineeSubTab('coding')}
                style={{
                  padding: '8px 16px',
                  background: traineeSubTab === 'coding' ? 'var(--powder-blue)' : 'transparent',
                  border: 'none',
                  color: traineeSubTab === 'coding' ? '#121824' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Coding IDE
              </button>
            </div>
          )}
        </div>

        {traineeSubTab === 'mcq' || (batchDetails.category !== 'STREAM' && batchDetails.category !== 'FOUNDATIONAL') ? (
          /* MCQ Assessment List */
          plannedAssessments.length === 0 ? (
            <div className="card card-glow-orange" style={{ padding: 40, textAlign: 'center' }}>
              <FileText size={40} color="var(--pale-orange)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 800 }}>No Planned Assessments</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8, maxWidth: 500, margin: '8px auto 0' }}>
                Your training cohort does not have planned topic assessments generated yet. Please ask your trainer to generate assessment questions for the batch.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {plannedAssessments.map((topicGroup: any, idx: number) => {
                const qBatch = topicGroup._batch || batchDetails;
                const qCand = topicGroup._candidate || candidate;
                const batchId = qBatch?.id || qBatch?._id || '';
                const candId = qCand?.id || qCand?._id || '';
                const topicName = topicGroup?.topic || '';
                const completionKey = `completed_topic_${batchId}_${candId}_${topicName}`;
                const isUnlocked = localStorage.getItem(completionKey) === 'true' || user?.email === 'rkbhashyam83@gmail.com' || user?.email === 'arunodayashine@gmail.com';

                const topicSubmissions = (submittedAssessments || [])
                  .filter((a: any) => {
                    const name = (a?.assessmentName || '').toLowerCase().trim();
                    const normTopic = topicName.toLowerCase().trim();
                    // Match topic name exactly or with attempt suffixes like (attempt 1), - attempt 2, etc.
                    return name === normTopic ||
                           name === `${normTopic} (attempt 2)` ||
                           name === `${normTopic} - attempt 1` ||
                           name === `${normTopic} - attempt 2` ||
                           name.startsWith(normTopic + " (attempt") ||
                           name.startsWith(normTopic + " - attempt");
                  })
                  .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
                const attempt1 = topicSubmissions[0];
                const attempt2 = topicSubmissions[1];
                const a1Completed = !!attempt1;
                const a2Completed = !!attempt2;
                const attempt1Passed = attempt1 && attempt1.result === 'PASS';
                const isAttempt1Failed = attempt1 && attempt1.result === 'FAIL';
                const isCompleted = attempt1Passed || a2Completed;

                return (
                  <div
                    key={idx}
                    className={`card ${isCompleted ? 'card-glow-blue' : isUnlocked ? 'card-glow-orange' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '24px 32px',
                      opacity: isUnlocked || isCompleted || a1Completed ? 1 : 0.65,
                      background: isCompleted ? 'rgba(34, 197, 94, 0.02)' : 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 16
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: isCompleted
                            ? 'rgba(34, 197, 94, 0.1)'
                            : isUnlocked
                            ? 'var(--powder-blue-glow)'
                            : 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${
                            isCompleted ? '#22c55e' : isUnlocked ? 'var(--powder-blue)' : 'var(--border-color)'
                          }`
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={22} color="#22c55e" />
                        ) : isUnlocked ? (
                          <Unlock size={22} color="var(--powder-blue)" />
                        ) : (
                          <Lock size={22} color="var(--text-secondary)" />
                        )}
                      </div>

                      <div>
                        <h3 style={{ fontSize: 16.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                          {topicGroup._batch ? `[${topicGroup._batch.batchName}] ${topicName}` : topicName}
                        </h3>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {topicGroup?.questions?.length || 0} MCQ Questions • Max attempts: 2
                          </span>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border-color)' }} />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: isCompleted ? '#22c55e' : isUnlocked ? 'var(--powder-blue)' : 'var(--text-muted)'
                            }}
                          >
                            {isCompleted ? 'COMPLETED' : isUnlocked ? 'READY' : 'LOCKED'}
                          </span>
                        </div>

                        {/* MCQ Attempts History */}
                        {(a1Completed || a2Completed) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                            {a1Completed && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Attempt 1:</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                                  {attempt1?.obtainedScore ?? 0} / {attempt1?.totalScore ?? 0}
                                </span>
                                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-color)' }} />
                                <span style={{
                                  color: attempt1?.result === 'PASS' ? '#22c55e' : '#ef4444',
                                  fontWeight: 700
                                }}>
                                  {attempt1?.result || 'FAIL'}
                                </span>
                              </div>
                            )}
                            {a2Completed && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Attempt 2:</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                                  {attempt2?.obtainedScore ?? 0} / {attempt2?.totalScore ?? 0}
                                </span>
                                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-color)' }} />
                                <span style={{
                                  color: attempt2?.result === 'PASS' ? '#22c55e' : '#ef4444',
                                  fontWeight: 700
                                }}>
                                  {attempt2?.result || 'FAIL'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {isCompleted ? (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800 }}>BEST SCORE</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {Math.max(attempt1?.obtainedScore ?? 0, attempt2?.obtainedScore ?? 0)} / {attempt1?.totalScore ?? 0}
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: 'rgba(34,197,94,0.1)',
                              color: '#22c55e',
                              border: '1px solid rgba(34,197,94,0.2)'
                            }}
                          >
                            COMPLETED
                          </span>
                        </div>
                      ) : isUnlocked ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          {a1Completed && (
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginRight: 4 }}>
                              Attempt 1: {attempt1?.obtainedScore}/{attempt1?.totalScore} ({attempt1?.result})
                            </div>
                          )}
                          {a1Completed ? (
                            isAttempt1Failed ? (
                              <button
                                onClick={() => {
                                  setCurrentAttempt(2);
                                  setActiveQuiz(topicGroup);
                                  setCurrentQuestionIdx(0);
                                  setSelectedAnswers({});
                                }}
                                className="btn-primary"
                                style={{
                                  padding: '10px 20px',
                                  fontSize: 13.5,
                                  fontWeight: 700,
                                  borderRadius: 10,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  cursor: 'pointer'
                                }}
                              >
                                <Play size={14} fill="#ffffff" /> Start Attempt 2
                              </button>
                            ) : null
                          ) : (
                            <button
                              onClick={() => {
                                setCurrentAttempt(1);
                                setActiveQuiz(topicGroup);
                                setCurrentQuestionIdx(0);
                                setSelectedAnswers({});
                              }}
                              className="btn-primary"
                              style={{
                                padding: '10px 20px',
                                fontSize: 13.5,
                                fontWeight: 700,
                                borderRadius: 10,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                cursor: 'pointer'
                              }}
                            >
                              <Play size={14} fill="#ffffff" /> Start Test
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 13,
                            color: 'var(--text-muted)',
                            fontWeight: 600
                          }}
                        >
                          <Lock size={14} /> Locked
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Coding Assessment List */
          plannedCodingAssessments.length === 0 ? (
            <div className="card card-glow-orange" style={{ padding: 40, textAlign: 'center' }}>
              <Terminal size={40} color="var(--pale-orange)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 800 }}>No Coding Challenges Ready</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8, maxWidth: 500, margin: '8px auto 0' }}>
                Your training cohort does not have planned coding assessments generated yet. Please ask your coordinator to generate coding challenges.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {plannedCodingAssessments.map((codingGroup: any, idx: number) => {
                const qBatch = codingGroup._batch || batchDetails;
                const qCand = codingGroup._candidate || candidate;
                const batchId = qBatch?.id || qBatch?._id || '';
                const candId = qCand?.id || qCand?._id || '';
                const topicName = codingGroup?.topic || '';
                
                // For unlocking, Coding assessments also correspond to completion check of target topics
                const completionKey = `completed_topic_${batchId}_${candId}_${topicName}`;
                const isUnlocked = localStorage.getItem(completionKey) === 'true' || user?.email === 'rkbhashyam83@gmail.com' || user?.email === 'arunodayashine@gmail.com';

                const topicSubmissions = (submittedAssessments || [])
                  .filter((a: any) => {
                    const name = (a?.assessmentName || '').toLowerCase().trim();
                    const normTopic = topicName.toLowerCase().trim();
                    return name === normTopic ||
                           name === `${normTopic} (attempt 2)` ||
                          name === `${normTopic} - attempt 1` ||
                           name === `${normTopic} - attempt 2` ||
                           name.startsWith(normTopic + " (attempt") ||
                           name.startsWith(normTopic + " - attempt");
                  })
                  .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
                const attempt1 = topicSubmissions[0];
                const attempt2 = topicSubmissions[1];
                const a1Completed = !!attempt1;
                const a2Completed = !!attempt2;

                const isAttempt1Disqualified = localStorage.getItem(`disqualified_${batchId}_${candId}_${topicName}_1`) === 'true' || 
                                               localStorage.getItem(`disqualified_${batchId}_${candId}_${topicName}`) === 'true';
                const isAttempt2Disqualified = localStorage.getItem(`disqualified_${batchId}_${candId}_${topicName}_2`) === 'true';

                const attempt1Passed = attempt1 && attempt1.obtainedScore >= 8 && !isAttempt1Disqualified;
                const isAttempt1Failed = isAttempt1Disqualified || (attempt1 && (attempt1.obtainedScore < 8 || attempt1.result === 'FAIL'));
                const isCompleted = !!attempt1Passed || a2Completed || isAttempt2Disqualified;

                return (
                  <div
                    key={idx}
                    className={`card ${isCompleted ? 'card-glow-blue' : isUnlocked ? 'card-glow-orange' : ''}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '24px',
                      opacity: isUnlocked || isCompleted || a1Completed || isAttempt1Disqualified ? 1 : 0.65,
                      background: isCompleted ? 'rgba(34, 197, 94, 0.02)' : 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 16,
                      position: 'relative',
                      overflow: 'hidden',
                      height: '100%',
                      minHeight: 340
                    }}
                  >
                    {/* Corner glow */}
                    <div style={{ 
                      position: 'absolute', 
                      top: -40, 
                      right: -40, 
                      width: 120, 
                      height: 120, 
                      background: isCompleted 
                        ? 'rgba(34, 197, 94, 0.15)' 
                        : isUnlocked 
                          ? 'var(--powder-blue-glow)' 
                          : 'rgba(255, 255, 255, 0.02)', 
                      borderRadius: '50%', 
                      filter: 'blur(20px)', 
                      opacity: 0.5,
                      pointerEvents: 'none'
                    }} />

                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, zIndex: 1 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: isCompleted
                            ? 'rgba(34, 197, 94, 0.1)'
                            : isUnlocked
                            ? 'var(--powder-blue-glow)'
                            : 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${
                            isCompleted ? '#22c55e' : isUnlocked ? 'var(--powder-blue)' : 'var(--border-color)'
                          }`
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={18} color="#22c55e" />
                        ) : isUnlocked ? (
                          <Unlock size={18} color="var(--powder-blue)" />
                        ) : (
                          <Lock size={18} color="var(--text-secondary)" />
                        )}
                      </div>

                      <span
                        className={isCompleted ? 'badge-glow-green' : isUnlocked ? 'badge-glow-blue' : 'badge-glow-red'}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {isCompleted ? 'COMPLETED' : isUnlocked ? 'READY' : 'LOCKED'}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, zIndex: 1, marginBottom: 20 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', lineHeight: 1.4 }}>
                          {codingGroup._batch ? `[${codingGroup._batch.batchName}] ${topicName}` : topicName}
                        </h3>
                        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                          1 AI-Generated Coding Assessment • Max attempts: 2
                        </p>
                      </div>

                      {/* Coding Attempts History */}
                      {(a1Completed || isAttempt1Disqualified || a2Completed || isAttempt2Disqualified) && (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 8, 
                          marginTop: 4,
                          padding: '10px 12px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 10
                        }}>
                          {(a1Completed || isAttempt1Disqualified) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Attempt 1:</span>
                              {isAttempt1Disqualified && !attempt1 ? (
                                <span style={{ color: '#ef4444', fontWeight: 700 }}>Disqualified</span>
                              ) : (
                                <>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                                    {attempt1?.obtainedScore ?? 0} / {attempt1?.totalScore ?? 10}
                                  </span>
                                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-color)' }} />
                                  <span style={{
                                    color: attempt1?.result === 'PASS' ? '#22c55e' : '#ef4444',
                                    fontWeight: 700
                                  }}>
                                    {attempt1?.result || 'FAIL'}
                                  </span>
                                  {attempt1?.timeTaken !== undefined && (
                                    <>
                                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-color)' }} />
                                      <span style={{ color: 'var(--text-muted)' }}>
                                        {formatTime(attempt1.timeTaken)}
                                      </span>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                          {(a2Completed || isAttempt2Disqualified) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Attempt 2:</span>
                              {isAttempt2Disqualified && !attempt2 ? (
                                <span style={{ color: '#ef4444', fontWeight: 700 }}>Disqualified</span>
                              ) : (
                                <>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                                    {attempt2?.obtainedScore ?? 0} / {attempt2?.totalScore ?? 10}
                                  </span>
                                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-color)' }} />
                                  <span style={{
                                    color: attempt2?.result === 'PASS' ? '#22c55e' : '#ef4444',
                                    fontWeight: 700
                                  }}>
                                    {attempt2?.result || 'FAIL'}
                                  </span>
                                  {attempt2?.timeTaken !== undefined && (
                                    <>
                                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-color)' }} />
                                      <span style={{ color: 'var(--text-muted)' }}>
                                        {formatTime(attempt2.timeTaken)}
                                      </span>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div style={{ 
                      marginTop: 'auto', 
                      paddingTop: 16, 
                      borderTop: '1px solid var(--border-color)', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      zIndex: 1 
                    }}>
                      {isCompleted ? (
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: 0.5 }}>BEST SCORE</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {Math.max(attempt1?.obtainedScore ?? 0, attempt2?.obtainedScore ?? 0)} / 10
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: 0.5 }}>ATTEMPTS</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {attempt1 ? '1 / 2' : '0 / 2'}
                          </div>
                        </div>
                      )}

                      <div>
                        {isCompleted ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '6px 12px',
                              borderRadius: 8,
                              background: 'rgba(34,197,94,0.1)',
                              color: '#22c55e',
                              border: '1px solid rgba(34,197,94,0.2)',
                              display: 'inline-block'
                            }}
                          >
                            COMPLETED
                          </span>
                        ) : isAttempt2Disqualified ? (
                          <button
                            disabled
                            className="btn-secondary"
                            style={{
                              padding: '8px 14px',
                              fontSize: 12.5,
                              fontWeight: 700,
                              borderRadius: 10,
                              cursor: 'not-allowed',
                              opacity: 0.65,
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              background: 'rgba(239, 68, 68, 0.05)',
                              color: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <Lock size={13} /> Disabled
                          </button>
                        ) : isUnlocked ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {(a1Completed || isAttempt1Disqualified) ? (
                              isAttempt1Failed ? (
                                <button
                                  onClick={() => handleOpenIDE(codingGroup, 2)}
                                  className="btn-primary"
                                  style={{
                                    padding: '8px 16px',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    borderRadius: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Terminal size={13} /> Start Attempt 2
                                </button>
                              ) : null
                            ) : (
                              <button
                                onClick={() => handleOpenIDE(codingGroup, 1)}
                                className="btn-primary"
                                style={{
                                  padding: '8px 16px',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  borderRadius: 10,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  cursor: 'pointer'
                                }}
                              >
                                <Terminal size={13} /> Open IDE
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 13,
                              color: 'var(--text-muted)',
                              fontWeight: 600
                            }}
                          >
                            <Lock size={13} /> Locked
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Quiz Modal Render */}
        {activeQuiz &&
          createPortal(
            <div className="quiz-modal-overlay">
              <style>{`
                .quiz-modal-overlay {
                  position: fixed;
                  inset: 0;
                  background: rgba(15, 23, 42, 0.4);
                  z-index: 1000;
                  backdrop-filter: blur(20px);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 24px;
                }
                .dark .quiz-modal-overlay {
                  background: rgba(8, 12, 24, 0.85);
                }
                .quiz-modal-card {
                  background: rgba(255, 255, 255, 0.9);
                  border: 1px solid rgba(168, 208, 230, 0.5);
                  box-shadow: 0 25px 60px -15px rgba(135, 206, 235, 0.15);
                  color: var(--text-primary);
                  width: 100%;
                  max-width: 620px;
                  display: flex;
                  flex-direction: column;
                  gap: 24px;
                  padding: 32px;
                  position: relative;
                  border-radius: 24px;
                  backdrop-filter: blur(30px);
                  font-family: 'Outfit', sans-serif;
                  box-sizing: border-box;
                  transition: all 0.3s ease;
                }
                .dark .quiz-modal-card {
                  background: rgba(23, 28, 41, 0.9);
                  border-color: rgba(255, 255, 255, 0.08);
                  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
                }
                .quiz-option-btn {
                  background: rgba(0, 0, 0, 0.02);
                  border: 1px solid var(--border-color);
                  color: var(--text-primary);
                  padding: 16px 20px;
                  border-radius: 12px;
                  font-size: 14.5px;
                  text-align: left;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  font-weight: 500;
                  width: 100%;
                }
                .quiz-option-btn:hover {
                  background: rgba(112, 214, 255, 0.05);
                  border-color: var(--powder-blue);
                }
                .quiz-option-btn.selected {
                  background: var(--powder-blue-glow);
                  border-color: var(--powder-blue);
                  box-shadow: 0 0 12px rgba(112, 214, 255, 0.15);
                  font-weight: 700;
                }
                .dark .quiz-option-btn {
                  background: rgba(255, 255, 255, 0.02);
                }
                .dark .quiz-option-btn:hover {
                  background: rgba(255, 255, 255, 0.04);
                  border-color: rgba(255, 255, 255, 0.2);
                }
                .dark .quiz-option-btn.selected {
                  background: rgba(112, 214, 255, 0.12);
                  border-color: rgba(112, 214, 255, 0.45);
                  color: #ffffff;
                }
              `}</style>

              <div className="quiz-modal-card fade-in">
                {!quizFinished ? (
                  <>
                    <button className="curriculum-close-btn" style={{ position: 'absolute', top: 20, right: 20 }} onClick={closeQuiz}>
                      <X size={16} />
                    </button>

                    <div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: 'var(--powder-blue)',
                          textTransform: 'uppercase',
                          letterSpacing: 0.8
                        }}
                      >
                        Topic Assessment
                      </span>
                      <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                        {activeQuiz.topic}
                      </h3>
                      <div
                        style={{
                          height: 4,
                          background: 'var(--border-color)',
                          borderRadius: 2,
                          marginTop: 16,
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            background: 'var(--powder-blue)',
                            width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%`,
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 8 }}>
                        Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
                      </p>
                    </div>

                    <div style={{ minHeight: 220, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 8 }}>
                        {activeQuiz.questions[currentQuestionIdx]?.question}
                      </h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {activeQuiz.questions[currentQuestionIdx]?.options.map((option: string, oIdx: number) => {
                          const isSelected = selectedAnswers[currentQuestionIdx] === option;
                          return (
                            <button
                              key={oIdx}
                              onClick={() => setSelectedAnswers(prev => ({ ...prev, [currentQuestionIdx]: option }))}
                              className={`quiz-option-btn ${isSelected ? 'selected' : ''}`}
                            >
                              <span style={{ marginRight: 12, opacity: 0.5, fontWeight: 800 }}>
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: 20
                      }}
                    >
                      <button
                        onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                        disabled={currentQuestionIdx === 0}
                        className="slide-nav-btn"
                        style={{ padding: '8px 16px', fontSize: 13, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        Previous
                      </button>

                      {currentQuestionIdx === activeQuiz.questions.length - 1 ? (
                        <button
                          onClick={handleSubmitQuiz}
                          disabled={submittingQuiz || Object.keys(selectedAnswers).length < activeQuiz.questions.length}
                          className="btn-primary"
                          style={{
                            padding: '10px 24px',
                            fontSize: 13.5,
                            borderRadius: 10,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {submittingQuiz ? 'Submitting...' : 'Submit Test'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                          disabled={!selectedAnswers[currentQuestionIdx]}
                          className="slide-nav-btn"
                          style={{ padding: '8px 16px', fontSize: 13, borderRadius: 10 }}
                        >
                          Next Question
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }} className="fade-in">
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: quizResult?.result === 'PASS' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `2px solid ${quizResult?.result === 'PASS' ? '#22c55e' : '#ef4444'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {quizResult?.result === 'PASS' ? (
                        <Award size={36} color="#22c55e" />
                      ) : (
                        <AlertCircle size={36} color="#ef4444" />
                      )}
                    </div>

                    <div>
                      <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {quizResult?.result === 'PASS' ? 'Test Passed!' : 'Test Completed'}
                      </h3>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                        You scored {quizResult?.obtainedScore} out of {quizResult?.totalScore} questions correctly.
                      </p>
                    </div>

                    <div
                      style={{
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 16,
                        padding: '16px 32px',
                        display: 'flex',
                        gap: 32,
                        marginTop: 8
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                          {quizResult?.percentage.toFixed(0)}%
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Score Percentage</span>
                      </div>
                      <div style={{ width: 1, background: 'var(--border-color)' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            marginTop: 4,
                            color: quizResult?.result === 'PASS' ? '#22c55e' : '#ef4444'
                          }}
                        >
                          {quizResult?.result}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Status</span>
                      </div>
                    </div>

                    <button
                      onClick={closeQuiz}
                      className="btn-primary"
                      style={{
                        padding: '12px 28px',
                        fontSize: 14,
                        borderRadius: 12,
                        fontWeight: 700,
                        marginTop: 12,
                        cursor: 'pointer',
                        width: '100%',
                        maxWidth: 200
                      }}
                    >
                      Back to Assessments
                    </button>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}

        {/* Trainee split-screen Monaco IDE Modal */}
        {activeCoding &&
          createPortal(
            <div className="ide-modal-overlay">
              <style>{`
                .ide-modal-overlay {
                  position: fixed;
                  inset: 0;
                  background: rgba(10, 14, 22, 0.85);
                  z-index: 1000;
                  backdrop-filter: blur(16px);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 20px;
                  box-sizing: border-box;
                }
                .ide-modal-card {
                  background: #111520;
                  border: 1px solid rgba(255, 255, 255, 0.08);
                  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.7);
                  width: 100%;
                  height: 100%;
                  max-width: 1350px;
                  max-height: 820px;
                  border-radius: 20px;
                  display: grid;
                  grid-template-rows: 64px 1fr;
                  overflow: hidden;
                  font-family: 'Outfit', sans-serif;
                  color: #e2e8f0;
                }
                .ide-header {
                  height: 64px;
                  background: #161c28;
                  border-bottom: 1px solid rgba(255,255,255,0.08);
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 0 24px;
                }
                .ide-workspace {
                  display: grid;
                  grid-template-columns: 1fr 1.2fr;
                  height: 100%;
                  min-height: 0;
                }
                .ide-left-pane {
                  border-right: 1px solid rgba(255,255,255,0.08);
                  display: flex;
                  flex-direction: column;
                  overflow-y: auto;
                  padding: 24px;
                  gap: 20px;
                }
                .ide-right-pane {
                  display: grid;
                  grid-template-rows: 1fr 200px 54px;
                  min-height: 0;
                }
                .ide-editor-container {
                  position: relative;
                  min-height: 0;
                  background: #1e1e1e;
                }
                .ide-terminal-pane {
                  border-top: 1px solid rgba(255,255,255,0.08);
                  background: #0d111a;
                  display: flex;
                  flex-direction: column;
                  padding: 16px 20px;
                  min-height: 0;
                }
                .ide-footer-bar {
                  background: #161c28;
                  border-top: 1px solid rgba(255,255,255,0.08);
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 0 20px;
                }
                .ide-tab-btn {
                  background: transparent;
                  border: none;
                  color: #94a3b8;
                  font-weight: 700;
                  font-size: 13px;
                  cursor: pointer;
                  padding: 6px 12px;
                  border-radius: 6px;
                  transition: all 0.2s;
                }
                .ide-tab-btn.active {
                  background: rgba(112, 214, 255, 0.12);
                  color: var(--powder-blue);
                }
                @keyframes pulseGlowRed {
                  0% { box-shadow: 0 0 4px rgba(239, 68, 68, 0.2); }
                  100% { box-shadow: 0 0 16px rgba(239, 68, 68, 0.6); }
                }
                @keyframes pulseDotRed {
                  0% { opacity: 0.3; }
                  100% { opacity: 1; }
                }
                .pulse-dot-red {
                  animation: pulseDotRed 0.8s infinite alternate;
                }
              `}</style>

              <div className="ide-modal-card fade-in" style={{ position: 'relative' }}>
                {!isFullscreen && !ideFinished && !isAutoSubmitting && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: '#0d111a',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 20,
                    padding: 32,
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '2px solid #ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
                    }}>
                      <Lock size={40} color="#ef4444" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff' }}>Assessment Mode Locked</h3>
                      <p style={{ color: '#94a3b8', maxWidth: 460, fontSize: 14.5, marginTop: 8, lineHeight: 1.5 }}>
                        To ensure test integrity, this coding assessment must be taken in full screen. Click the button below to re-enter fullscreen and resume.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (document.documentElement.requestFullscreen) {
                          document.documentElement.requestFullscreen().then(() => {
                            setIsFullscreen(true);
                          }).catch(err => {
                            console.error("Failed to restore fullscreen:", err);
                          });
                        }
                      }}
                      className="btn-primary"
                      style={{
                        padding: '12px 28px',
                        fontSize: 14,
                        borderRadius: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: 8
                      }}
                    >
                      Re-enter Fullscreen & Resume
                    </button>
                  </div>
                )}
                {!ideFinished ? (
                  <>
                    {/* Header */}
                    <div className="ide-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <TerminalSquare size={20} color="var(--powder-blue)" />
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>{activeCoding.topic}</h3>
                          <span style={{ fontSize: 11.5, color: '#94a3b8' }}>Auto-graded Interactive Sandbox</span>
                        </div>
                      </div>

                      {/* Timer Display */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: timeLeft <= 120 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(112, 214, 255, 0.1)',
                        border: `1px solid ${timeLeft <= 120 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(112, 214, 255, 0.2)'}`,
                        padding: '6px 14px',
                        borderRadius: 10,
                        color: timeLeft <= 120 ? '#ef4444' : 'var(--powder-blue)',
                        fontWeight: 700,
                        fontSize: 14,
                        fontFamily: 'monospace',
                        boxShadow: timeLeft <= 120 ? '0 0 12px rgba(239, 68, 68, 0.2)' : 'none',
                        animation: timeLeft <= 120 ? 'pulseGlowRed 1.5s infinite alternate' : 'none'
                      }}>
                        <span className={timeLeft <= 120 ? 'pulse-dot-red' : ''} style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: timeLeft <= 120 ? '#ef4444' : 'var(--powder-blue)',
                          display: 'inline-block'
                        }} />
                        {formatTime(timeLeft)}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>Language:</span>
                          <select
                            value={editorLanguage}
                            disabled={getBatchLanguageConfig(activeCoding._batch || batchDetails, activeCoding).allowedLanguages.length <= 1}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditorLanguage(val);
                              setEditorCode(DEFAULT_BOILERPLATES[val] || '');
                            }}
                            className="glass-input"
                            style={{
                              background: '#0d111a',
                              borderColor: 'rgba(255,255,255,0.15)',
                              color: '#ffffff',
                              padding: '6px 12px',
                              fontSize: 12.5,
                              borderRadius: 8,
                              opacity: getBatchLanguageConfig(activeCoding._batch || batchDetails, activeCoding).allowedLanguages.length <= 1 ? 0.7 : 1,
                              cursor: getBatchLanguageConfig(activeCoding._batch || batchDetails, activeCoding).allowedLanguages.length <= 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {getBatchLanguageConfig(activeCoding._batch || batchDetails, activeCoding).allowedLanguages.includes('python') && <option value="python">Python 3</option>}
                            {getBatchLanguageConfig(activeCoding._batch || batchDetails, activeCoding).allowedLanguages.includes('javascript') && <option value="javascript">JavaScript (NodeJS)</option>}
                            {getBatchLanguageConfig(activeCoding._batch || batchDetails, activeCoding).allowedLanguages.includes('java') && <option value="java">Java 13</option>}
                            {getBatchLanguageConfig(activeCoding._batch || batchDetails, activeCoding).allowedLanguages.includes('cpp') && <option value="cpp">C++ (GCC)</option>}
                            {getBatchLanguageConfig(activeCoding._batch || batchDetails, activeCoding).allowedLanguages.includes('typescript') && <option value="typescript">TypeScript</option>}
                            {getBatchLanguageConfig(activeCoding._batch || batchDetails, activeCoding).allowedLanguages.includes('sql') && <option value="sql">SQL (SQLite)</option>}
                          </select>
                        </div>

                        <button
                          onClick={() => {
                            if (window.confirm("Reset editor to default boilerplate template? This will erase your current code changes.")) {
                              setEditorCode(DEFAULT_BOILERPLATES[editorLanguage] || '');
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontSize: 12,
                            color: '#94a3b8',
                            cursor: 'pointer'
                          }}
                        >
                          Reset Boilerplate
                        </button>
                      </div>
                    </div>

                    {/* Workspace */}
                    <div className="ide-workspace">
                      {/* Left Pane */}
                      <div className="ide-left-pane">
                        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
                          <button
                            onClick={() => setIdeTab('problem')}
                            className={`ide-tab-btn ${ideTab === 'problem' ? 'active' : ''}`}
                          >
                            Problem Statement
                          </button>
                          <button
                            onClick={() => setIdeTab('testcases')}
                            className={`ide-tab-btn ${ideTab === 'testcases' ? 'active' : ''}`}
                          >
                            Sample Test Cases ({testCaseResults.length > 0 ? `${testCaseResults.filter(r => r.passed).length}/${testCaseResults.length}` : 'Not Run'})
                          </button>
                        </div>

                        {ideTab === 'problem' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">
                            <div>
                              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>Description</h4>
                              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                {activeCoding.problemStatement}
                              </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                              <div>
                                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>Input Format</h4>
                                <p style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.4 }}>{activeCoding.inputFormat}</p>
                              </div>
                              <div>
                                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>Output Format</h4>
                                <p style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.4 }}>{activeCoding.outputFormat}</p>
                              </div>
                            </div>

                            <div>
                              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>Constraints</h4>
                              <code style={{ fontSize: 12, color: 'var(--pale-orange)', background: 'rgba(0,0,0,0.2)', padding: '3px 8px', borderRadius: 4, display: 'inline-block' }}>
                                {activeCoding.constraints}
                              </code>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>Sample Input</h4>
                              <pre style={{ background: '#0d111a', border: '1px solid rgba(255,255,255,0.06)', padding: 12, borderRadius: 8, fontSize: 11.5, overflowX: 'auto', color: '#e2e8f0' }}>
                                {activeCoding.sampleInput}
                              </pre>

                              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>Sample Output</h4>
                              <pre style={{ background: '#0d111a', border: '1px solid rgba(255,255,255,0.06)', padding: 12, borderRadius: 8, fontSize: 11.5, overflowX: 'auto', color: '#e2e8f0' }}>
                                {activeCoding.sampleOutput}
                              </pre>
                            </div>
                          </div>
                        )}

                        {ideTab === 'testcases' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade-in">
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>Run test cases to validate output behavior against expected assertions:</span>
                            {testCaseResults.length === 0 ? (
                              <div style={{ padding: '32px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <Cpu size={32} color="#64748b" style={{ margin: '0 auto 12px' }} />
                                <p style={{ fontSize: 13, color: '#94a3b8' }}>No visible test results run yet. Click "Run Code" in the action footer.</p>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {testCaseResults.map((res: any, idx: number) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: 14,
                                      borderRadius: 12,
                                      background: '#0d111a',
                                      border: `1px solid ${res.passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                      <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>Test Case {res.index}</span>
                                      <span style={{
                                        fontSize: 10.5,
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: 6,
                                        background: res.passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: res.passed ? '#10b981' : '#ef4444'
                                      }}>
                                        {res.passed ? 'PASSED' : 'FAILED'} ({res.status})
                                      </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11.5 }}>
                                      <div>
                                        <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Input:</span>
                                        <pre style={{ background: '#111520', padding: 6, borderRadius: 4, overflowX: 'auto' }}>{res.input}</pre>
                                      </div>
                                      <div>
                                        <span style={{ color: '#64748b', display: 'block', marginBottom: 2 }}>Expected:</span>
                                        <pre style={{ background: '#111520', padding: 6, borderRadius: 4, overflowX: 'auto' }}>{res.expected}</pre>
                                      </div>
                                    </div>
                                    {!res.passed && (
                                      <div style={{ marginTop: 8, fontSize: 11.5 }}>
                                        <span style={{ color: '#ef4444', display: 'block', marginBottom: 2 }}>Actual Output:</span>
                                        <pre style={{ background: 'rgba(239,68,68,0.05)', padding: 6, borderRadius: 4, overflowX: 'auto', border: '1px solid rgba(239,68,68,0.1)', color: '#ef4444' }}>{res.actual || '[Empty stdout]'}</pre>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Pane */}
                      <div className="ide-right-pane">
                        {/* Editor */}
                        <div className="ide-editor-container">
                          <Editor
                            height="100%"
                            language={LANGUAGE_MAP[editorLanguage].monaco}
                            theme={editorTheme}
                            value={editorCode}
                            onChange={(val) => setEditorCode(val || '')}
                            options={{
                              fontSize: 13.5,
                              minimap: { enabled: false },
                              fontFamily: "'Fira Code', Consolas, Monaco, monospace",
                              automaticLayout: true,
                              padding: { top: 12, bottom: 12 }
                            }}
                          />
                        </div>

                        {/* Terminal / Standard Input Drawer */}
                        <div className="ide-terminal-pane">
                          <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6, marginBottom: 8 }}>
                            <button
                              onClick={() => setIdeTab('console')}
                              className={`ide-tab-btn ${ideTab === 'console' ? 'active' : ''}`}
                            >
                              Console Output
                            </button>
                            <button
                              onClick={() => setIdeTab('console')}
                              className="ide-tab-btn"
                              style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}
                            >
                              Stdin Configuration
                            </button>
                          </div>

                          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, minHeight: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                              <span style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Standard Input (Stdin):</span>
                              <textarea
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                placeholder="Enter custom inputs for compilation here..."
                                style={{
                                  flex: 1,
                                  background: '#0a0d14',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: 8,
                                  padding: 10,
                                  color: '#e2e8f0',
                                  fontSize: 12,
                                  fontFamily: 'monospace',
                                  outline: 'none',
                                  resize: 'none'
                                }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                              <span style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Stdout / Stderr:</span>
                              <pre
                                style={{
                                  flex: 1,
                                  background: '#0a0d14',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: 8,
                                  padding: 10,
                                  color: '#2ecc71',
                                  fontSize: 11.5,
                                  fontFamily: 'monospace',
                                  overflowY: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  minHeight: 0
                                }}
                              >
                                {codeOutput || "[Terminal ready. Run code to compile output logs]"}
                              </pre>
                            </div>
                          </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="ide-footer-bar">
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button
                              disabled={isExecutingCode || isSubmittingCode}
                              onClick={handleTestCode}
                              className="btn-secondary"
                              style={{
                                padding: '6px 14px',
                                fontSize: 12.5,
                                borderRadius: 8,
                                border: '1px solid var(--border-color)',
                                background: 'var(--powder-blue-glow)',
                                color: 'var(--powder-blue)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <Play size={13} /> Run Code
                            </button>
                          </div>

                          <button
                            disabled={isExecutingCode || isSubmittingCode}
                            onClick={handleSubmitCoding}
                            className="btn-primary"
                            style={{
                              padding: '8px 20px',
                              fontSize: 12.5,
                              borderRadius: 8,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <CheckCircle size={13} /> Submit Code
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Success/Finished Modal state inside IDE */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 48, textAlign: 'center', height: '100%', gridRow: '1 / -1' }} className="fade-in">
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: ideResult?.result === 'PASS' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `2px solid ${ideResult?.result === 'PASS' ? '#10b981' : '#ef4444'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Award size={40} color={ideResult?.result === 'PASS' ? '#10b981' : '#ef4444'} />
                    </div>

                    <div>
                      <h3 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff' }}>
                        {ideResult?.result === 'PASS' ? 'Coding Challenge Accepted!' : 'Assessment Completed'}
                      </h3>
                      <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
                        Your submission has been evaluated against visible and hidden test cases.
                      </p>
                    </div>

                    <div
                      style={{
                        background: '#161c28',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 16,
                        padding: '16px 36px',
                        display: 'flex',
                        gap: 36
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#ffffff' }}>
                          {ideResult?.obtainedScore} / {ideResult?.totalScore}
                        </div>
                        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Test Cases Passed</span>
                      </div>
                      <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 800,
                            marginTop: 4,
                            color: ideResult?.result === 'PASS' ? '#10b981' : '#ef4444'
                          }}
                        >
                          {ideResult?.result}
                        </div>
                        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Evaluation Status</span>
                      </div>
                    </div>

                    <button
                      onClick={closeIDE}
                      className="btn-primary"
                      style={{
                        padding: '12px 32px',
                        fontSize: 14,
                        borderRadius: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        width: '100%',
                        maxWidth: 220
                      }}
                    >
                      Return to Assessments
                    </button>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }

  // Trainer/Coordinator original view
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Assessment Tracker</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Upload and manage assessment scores</p>
      </div>

      {/* ── Assessment Window Banner ─────────────────────────────────── */}
      {assessmentWindow && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            border: assessmentWindow.windowOpen
              ? '1px solid rgba(34, 197, 94, 0.35)'
              : '1px solid rgba(239, 68, 68, 0.35)',
            background: assessmentWindow.windowOpen
              ? 'linear-gradient(135deg, rgba(34,197,94,0.07), rgba(16,185,129,0.04))'
              : 'linear-gradient(135deg, rgba(239,68,68,0.07), rgba(220,38,38,0.04))',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Status icon */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: assessmentWindow.windowOpen
                ? 'rgba(34,197,94,0.12)'
                : 'rgba(239,68,68,0.12)',
              border: `1px solid ${assessmentWindow.windowOpen ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
              position: 'relative',
            }}
          >
            {assessmentWindow.windowOpen ? (
              <>
                <Unlock size={20} color="#22c55e" />
                {/* Pulse ring */}
                <span style={{
                  position: 'absolute', inset: -4, borderRadius: '50%',
                  border: '2px solid rgba(34,197,94,0.25)',
                  animation: 'ping 1.8s cubic-bezier(0,0,0.2,1) infinite'
                }} />
                <style>{`@keyframes ping{75%,100%{transform:scale(1.4);opacity:0}}`}</style>
              </>
            ) : (
              <Lock size={20} color="#ef4444" />
            )}
          </div>

          {/* Text */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: assessmentWindow.windowOpen ? '#22c55e' : '#ef4444',
                textTransform: 'uppercase'
              }}>
                {assessmentWindow.windowOpen ? '🟢 Assessment Window Open' : '🔴 Assessment Window Closed'}
              </span>
              {assessmentWindow.windowOpen && assessmentWindow.daysRemaining !== null && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: 'rgba(34,197,94,0.12)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)'
                }}>
                  {assessmentWindow.daysRemaining === 0
                    ? 'Closes Today'
                    : `${assessmentWindow.daysRemaining} day${assessmentWindow.daysRemaining !== 1 ? 's' : ''} remaining`}
                </span>
              )}
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
              {assessmentWindow.windowOpen
                ? <>
                    Training ended on{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {new Date(assessmentWindow.windowOpensOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </strong>.
                    {' '}Score entry locks on{' '}
                    <strong style={{ color: '#f97316' }}>
                      {new Date(assessmentWindow.windowClosesOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </strong>
                    {' '}({assessmentWindow.windowDays}-day window for{' '}
                    {assessmentWindow.category === 'FOUNDATIONAL' ? 'Foundational'
                      : assessmentWindow.category === 'STREAM' ? 'Stream'
                      : 'Spark'} training).
                    {' '}Attendance is now disabled.
                  </>
                : <>
                    The assessment window for this batch has expired. All score entries are locked.
                    {' '}Window was open from{' '}
                    <strong style={{ color: 'var(--text-muted)' }}>
                      {new Date(assessmentWindow.windowOpensOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </strong>
                    {' '}to{' '}
                    <strong style={{ color: 'var(--text-muted)' }}>
                      {new Date(assessmentWindow.windowClosesOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </strong>.
                  </>
              }
            </p>
          </div>

          {/* Category badge */}
          <div style={{
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 11.5,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            flexShrink: 0
          }}>
            {assessmentWindow.windowDays}d window
          </div>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card card-glow-blue card-static">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Pool Date</label>
                <CustomSelect 
                  value={selectedPoolDate} 
                  onChange={(val) => {
                    setSelectedPoolDate(val);
                    setSelectedBatch('');
                  }}
                  placeholder="-- Choose Pool Date --"
                  options={[
                    { value: '', label: '-- Choose Pool Date --' },
                    ...onboardingDates.map(d => ({
                      value: d,
                      label: d
                    }))
                  ]}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Batch Start Date</label>
                <CustomSelect 
                  value={selectedBatchStartDate} 
                  onChange={(val) => {
                    setSelectedBatchStartDate(val);
                    setSelectedBatch('');
                  }}
                  placeholder="-- Choose Start Date --"
                  options={[
                    { value: '', label: '-- Choose Start Date --' },
                    ...availableStartDates.map(d => ({
                      value: d,
                      label: new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    }))
                  ]}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Select Batch</label>
                <CustomSelect 
                  value={selectedBatch} 
                  onChange={setSelectedBatch}
                  disabled={filteredBatches.length === 0}
                  placeholder={filteredBatches.length === 0 ? "-- No Batches Available --" : "-- Choose Batch --"}
                  options={[
                    { value: '', label: "-- Choose Batch --" },
                    ...filteredBatches.map(b => ({
                      value: b._id,
                      label: b.batchName
                    }))
                  ]}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  onClick={handleDownloadReportCard}
                  disabled={!selectedBatch}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: !selectedBatch ? 'var(--border-color)' : 'linear-gradient(135deg, var(--powder-blue), var(--pale-orange))',
                    color: !selectedBatch ? 'var(--text-muted)' : '#121824',
                    border: 'none',
                    cursor: !selectedBatch ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: !selectedBatch ? 'none' : '0 4px 12px var(--pale-orange-glow)'
                  }}
                >
                  <Download size={18} />
                  Download Report Card
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Option A: Upload Scores */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="card card-glow-orange" style={{ minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--powder-blue-glow) 0%, var(--pale-orange-glow) 100%)', pointerEvents: 'none' }} />
              
              <motion.div whileHover={{ scale: 1.05 }} style={{ 
                width: 72, height: 72, borderRadius: '50%', 
                background: 'var(--powder-blue-glow)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                marginBottom: 20, border: '1px solid var(--powder-blue)'
              }}>
                <Upload size={28} color="var(--powder-blue)" />
              </motion.div>
              
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'Outfit, sans-serif' }}>Upload Scores</h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 320, marginBottom: 24, lineHeight: 1.5 }}>
                Select an Excel file containing the assessment scores. The scores will be mapped automatically.
              </p>

              <label style={{
                position: 'relative', cursor: !isFormValid ? 'not-allowed' : 'pointer',
                background: !isFormValid ? 'var(--border-color)' : 'linear-gradient(135deg, var(--pale-orange), var(--yellow))',
                color: !isFormValid ? 'var(--text-muted)' : '#121824', padding: '12px 24px', borderRadius: 12,
                fontWeight: 700, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: !isFormValid ? 'none' : '0 4px 16px var(--pale-orange-glow)', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (isFormValid) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.filter = 'brightness(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (isFormValid) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.filter = 'none';
                }
              }}
              >
                <input type="file" accept=".xlsx,.xls,.csv" style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }} onChange={handleFileUpload} disabled={!isFormValid} />
                <CheckCircle2 size={18} />
                Select Excel File
              </label>
              {!isFormValid && <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 12, fontWeight: 700 }}>Please select a batch first</p>}
            </div>
          </motion.div>

          {/* Option B: Manual Score Entry */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="card card-glow-blue card-static" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClipboardList size={20} color="var(--powder-blue)" />
                  Manual Score Entry
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Log or update individual assessment scores directly.
                </p>
              </div>

              <form onSubmit={handleSubmitManual} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Select Trainee</label>
                  <CustomSelect
                    value={selectedCandidateId}
                    onChange={setSelectedCandidateId}
                    disabled={!selectedBatch || batchCandidates.length === 0}
                    placeholder={!selectedBatch ? "-- Select Batch First --" : batchCandidates.length === 0 ? "-- No Candidates Enrolled --" : "-- Select Trainee --"}
                    options={[
                      { value: '', label: !selectedBatch ? "-- Select Batch First --" : batchCandidates.length === 0 ? "-- No Candidates Enrolled --" : "-- Select Trainee --" },
                      ...batchCandidates.map(c => ({
                        value: c.candidateId || c.id,
                        label: `${c.fullName} (${c.registrationNumber})`
                      }))
                    ]}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Assessment Name</label>
                  <CustomSelect
                    value={selectedAssessmentName}
                    onChange={setSelectedAssessmentName}
                    disabled={!selectedBatch || availableAssessments.length === 0}
                    placeholder={!selectedBatch ? "-- Select Batch First --" : availableAssessments.length === 0 ? "-- No Assessments Configured --" : "-- Select Assessment --"}
                    options={[
                      { value: '', label: !selectedBatch ? "-- Select Batch First --" : availableAssessments.length === 0 ? "-- No Assessments Configured --" : "-- Select Assessment --" },
                      ...availableAssessments.map(name => ({
                        value: name,
                        label: name
                      }))
                    ]}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Total Marks</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 100"
                      value={totalScore}
                      onChange={(e) => setTotalScore(e.target.value)}
                      disabled={!selectedBatch}
                      className="glass-input"
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-color)',
                        outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-main)',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Obtained Marks</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 85"
                      value={obtainedScore}
                      onChange={(e) => setObtainedScore(e.target.value)}
                      disabled={!selectedBatch}
                      className="glass-input"
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-color)',
                        outline: 'none', fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-main)',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingManual || !selectedBatch || !selectedCandidateId || !selectedAssessmentName || !totalScore || !obtainedScore}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: (!selectedBatch || !selectedCandidateId || !selectedAssessmentName || !totalScore || !obtainedScore)
                      ? 'var(--border-color)' 
                      : 'linear-gradient(135deg, var(--powder-blue), var(--pale-orange))',
                    color: (!selectedBatch || !selectedCandidateId || !selectedAssessmentName || !totalScore || !obtainedScore)
                      ? 'var(--text-muted)' 
                      : '#121824',
                    border: 'none',
                    cursor: (!selectedBatch || !selectedCandidateId || !selectedAssessmentName || !totalScore || !obtainedScore || submittingManual)
                      ? 'not-allowed' 
                      : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: (!selectedBatch || !selectedCandidateId || !selectedAssessmentName || !totalScore || !obtainedScore)
                      ? 'none' 
                      : '0 4px 12px var(--pale-orange-glow)',
                    marginTop: 8
                  }}
                >
                  {submittingManual ? 'Recording Score...' : 'Record Score'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
