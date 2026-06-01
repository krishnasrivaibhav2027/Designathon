from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ============ Enums ============
class UserRole(str, Enum):
    ADMIN = "ADMIN"
    COORDINATOR = "COORDINATOR"
    TRAINER = "TRAINER"
    TRAINEE = "TRAINEE"

class BatchStatus(str, Enum):
    PLANNED = "PLANNED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    CLOSED = "CLOSED"

class AttendanceStatus(str, Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LEAVE = "LEAVE"

class AssessmentResult(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    PENDING = "PENDING"

# ============ User Schemas ============
class UserBase(BaseModel):
    email: EmailStr
    fullName: str
    phone: Optional[str] = None
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    fullName: Optional[str] = None
    phone: Optional[str] = None

class UserResponse(UserBase):
    id: str
    createdAt: datetime
    updatedAt: datetime
    employeeId: Optional[str] = None
    isFirstLogin: Optional[bool] = True
    lastLogin: Optional[datetime] = None
    lastLogout: Optional[datetime] = None


class ProfileUpdateRequest(BaseModel):
    fullName: str
    phone: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str

# ============ Authentication Schemas ============
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    accessToken: str
    user: UserResponse
    expiresIn: int

class TokenValidate(BaseModel):
    isValid: bool
    user: Optional[UserResponse] = None

# ============ Batch Schemas ============
class BatchBase(BaseModel):
    batchName: str
    startDate: datetime
    endDate: datetime
    trainers: List[str]
    description: Optional[str] = None
    topics: List[str] = []
    sizeLimit: Optional[int] = None
    questions: List[dict] = []
    agent: Optional[dict] = None
    createdBy: Optional[str] = None
    category: Optional[str] = "SPARK"
    phase: Optional[str] = None
    onboardingDate: Optional[str] = None

class TraineeCreate(BaseModel):
    fullName: str
    email: EmailStr

class BatchCreate(BatchBase):
    onboardingDate: Optional[str] = None
    trainees: Optional[List[TraineeCreate]] = []
    autoSplit: Optional[bool] = False
    gapDays: Optional[int] = 7

class TraineeLoginRequest(BaseModel):
    username: str
    password: str

class BatchUpdate(BaseModel):
    batchName: Optional[str] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    status: Optional[BatchStatus] = None
    trainers: Optional[List[str]] = None
    description: Optional[str] = None
    topics: Optional[List[str]] = None
    sizeLimit: Optional[int] = None
    questions: Optional[List[dict]] = None
    agent: Optional[dict] = None
    category: Optional[str] = None
    phase: Optional[str] = None
    onboardingDate: Optional[str] = None

class BatchResponse(BatchBase):
    id: str
    batchId: str
    status: BatchStatus
    candidatesCount: int
    createdAt: datetime
    updatedAt: datetime
    warning: Optional[bool] = None
    warningMessage: Optional[str] = None

# ============ Candidate Schemas ============
class CandidateBase(BaseModel):
    email: EmailStr
    fullName: str
    phone: Optional[str] = None
    batchId: str

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(BaseModel):
    fullName: Optional[str] = None
    phone: Optional[str] = None

class CandidateResponse(CandidateBase):
    id: str
    registrationNumber: str
    progress: Optional[dict] = None
    createdAt: datetime
    updatedAt: datetime
    isActive: Optional[bool] = True

class CandidateStatusUpdate(BaseModel):
    isActive: bool

# ============ Attendance Schemas ============
class AttendanceBase(BaseModel):
    batchId: str
    candidateId: str
    date: datetime
    status: AttendanceStatus

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    status: AttendanceStatus

class AttendanceResponse(AttendanceBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

class AttendanceBatchResponse(BaseModel):
    date: datetime
    presentCount: int
    absentCount: int
    leaveCount: int

# ============ Assessment Schemas ============
class AssessmentBase(BaseModel):
    batchId: str
    candidateId: str
    assessmentName: str
    totalScore: int
    obtainedScore: int

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentUpdate(BaseModel):
    assessmentName: Optional[str] = None
    totalScore: Optional[int] = None
    obtainedScore: Optional[int] = None

class AssessmentResponse(AssessmentBase):
    id: str
    result: AssessmentResult
    percentage: float
    createdAt: datetime
    updatedAt: datetime

# ============ Feedback Schemas ============
class FeedbackBase(BaseModel):
    batchId: str
    candidateId: str
    rating: int = Field(ge=1, le=5)
    comments: Optional[str] = None

class FeedbackCreate(FeedbackBase):
    pass

class FeedbackUpdate(BaseModel):
    rating: Optional[int] = None
    comments: Optional[str] = None

class FeedbackResponse(FeedbackBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

# ============ Detailed Feedback Schemas (Microsoft Forms-style) ============
class DetailedFeedbackCreate(BaseModel):
    """Full feedback form matching the Excel sheet columns."""
    batchId: str
    candidateId: Optional[str] = None          # resolved server-side from email token
    respondentName: Optional[str] = None
    respondentEmail: Optional[str] = None
    batchNoAndTrainer: Optional[str] = None
    takeaway1: Optional[str] = None
    takeaway2: Optional[str] = None
    takeaway3: Optional[str] = None
    improvements: Optional[str] = None
    courseImpact: Optional[str] = None
    trainerRating: int = Field(ge=1, le=5)
    assignmentsHelpful: Optional[str] = None   # Yes / No / Partially
    demonstrationsHelpful: Optional[str] = None
    trainerSupportAdequate: Optional[str] = None
    technicalDiscussionsHelpful: Optional[str] = None
    otherComments: Optional[str] = None

class DetailedFeedbackResponse(DetailedFeedbackCreate):
    id: str
    submittedAt: datetime

class FeedbackWindowStatus(BaseModel):
    batchId: str
    batchName: str
    endDate: datetime
    windowOpen: bool
    windowOpensOn: Optional[datetime] = None
    windowClosesOn: Optional[datetime] = None
    daysUntilClose: Optional[int] = None

class FeedbackValidationResponse(BaseModel):
    valid: bool
    reason: str  # "window_closed" | "already_submitted" | "invalid_candidate" | "valid"
    message: str
    candidateName: Optional[str] = None
    batchName: Optional[str] = None

# ============ Report Schemas ============
class ToppersListResponse(BaseModel):
    batchId: str
    batchName: str
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    toppers: List[dict]

class BatchReportResponse(BaseModel):
    batchId: str
    batchName: str
    totalCandidates: int
    totalAttendance: int
    averageScore: float
    assessmentsPassed: int
    assessmentsFailed: int

# ============ Notification Schemas ============
class NotificationResponse(BaseModel):
    id: str
    type: str
    message: str
    recipientId: Optional[str] = None
    isRead: bool
    createdAt: datetime

# ============ AI Curriculum Generation Schemas ============
class TopicSuggestion(BaseModel):
    topic: str = Field(description="The title of the curriculum topic")
    subtopics: List[str] = Field(description="List of subtopics for this topic")

class CurriculumSuggestionResponse(BaseModel):
    curriculum: List[TopicSuggestion] = Field(description="List of topics with their respective subtopics")

class CurriculumGenerateRequest(BaseModel):
    batchName: str
    topicsCount: int = 5
    subtopicsCount: int = 6

# ============ Onboarding & Trainee Pool Schemas ============
class TraineePoolResponse(BaseModel):
    id: str
    email: str
    fullName: str
    college: Optional[str] = None
    phone: Optional[str] = None
    onboardingDate: str
    status: str
    currentBatchId: Optional[str] = None
    foundationLanguage: Optional[str] = None
    streamTraining: Optional[str] = None
    eliminatedPhase: Optional[str] = None
    registrationNumber: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

class TraineePoolAssignRequest(BaseModel):
    traineeIds: List[str]
    batchId: str
    autoSplit: Optional[bool] = False
    gapDays: Optional[int] = 7
