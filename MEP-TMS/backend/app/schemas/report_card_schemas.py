from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# ============ Spark Report Card Schemas ============
class SparkReportCardBase(BaseModel):
    batchId: str
    candidateId: str
    supersetId: Optional[str] = None
    name: str
    email: EmailStr
    college: Optional[str] = None
    trainingName: Optional[str] = "Spark Phase 1"
    trainingStartDate: Optional[str] = None
    trainingEndDate: Optional[str] = None
    trainerName: Optional[str] = None
    batchNo: Optional[str] = None
    trainingStatus: Optional[str] = "Active"
    a1Score: Optional[float] = None
    a2Score: Optional[float] = None
    communicationSkills: Optional[float] = None
    interpersonalSkills: Optional[float] = None
    businessEtiquette: Optional[float] = None
    serviceOrientation: Optional[float] = None
    emotionalIntelligenceEmpathy: Optional[float] = None
    accountabilityOwnership: Optional[float] = None
    presentationSkills: Optional[float] = None
    finalStatus: Optional[str] = "Not Cleared"
    rank: Optional[int] = None
    reevaluationComments: Optional[str] = None
    totalDays: Optional[int] = 0
    presentDays: Optional[int] = 0
    absentDays: Optional[int] = 0
    attendancePercentage: Optional[float] = 0.0
    reasonForAbsence: Optional[str] = None
    pcName: Optional[str] = None

class SparkReportCardUpdate(BaseModel):
    supersetId: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    college: Optional[str] = None
    trainingName: Optional[str] = None
    trainingStartDate: Optional[str] = None
    trainingEndDate: Optional[str] = None
    trainerName: Optional[str] = None
    batchNo: Optional[str] = None
    trainingStatus: Optional[str] = None
    a1Score: Optional[float] = None
    a2Score: Optional[float] = None
    communicationSkills: Optional[float] = None
    interpersonalSkills: Optional[float] = None
    businessEtiquette: Optional[float] = None
    serviceOrientation: Optional[float] = None
    emotionalIntelligenceEmpathy: Optional[float] = None
    accountabilityOwnership: Optional[float] = None
    presentationSkills: Optional[float] = None
    finalStatus: Optional[str] = None
    rank: Optional[int] = None
    reevaluationComments: Optional[str] = None
    totalDays: Optional[int] = None
    presentDays: Optional[int] = None
    absentDays: Optional[int] = None
    attendancePercentage: Optional[float] = None
    reasonForAbsence: Optional[str] = None
    pcName: Optional[str] = None

class SparkReportCardResponse(SparkReportCardBase):
    id: str
    createdAt: datetime
    updatedAt: datetime


# ============ Foundational Report Card Schemas ============
class FoundationReportCardBase(BaseModel):
    batchId: str
    candidateId: str
    supersetId: Optional[str] = None
    name: str
    email: EmailStr
    college: Optional[str] = None
    contactNumber: Optional[str] = None
    foundationLanguage: Optional[str] = None
    status: Optional[str] = "Active"
    emailSentDate: Optional[datetime] = None
    reason: Optional[str] = None
    ga1_a1: Optional[float] = None
    ga1_a2: Optional[float] = None
    ga2_a1: Optional[float] = None
    ga2_a2: Optional[float] = None
    ga3_a1: Optional[float] = None
    ga3_a2: Optional[float] = None
    ga4_a1: Optional[float] = None
    ga4_a2: Optional[float] = None
    ga5_a1: Optional[float] = None
    ga5_a2: Optional[float] = None
    projectEval_a1: Optional[float] = None
    projectEval_a2: Optional[float] = None
    finalGrade_a1: Optional[float] = None
    finalGrade_a2: Optional[float] = None
    trainingStatus: Optional[str] = "Active"

class FoundationReportCardUpdate(BaseModel):
    supersetId: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    college: Optional[str] = None
    contactNumber: Optional[str] = None
    foundationLanguage: Optional[str] = None
    status: Optional[str] = None
    emailSentDate: Optional[datetime] = None
    reason: Optional[str] = None
    ga1_a1: Optional[float] = None
    ga1_a2: Optional[float] = None
    ga2_a1: Optional[float] = None
    ga2_a2: Optional[float] = None
    ga3_a1: Optional[float] = None
    ga3_a2: Optional[float] = None
    ga4_a1: Optional[float] = None
    ga4_a2: Optional[float] = None
    ga5_a1: Optional[float] = None
    ga5_a2: Optional[float] = None
    projectEval_a1: Optional[float] = None
    projectEval_a2: Optional[float] = None
    finalGrade_a1: Optional[float] = None
    finalGrade_a2: Optional[float] = None
    trainingStatus: Optional[str] = None

class FoundationReportCardResponse(FoundationReportCardBase):
    id: str
    createdAt: datetime
    updatedAt: datetime


