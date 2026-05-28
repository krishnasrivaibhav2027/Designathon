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
    
    def __init__(self, email: str, fullName: str, passwordHash: str, role: UserRole, phone: Optional[str] = None, isFirstLogin: bool = True):
        self.email = email
        self.fullName = fullName
        self.passwordHash = passwordHash
        self.role = role
        self.phone = phone
        self.assignedBatches = []
        self.isActive = True
        self.isFirstLogin = isFirstLogin

    def to_dict(self):
        return {
            "email": self.email,
            "full_name": self.fullName,
            "password_hash": self.passwordHash,
            "role": self.role.value if isinstance(self.role, Enum) else self.role,
            "phone": self.phone,
            "assigned_batches": self.assignedBatches,
            "is_active": self.isActive,
            "is_first_login": self.isFirstLogin,
        }

# ============ Batch Model ============
class Batch:
    """Batch model for Supabase PostgreSQL"""
    table_name = "batches"
    
    def __init__(self, batchId: str, batchName: str, startDate: datetime, endDate: datetime, trainers: List[str], description: Optional[str] = None, topics: List[str] = None, sizeLimit: Optional[int] = None, questions: List[dict] = None, session_dates: List[str] = None, createdBy: Optional[str] = None, category: Optional[str] = "SPARK", phase: Optional[str] = None, onboardingDate: Optional[str] = None):
        self.batchId = batchId
        self.batchName = batchName
        self.startDate = startDate
        self.endDate = endDate
        self.trainers = trainers
        self.topics = topics or []
        self.sizeLimit = sizeLimit
        self.questions = questions or []
        self.createdBy = createdBy or ""
        self.category = category or "SPARK"
        self.phase = phase
        self.onboardingDate = onboardingDate
        
        if session_dates is None:
            session_dates = []
            from datetime import timedelta, datetime as datetime_cls
            start_dt = startDate
            if isinstance(startDate, str):
                try:
                    start_dt = datetime_cls.fromisoformat(startDate.replace('Z', '+00:00'))
                except Exception:
                    pass
            end_dt = endDate
            if isinstance(endDate, str):
                try:
                    end_dt = datetime_cls.fromisoformat(endDate.replace('Z', '+00:00'))
                except Exception:
                    pass
            
            PUBLIC_HOLIDAYS = {
                # 2025 holidays
                "2025-01-01", "2025-01-26", "2025-03-14", "2025-03-31", "2025-04-10", "2025-05-01", "2025-08-15", "2025-10-02", "2025-10-23", "2025-12-25",
                # 2026 holidays
                "2026-01-01",  # New Year's Day
                "2026-01-26",  # Republic Day
                "2026-03-19",  # Maha Shivratri (approx)
                "2026-03-20",  # Eid-ul-Fitr (approx)
                "2026-04-03",  # Good Friday (approx)
                "2026-04-14",  # Ambedkar Jayanti
                "2026-05-01",  # May Day / Labor Day
                "2026-05-25",  # Eid-al-Adha (approx)
                "2026-08-15",  # Independence Day
                "2026-10-02",  # Gandhi Jayanti
                "2026-11-08",  # Diwali / Deepavali (approx)
                "2026-12-25",  # Christmas
            }
            try:
                curr = start_dt
                while curr <= end_dt:
                    if curr.weekday() < 5:
                        date_str = curr.strftime("%Y-%m-%d")
                        if date_str not in PUBLIC_HOLIDAYS:
                            session_dates.append(date_str)
                    curr += timedelta(days=1)
            except Exception as e:
                print(f"[Warn] Failed to generate session dates: {e}")
                
        self.sessionDates = session_dates
        
        import json
        desc_json = {
            "text": description or "",
            "topics": self.topics,
            "sizeLimit": self.sizeLimit,
            "questions": self.questions,
            "session_dates": self.sessionDates,
            "created_by": self.createdBy
        }
        self.description = json.dumps(desc_json)
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
            "category": self.category,
            "phase": self.phase,
            "onboarding_date": self.onboardingDate
        }

# ============ Candidate Model ============
class Candidate:
    """Candidate model for Supabase PostgreSQL"""
    table_name = "candidates"
    
    def __init__(self, email: str, fullName: str, registrationNumber: str, batchId: str, phone: Optional[str] = None, progress: Optional[dict] = None):
        self.email = email
        self.fullName = fullName
        self.registrationNumber = registrationNumber
        self.batchId = batchId
        self.phone = phone
        self.performanceScore = 0
        self.progress = progress or {"completed_days": [], "current_day": 1}

    def to_dict(self):
        return {
            "email": self.email,
            "full_name": self.fullName,
            "registration_number": self.registrationNumber,
            "batch_id": self.batchId,
            "phone": self.phone,
            "performance_score": self.performanceScore,
            "progress": self.progress,
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
        "category": "category",
        "phase": "phase",
        "onboarding_date": "onboardingDate",
        "is_first_login": "isFirstLogin",
        "employee_id": "employeeId",
        "last_login": "lastLogin",
        "last_logout": "lastLogout",
    }

    
    if field_map:
        default_map.update(field_map)
    
    result = {}
    for key, value in row.items():
        mapped_key = default_map.get(key, key)
        result[mapped_key] = value
    
    if "description" in result and result["description"]:
        import json
        try:
            desc_data = json.loads(result["description"])
            if isinstance(desc_data, dict) and ("topics" in desc_data or "sizeLimit" in desc_data or "text" in desc_data or "questions" in desc_data or "agent" in desc_data or "session_dates" in desc_data or "created_by" in desc_data):
                result["topics"] = desc_data.get("topics", [])
                result["sizeLimit"] = desc_data.get("sizeLimit")
                result["description"] = desc_data.get("text", "")
                result["questions"] = desc_data.get("questions", [])
                result["agent"] = desc_data.get("agent", None)
                result["sessionDates"] = desc_data.get("session_dates", [])
                result["createdBy"] = desc_data.get("created_by", "")
        except Exception:
            pass
            
    if "batchId" in result or "batchName" in result:
        if "topics" not in result:
            result["topics"] = []
        if "sizeLimit" not in result:
            result["sizeLimit"] = None
        if "questions" not in result:
            result["questions"] = []
        if "agent" not in result:
            result["agent"] = None
        if "createdBy" not in result:
            result["createdBy"] = ""
        if "sessionDates" not in result:
            result["sessionDates"] = []
            
    return result
