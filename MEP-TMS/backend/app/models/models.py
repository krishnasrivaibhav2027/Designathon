from datetime import datetime
from typing import Optional, List
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

# ============ User Model ============
class User:
    """User model for Supabase PostgreSQL"""
    table_name = "users"
    
    def __init__(self, email: str, fullName: str, passwordHash: str, role: UserRole, phone: Optional[str] = None):
        self.email = email
        self.fullName = fullName
        self.passwordHash = passwordHash
        self.role = role
        self.phone = phone
        self.assignedBatches = []
        self.isActive = True

    def to_dict(self):
        return {
            "email": self.email,
            "full_name": self.fullName,
            "password_hash": self.passwordHash,
            "role": self.role.value if isinstance(self.role, Enum) else self.role,
            "phone": self.phone,
            "assigned_batches": self.assignedBatches,
            "is_active": self.isActive,
        }

# ============ Batch Model ============
class Batch:
    """Batch model for Supabase PostgreSQL"""
    table_name = "batches"
    
    def __init__(self, batchId: str, batchName: str, startDate: datetime, endDate: datetime, trainers: List[str], description: Optional[str] = None):
        self.batchId = batchId
        self.batchName = batchName
        self.startDate = startDate
        self.endDate = endDate
        self.trainers = trainers
        self.description = description
        self.status = BatchStatus.PLANNED.value
        self.candidatesCount = 0

    def to_dict(self):
        return {
            "batch_id": self.batchId,
            "batch_name": self.batchName,
            "start_date": self.startDate.isoformat() if isinstance(self.startDate, datetime) else self.startDate,
            "end_date": self.endDate.isoformat() if isinstance(self.endDate, datetime) else self.endDate,
            "trainers": self.trainers,
            "description": self.description,
            "status": self.status,
            "candidates_count": self.candidatesCount,
        }

# ============ Candidate Model ============
class Candidate:
    """Candidate model for Supabase PostgreSQL"""
    table_name = "candidates"
    
    def __init__(self, email: str, fullName: str, registrationNumber: str, batchId: str, phone: Optional[str] = None):
        self.email = email
        self.fullName = fullName
        self.registrationNumber = registrationNumber
        self.batchId = batchId
        self.phone = phone
        self.performanceScore = 0

    def to_dict(self):
        return {
            "email": self.email,
            "full_name": self.fullName,
            "registration_number": self.registrationNumber,
            "batch_id": self.batchId,
            "phone": self.phone,
            "performance_score": self.performanceScore,
        }

# ============ Attendance Model ============
class Attendance:
    """Attendance model for Supabase PostgreSQL"""
    table_name = "attendances"
    
    def __init__(self, batchId: str, candidateId: str, date: datetime, status: AttendanceStatus):
        self.batchId = batchId
        self.candidateId = candidateId
        self.date = date
        self.status = status.value if isinstance(status, Enum) else status
        self.version = 1

    def to_dict(self):
        return {
            "batch_id": self.batchId,
            "candidate_id": self.candidateId,
            "date": self.date.isoformat() if isinstance(self.date, datetime) else self.date,
            "status": self.status,
            "version": self.version,
        }

# ============ Assessment Model ============
class Assessment:
    """Assessment model for Supabase PostgreSQL"""
    table_name = "assessments"
    
    def __init__(self, batchId: str, candidateId: str, assessmentName: str, totalScore: int, obtainedScore: int):
        self.batchId = batchId
        self.candidateId = candidateId
        self.assessmentName = assessmentName
        self.totalScore = totalScore
        self.obtainedScore = obtainedScore
        self.percentage = (obtainedScore / totalScore * 100) if totalScore > 0 else 0
        self.result = AssessmentResult.PASS.value if self.percentage >= 40 else AssessmentResult.FAIL.value

    def to_dict(self):
        return {
            "batch_id": self.batchId,
            "candidate_id": self.candidateId,
            "assessment_name": self.assessmentName,
            "total_score": self.totalScore,
            "obtained_score": self.obtainedScore,
            "percentage": self.percentage,
            "result": self.result,
        }

# ============ Feedback Model ============
class Feedback:
    """Feedback model for Supabase PostgreSQL"""
    table_name = "feedbacks"
    
    def __init__(self, batchId: str, candidateId: str, rating: int, comments: Optional[str] = None):
        self.batchId = batchId
        self.candidateId = candidateId
        self.rating = rating
        self.comments = comments

    def to_dict(self):
        return {
            "batch_id": self.batchId,
            "candidate_id": self.candidateId,
            "rating": self.rating,
            "comments": self.comments,
        }

# ============ Notification Model ============
class Notification:
    """Notification model for Supabase PostgreSQL"""
    table_name = "notifications"
    
    def __init__(self, type: str, message: str, recipientId: Optional[str] = None):
        self.type = type
        self.message = message
        self.recipientId = recipientId
        self.isRead = False

    def to_dict(self):
        return {
            "type": self.type,
            "message": self.message,
            "recipient_id": self.recipientId,
            "is_read": self.isRead,
        }


# ============ Helper: Convert Supabase row to API-compatible dict ============
def row_to_api(row: dict, field_map: dict = None) -> dict:
    """
    Convert a Supabase snake_case row to camelCase API response dict.
    Also maps 'id' to '_id' for backward compatibility with schemas if needed.
    """
    if row is None:
        return None
    
    # Default field mapping (snake_case -> camelCase)
    default_map = {
        "full_name": "fullName",
        "password_hash": "passwordHash",
        "is_active": "isActive",
        "assigned_batches": "assignedBatches",
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "batch_id": "batchId",
        "batch_name": "batchName",
        "start_date": "startDate",
        "end_date": "endDate",
        "candidates_count": "candidatesCount",
        "registration_number": "registrationNumber",
        "performance_score": "performanceScore",
        "candidate_id": "candidateId",
        "total_score": "totalScore",
        "obtained_score": "obtainedScore",
        "assessment_name": "assessmentName",
        "recipient_id": "recipientId",
        "is_read": "isRead",
    }
    
    if field_map:
        default_map.update(field_map)
    
    result = {}
    for key, value in row.items():
        mapped_key = default_map.get(key, key)
        result[mapped_key] = value
    
    return result
