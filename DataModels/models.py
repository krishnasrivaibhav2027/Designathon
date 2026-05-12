import uuid
from datetime import datetime
from sqlalchemy import (Column, ForeignKey, String, Text, Boolean,
Float, Integer, Enum, JSON, create_engine, DateTime)

from sqlalchemy.orm import declarative_base, relationship
import enum

Base = declarative_base()

class UserRoles(str, enum.Enum):
    ADMIN = "admin"
    TRAINER = "trainer"
    TRAINEE = "trainee"
    COORDINATOR = "coordinator"

class BatchStatus(str, enum.Enum):
    PLANNED = "planned"
    RUNNING = "running"
    COMPLETED = "completed"
    CLOSED = "closed"

class CandidateStatus(str, enum.Enum):
    ACTIVE = "active"
    DISCONTINUED = "discontinued"
    NOT_CLEARED = "not cleared"
    OFFERED = "offered"
    ONBOARDED = "onboarded"

class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"

class UploadType(str, enum.Enum):
    CANDIDATE_DATA = "candidate_data"
    ATTENDANCE = "attendance"
    ASSESSMENT = "assessment"

class UploadStatus(str, enum.Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL_SUCCESS = "partial_success"

class NotificationType(str, enum.Enum):
    ATTENDANCE_ALERT = "attendance_alert"
    ABSENCE_ALERT = "absence_alert"
    ASSESSMENT_REMINDER = "assessment_reminder"
    FEEDBACK_REQUEST = "feedback_request"
    SUCCESS_UPLOAD = "success_upload"

class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    
class Users(Base):
    __tablename__ = "users"
    user_id = Column(String, primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(Enum(UserRoles), nullable=False)
    is_active = Column(Boolean, default=True)
    coordinated_batches = relationship("Batches", back_populates="coordinator")
    trainer_batches = relationship("BatchTrainer", back_populates="trainer")
    candidate_profile = relationship("Candidate", back_populates="user", uselist=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Batches(Base):
    __tablename__ = "batches"
    batch_id = Column(String, primary_key=True, default=uuid.uuid4)
    batch_name = Column(String, nullable=False)
    batch_code = Column(String, unique=True, nullable=False)
    course_name = Column(String, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(Enum(BatchStatus), default=BatchStatus.PLANNED)
    coordinator_id = Column(String, ForeignKey("users.user_id"))
    coordinator = relationship("Users", back_populates="coordinated_batches")
    trainers = relationship("BatchTrainer", back_populates="batch")
    candidates = relationship("Candidate", back_populates="batch")
    attendance_records = relationship("Attendance", back_populates="batch")
    assessments = relationship("Assessments", back_populates="batch")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    
    
    