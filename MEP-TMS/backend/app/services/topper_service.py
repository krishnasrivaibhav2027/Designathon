from app.core.database import get_db
from typing import List, Dict, Optional
from app.models.models import AssessmentResult

class TopperService:
    """Service to calculate and manage toppers"""
    
    @staticmethod
    async def calculate_batch_toppers(batch_id: str) -> List[Dict]:
        """Calculate toppers for a batch"""
        db = get_db()
        
        try:
            # Get all candidates in batch
            candidates_result = db.table("candidates").select("*").eq("batch_id", batch_id).execute()
            candidates = candidates_result.data
            
            if not candidates:
                return []
            
            # Calculate performance score for each candidate
            toppers_data = []
            for candidate in candidates:
                cand_id = candidate["id"]
                
                # Get assessments
                assessments_result = db.table("assessments").select("*") \
                    .eq("batch_id", batch_id) \
                    .eq("candidate_id", cand_id) \
                    .execute()
                assessments = assessments_result.data
                
                # Get attendance
                attendances_result = db.table("attendances").select("*") \
                    .eq("batch_id", batch_id) \
                    .eq("candidate_id", cand_id) \
                    .execute()
                attendances = attendances_result.data
                
                # Calculate scores
                avg_assessment_score = 0
                if assessments:
                    total_percentage = sum([a.get("percentage", 0) for a in assessments])
                    avg_assessment_score = total_percentage / len(assessments)
                
                attendance_percentage = 0
                if attendances:
                    present_count = sum(1 for a in attendances if a.get("status") == "PRESENT")
                    attendance_percentage = (present_count / len(attendances)) * 100
                
                # Overall score: 60% assessment + 40% attendance
                overall_score = (avg_assessment_score * 0.6) + (attendance_percentage * 0.4)
                
                toppers_data.append({
                    "_id": cand_id,
                    "email": candidate.get("email"),
                    "fullName": candidate.get("full_name"),
                    "registrationNumber": candidate.get("registration_number"),
                    "overallScore": overall_score,
                    "assessmentScore": avg_assessment_score,
                    "attendancePercentage": attendance_percentage
                })
            
            # Sort by overall score and get top performers
            toppers_data.sort(key=lambda x: x["overallScore"], reverse=True)
            topper_count = max(1, len(toppers_data) // 10)  # Top 10%
            
            return toppers_data[:topper_count]
        
        except Exception as e:
            print(f"Error calculating toppers: {e}")
            return []
    
    @staticmethod
    async def get_top_performers(batch_id: str, limit: int = 5) -> List[Dict]:
        """Get top performers in a batch"""
        toppers = await TopperService.calculate_batch_toppers(batch_id)
        return toppers[:limit]
    
    @staticmethod
    async def get_candidate_rank(batch_id: str, candidate_id: str) -> Dict:
        """Get candidate rank and performance stats"""
        toppers = await TopperService.calculate_batch_toppers(batch_id)
        
        for rank, topper in enumerate(toppers, 1):
            if topper["_id"] == candidate_id:
                return {
                    "rank": rank,
                    "totalCandidates": len(toppers),
                    "percentile": (rank / len(toppers)) * 100 if toppers else 0,
                    "score": topper["overallScore"]
                }
        
        return {
            "rank": -1,
            "totalCandidates": len(toppers),
            "percentile": 0,
            "score": 0
        }
