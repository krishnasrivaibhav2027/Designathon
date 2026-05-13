from datetime import datetime
from typing import Optional, List
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

# ============ User Model ============
class User:
    """User document for MongoDB"""
    collection_name = "users"
    
    def __init__(self, email: str, fullName: str, passwordHash: str, role: UserRole, phone: Optional[str] = None):
        self.email = email
        self.fullName = fullName
        self.passwordHash = passwordHash
        self.role = role
        self.phone = phone
        self.assignedBatches = []
        self.isActive = True
        self.createdAt = datetime.utcnow()
        self.updatedAt = datetime.utcnow()

    def to_dict(self):
        return {
            "email": self.email,
            "fullName": self.fullName,
            "passwordHash": self.passwordHash,
            "role": self.role.value,
            "phone": self.phone,
            "assignedBatches": self.assignedBatches,
            "isActive": self.isActive,
            "createdAt": self.createdAt,
            "updatedAt": self.updatedAt
        }

# ============ Batch Model ============
class Batch:
    """Batch document for MongoDB"""
    collection_name = "batches"
    
    def __init__(self, batchId: str, batchName: str, startDate: datetime, endDate: datetime, trainers: List[str], description: Optional[str] = None):
        self.batchId = batchId
        self.batchName = batchName
        self.startDate = startDate
        self.endDate = endDate
        self.trainers = trainers
        self.description = description
        self.status = BatchStatus.PLANNED.value
        self.candidatesCount = 0
        self.createdAt = datetime.utcnow()
        self.updatedAt = datetime.utcnow()

    def to_dict(self):
        return {
            "batchId": self.batchId,
            "batchName": self.batchName,
            "startDate": self.startDate,
            "endDate": self.endDate,
            "trainers": self.trainers,
            "description": self.description,
            "status": self.status,
            "candidatesCount": self.candidatesCount,
            "createdAt": self.createdAt,
            "updatedAt": self.updatedAt
        }

# ============ Candidate Model ============
class Candidate:
    """Candidate document for MongoDB"""
    collection_name = "candidates"
    
    def __init__(self, email: str, fullName: str, registrationNumber: str, batchId: str, phone: Optional[str] = None):
        self.email = email
        self.fullName = fullName
        self.registrationNumber = registrationNumber
        self.batchId = batchId
        self.phone = phone
        self.performanceScore = 0
        self.createdAt = datetime.utcnow()
        self.updatedAt = datetime.utcnow()

    def to_dict(self):
        return {
            "email": self.email,
            "fullName": self.fullName,
            "registrationNumber": self.registrationNumber,
            "batchId": self.batchId,
            "phone": self.phone,
            "performanceScore": self.performanceScore,
            "createdAt": self.createdAt,
            "updatedAt": self.updatedAt
        }

# ============ Attendance Model ============
class Attendance:
    """Attendance document for MongoDB"""
    collection_name = "attendances"
    
    def __init__(self, batchId: str, candidateId: str, date: datetime, status: AttendanceStatus):
        self.batchId = batchId
        self.candidateId = candidateId
        self.date = date
        self.status = status.value
        self.version = 1
        self.createdAt = datetime.utcnow()
        self.updatedAt = datetime.utcnow()

    def to_dict(self):
        return {
            "batchId": self.batchId,
            "candidateId": self.candidateId,
            "date": self.date,
            "status": self.status,
            "version": self.version,
            "createdAt": self.createdAt,
            "updatedAt": self.updatedAt
        }

# ============ Assessment Model ============
class Assessment:
    """Assessment document for MongoDB"""
    collection_name = "assessments"
    
    def __init__(self, batchId: str, candidateId: str, assessmentName: str, totalScore: int, obtainedScore: int):
        self.batchId = batchId
        self.candidateId = candidateId
        self.assessmentName = assessmentName
        self.totalScore = totalScore
        self.obtainedScore = obtainedScore
        self.percentage = (obtainedScore / totalScore * 100) if totalScore > 0 else 0
        self.result = AssessmentResult.PASS.value if self.percentage >= 40 else AssessmentResult.FAIL.value
        self.createdAt = datetime.utcnow()
        self.updatedAt = datetime.utcnow()

    def to_dict(self):
        return {
            "batchId": self.batchId,
            "candidateId": self.candidateId,
            "assessmentName": self.assessmentName,
            "totalScore": self.totalScore,
            "obtainedScore": self.obtainedScore,
            "percentage": self.percentage,
            "result": self.result,
            "createdAt": self.createdAt,
            "updatedAt": self.updatedAt
        }

# ============ Feedback Model ============
class Feedback:
    """Feedback document for MongoDB"""
    collection_name = "feedbacks"
    
    def __init__(self, batchId: str, candidateId: str, rating: int, comments: Optional[str] = None):
        self.batchId = batchId
        self.candidateId = candidateId
        self.rating = rating
        self.comments = comments
        self.createdAt = datetime.utcnow()
        self.updatedAt = datetime.utcnow()

    def to_dict(self):
        return {
            "batchId": self.batchId,
            "candidateId": self.candidateId,
            "rating": self.rating,
            "comments": self.comments,
            "createdAt": self.createdAt,
            "updatedAt": self.updatedAt
        }

# ============ Notification Model ============
class Notification:
    """Notification document for MongoDB"""
    collection_name = "notifications"
    
    def __init__(self, type: str, message: str, recipientId: Optional[str] = None):
        self.type = type
        self.message = message
        self.recipientId = recipientId
        self.isRead = False
        self.createdAt = datetime.utcnow()

    def to_dict(self):
        return {
            "type": self.type,
            "message": self.message,
            "recipientId": self.recipientId,
            "isRead": self.isRead,
            "createdAt": self.createdAt
        }