# ============ Stream Report Card Schemas ============
class StreamReportCardBase(BaseModel):
    batchId: str
    candidateId: str
    doj: Optional[datetime] = None
    supersetId: Optional[str] = None
    empId: Optional[str] = None
    name: str
    email: EmailStr
    college: Optional[str] = None
    foundationLanguage: Optional[str] = None
    streamTraining: Optional[str] = None
    trainingStartDate: Optional[str] = None
    trainingEndDate: Optional[str] = None
    trainerName: Optional[str] = None
    batchNo: Optional[str] = None
    trainingStatus: Optional[str] = "Active"
    
    # MCQ
    mcq1_a1: Optional[float] = None
    mcq1_a2: Optional[float] = None
    mcq2_a1: Optional[float] = None
    mcq2_a2: Optional[float] = None
    mcq3_a1: Optional[float] = None
    mcq3_a2: Optional[float] = None
    mcq4_a1: Optional[float] = None
    mcq4_a2: Optional[float] = None
    mcq5_a1: Optional[float] = None
    mcq5_a2: Optional[float] = None
    mcq6_a1: Optional[float] = None
    mcq6_a2: Optional[float] = None
    mcq7_a1: Optional[float] = None
    mcq7_a2: Optional[float] = None
    
    # Coding
    coding1_a1: Optional[float] = None
    coding1_a2: Optional[float] = None
    coding2_a1: Optional[float] = None
    coding2_a2: Optional[float] = None
    coding3_a1: Optional[float] = None
    coding3_a2: Optional[float] = None
    coding4_a1: Optional[float] = None
    coding4_a2: Optional[float] = None
    coding5_a1: Optional[float] = None
    coding5_a2: Optional[float] = None
    coding6_a1: Optional[float] = None
    coding6_a2: Optional[float] = None
    coding7_a1: Optional[float] = None
    coding7_a2: Optional[float] = None
    
    # Projects
    projectScore1_a1: Optional[float] = None
    projectScore1_a2: Optional[float] = None
    projectScore2_a1: Optional[float] = None
    projectScore2_a2: Optional[float] = None
    
    # Online Coding
    onlineCoding_a1: Optional[float] = None
    onlineCoding_a2: Optional[float] = None
    
    finalStatus: Optional[str] = "Cleared"
    commentReason: Optional[str] = None
    
    totalDays: Optional[int] = 0
    presentDays: Optional[int] = 0
    absentDays: Optional[int] = 0
    attendancePercentage: Optional[float] = 0.0

class StreamReportCardUpdate(BaseModel):
    doj: Optional[datetime] = None
    supersetId: Optional[str] = None
    empId: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    college: Optional[str] = None
    foundationLanguage: Optional[str] = None
    streamTraining: Optional[str] = None
    trainingStartDate: Optional[str] = None
    trainingEndDate: Optional[str] = None
    trainerName: Optional[str] = None
    batchNo: Optional[str] = None
    trainingStatus: Optional[str] = None
    
    mcq1_a1: Optional[float] = None
    mcq1_a2: Optional[float] = None
    mcq2_a1: Optional[float] = None
    mcq2_a2: Optional[float] = None
    mcq3_a1: Optional[float] = None
    mcq3_a2: Optional[float] = None
    mcq4_a1: Optional[float] = None
    mcq4_a2: Optional[float] = None
    mcq5_a1: Optional[float] = None
    mcq5_a2: Optional[float] = None
    mcq6_a1: Optional[float] = None
    mcq6_a2: Optional[float] = None
    mcq7_a1: Optional[float] = None
    mcq7_a2: Optional[float] = None
    
    coding1_a1: Optional[float] = None
    coding1_a2: Optional[float] = None
    coding2_a1: Optional[float] = None
    coding2_a2: Optional[float] = None
    coding3_a1: Optional[float] = None
    coding3_a2: Optional[float] = None
    coding4_a1: Optional[float] = None
    coding4_a2: Optional[float] = None
    coding5_a1: Optional[float] = None
    coding5_a2: Optional[float] = None
    coding6_a1: Optional[float] = None
    coding6_a2: Optional[float] = None
    coding7_a1: Optional[float] = None
    coding7_a2: Optional[float] = None
    
    projectScore1_a1: Optional[float] = None
    projectScore1_a2: Optional[float] = None
    projectScore2_a1: Optional[float] = None
    projectScore2_a2: Optional[float] = None
    
    onlineCoding_a1: Optional[float] = None
    onlineCoding_a2: Optional[float] = None
    
    finalStatus: Optional[str] = None
    commentReason: Optional[str] = None
    
    totalDays: Optional[int] = None
    presentDays: Optional[int] = None
    absentDays: Optional[int] = None
    attendancePercentage: Optional[float] = None

class StreamReportCardResponse(StreamReportCardBase):
    id: str
    createdAt: datetime
    updatedAt: datetime
