from app.core.database import get_db
from typing import List, Dict, Optional
from app.models.models import AssessmentResult
from app.core.system_settings import get_setting
from collections import defaultdict

class TopperService:
    """Service to calculate and manage toppers"""
    
    @staticmethod
    async def calculate_batch_toppers(batch_id: str) -> List[Dict]:
        """Calculate toppers for a batch using bulk queries (optimized)"""
        db = get_db()
        
        try:
            # 1. Get all candidates in batch (single query via users assigned_batches)
            users_res = db.table("users").select("email").eq("role", "TRAINEE").cs("assigned_batches", [batch_id]).execute()
            emails = {u["email"].strip().lower() for u in users_res.data} if users_res.data else set()
            
            cand_direct_res = db.table("candidates").select("email").eq("batch_id", batch_id).execute()
            if cand_direct_res.data:
                for c in cand_direct_res.data:
                    emails.add(c["email"].strip().lower())
                    
            if not emails:
                return []
                
            candidates_result = db.table("candidates").select("*").in_("email", list(emails)).execute()
            candidates = candidates_result.data
            
            if not candidates:
                return []
            
            # 2. Bulk-fetch ALL assessments for this batch (single query instead of N)
            assessments_result = db.table("assessments").select("candidate_id, percentage").eq("batch_id", batch_id).execute()
            all_assessments = assessments_result.data or []
            
            # 3. Bulk-fetch ALL attendances for this batch (single query instead of N)
            attendances_result = db.table("attendances").select("candidate_id, status").eq("batch_id", batch_id).execute()
            all_attendances = attendances_result.data or []
            
            # Group assessments and attendances by candidate_id in memory
            assessments_by_candidate = defaultdict(list)
            for a in all_assessments:
                assessments_by_candidate[a["candidate_id"]].append(a)
            
            attendances_by_candidate = defaultdict(list)
            for att in all_attendances:
                attendances_by_candidate[att["candidate_id"]].append(att)
            
            # Calculate performance score for each candidate (in-memory, no DB calls)
            toppers_data = []
            for candidate in candidates:
                cand_id = candidate["id"]
                
                # Calculate assessment score from grouped data
                cand_assessments = assessments_by_candidate.get(cand_id, [])
                avg_assessment_score = 0
                if cand_assessments:
                    total_percentage = sum(a.get("percentage", 0) for a in cand_assessments)
                    avg_assessment_score = total_percentage / len(cand_assessments)
                
                # Calculate attendance from grouped data
                cand_attendances = attendances_by_candidate.get(cand_id, [])
                attendance_percentage = 0
                if cand_attendances:
                    present_count = sum(1 for a in cand_attendances if a.get("status") == "PRESENT")
                    attendance_percentage = (present_count / len(cand_attendances)) * 100
                
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
            topper_percentage = get_setting("TOPPER_PERCENTAGE", 10)
            topper_count = max(1, int(len(toppers_data) * (topper_percentage / 100)))  # Top X%
            
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
        """Get candidate rank among ALL candidates in batch (not just toppers)"""
        db = get_db()
        
        try:
            # Use bulk queries to rank all candidates, not just toppers
            users_res = db.table("users").select("email").eq("role", "TRAINEE").cs("assigned_batches", [batch_id]).execute()
            emails = {u["email"].strip().lower() for u in users_res.data} if users_res.data else set()
            
            cand_direct_res = db.table("candidates").select("email").eq("batch_id", batch_id).execute()
            if cand_direct_res.data:
                for c in cand_direct_res.data:
                    emails.add(c["email"].strip().lower())
                    
            if not emails:
                return {"rank": -1, "totalCandidates": 0, "percentile": 0, "score": 0}
                
            candidates_result = db.table("candidates").select("id").in_("email", list(emails)).execute()
            candidates = candidates_result.data or []
            
            if not candidates:
                return {"rank": -1, "totalCandidates": 0, "percentile": 0, "score": 0}
            
            # Bulk fetch assessments and attendances
            assessments_result = db.table("assessments").select("candidate_id, percentage").eq("batch_id", batch_id).execute()
            attendances_result = db.table("attendances").select("candidate_id, status").eq("batch_id", batch_id).execute()
            
            assessments_by_cand = defaultdict(list)
            for a in (assessments_result.data or []):
                assessments_by_cand[a["candidate_id"]].append(a)
            
            attendances_by_cand = defaultdict(list)
            for att in (attendances_result.data or []):
                attendances_by_cand[att["candidate_id"]].append(att)
            
            # Compute scores for all candidates
            scores = []
            for c in candidates:
                cid = c["id"]
                cand_assessments = assessments_by_cand.get(cid, [])
                avg_score = 0
                if cand_assessments:
                    avg_score = sum(a.get("percentage", 0) for a in cand_assessments) / len(cand_assessments)
                
                cand_attendances = attendances_by_cand.get(cid, [])
                att_pct = 0
                if cand_attendances:
                    att_pct = (sum(1 for a in cand_attendances if a.get("status") == "PRESENT") / len(cand_attendances)) * 100
                
                overall = (avg_score * 0.6) + (att_pct * 0.4)
                scores.append({"_id": cid, "overallScore": overall})
            
            scores.sort(key=lambda x: x["overallScore"], reverse=True)
            
            for rank, s in enumerate(scores, 1):
                if s["_id"] == candidate_id:
                    return {
                        "rank": rank,
                        "totalCandidates": len(scores),
                        "percentile": round((1 - (rank - 1) / len(scores)) * 100, 1) if scores else 0,
                        "score": s["overallScore"]
                    }
            
            return {"rank": -1, "totalCandidates": len(scores), "percentile": 0, "score": 0}
        
        except Exception as e:
            print(f"Error getting candidate rank: {e}")
            return {"rank": -1, "totalCandidates": 0, "percentile": 0, "score": 0}
