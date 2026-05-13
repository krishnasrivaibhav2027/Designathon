from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ============ Enums ============
class UserRole(str, Enum):
    ADMIN = "ADMIN"
    COORDINATOR = "COORDINATOR"
    TRAINER = "TRAINER"

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
    id: str = Field(alias="_id")
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True

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

class BatchCreate(BatchBase):
    pass

class BatchUpdate(BaseModel):
    batchName: Optional[str] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None
    status: Optional[BatchStatus] = None
    trainers: Optional[List[str]] = None
    description: Optional[str] = None

class BatchResponse(BatchBase):
    id: str = Field(alias="_id")
    batchId: str
    status: BatchStatus
    candidatesCount: int
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True

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
    id: str = Field(alias="_id")
    registrationNumber: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True

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
    id: str = Field(alias="_id")
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True

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
    id: str = Field(alias="_id")
    result: AssessmentResult
    percentage: float
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True

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
    id: str = Field(alias="_id")
    createdAt: datetime
    updatedAt: datetime

    class Config:
        populate_by_name = True

# ============ Report Schemas ============
class ToppersListResponse(BaseModel):
    batchId: str
    batchName: str
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
    id: str = Field(alias="_id")
    type: str
    message: str
    recipientId: Optional[str] = None
    isRead: bool
    createdAt: datetime

    class Config:
        populate_by_name = True
