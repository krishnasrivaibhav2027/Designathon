from app.core.database import get_db
from typing import List, Dict, Optional
from app.models.models import AssessmentResult
from app.core.system_settings import get_setting
from collections import defaultdict

class TopperService:
    """Service to calculate and manage toppers using Option A (Weighted Phase Average)"""
    
    @staticmethod
    def resolve_attempt(a1: Optional[float], a2: Optional[float], pass_mark: float) -> Optional[float]:
        """Resolves score using capping: if a1 >= pass_mark, return a1. If not and a2 is present, return min(a2, pass_mark)."""
        if a1 is None:
            return a2
        if a1 >= pass_mark:
            return a1
        if a2 is not None:
            return min(a2, pass_mark)
        return a1

    @staticmethod
    async def calculate_batch_toppers(batch_id: str) -> List[Dict]:
        """Calculate toppers for a batch using Option A (Weighted Phase Average) across all available report cards"""
        db = get_db()
        
        try:
            # 1. Get all candidates in the batch
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
            
            # Fetch report cards for all candidates by email
            emails_list = list(emails)
            spark1_res = db.table("spark_1_report_cards").select("*").in_("email", emails_list).execute()
            spark2_res = db.table("spark_2_report_cards").select("*").in_("email", emails_list).execute()
            found_res = db.table("foundation_report_cards").select("*").in_("email", emails_list).execute()
            stream_res = db.table("stream_report_cards").select("*").in_("email", emails_list).execute()
            
            # Index by email for fast lookup
            spark1_map = {r["email"].strip().lower(): r for r in (spark1_res.data or [])}
            spark2_map = {r["email"].strip().lower(): r for r in (spark2_res.data or [])}
            found_map = {r["email"].strip().lower(): r for r in (found_res.data or [])}
            stream_map = {r["email"].strip().lower(): r for r in (stream_res.data or [])}
            
            # Bulk-fetch assessments and attendances for fallback
            assessments_result = db.table("assessments").select("candidate_id, percentage").eq("batch_id", batch_id).execute()
            attendances_result = db.table("attendances").select("candidate_id, status").eq("batch_id", batch_id).execute()
            
            assessments_by_candidate = defaultdict(list)
            for a in (assessments_result.data or []):
                assessments_by_candidate[a["candidate_id"]].append(a)
            
            attendances_by_candidate = defaultdict(list)
            for att in (attendances_result.data or []):
                attendances_by_candidate[att["candidate_id"]].append(att)
            
            toppers_data = []
            
            # Weights for Option A
            weights = {
                "spark1": 0.15,
                "spark2": 0.15,
                "foundational": 0.35,
                "stream": 0.35
            }
            
            for candidate in candidates:
                cand_id = candidate["id"]
                email = candidate.get("email", "").strip().lower()
                
                # Fetch phase records
                s1_card = spark1_map.get(email)
                s2_card = spark2_map.get(email)
                f_card = found_map.get(email)
                st_card = stream_map.get(email)
                
                phase_scores = {}
                
                # Calculate Spark 1 Score
                if s1_card:
                    soft_skills = [
                        s1_card.get("communication_skills"),
                        s1_card.get("interpersonal_skills"),
                        s1_card.get("business_etiquette"),
                        s1_card.get("service_orientation"),
                        s1_card.get("emotional_intelligence_empathy"),
                        s1_card.get("accountability_ownership"),
                        s1_card.get("presentation_skills")
                    ]
                    valid_soft = [s for s in soft_skills if s is not None]
                    soft_avg = (sum(valid_soft) / len(valid_soft) * 20.0) if valid_soft else None
                    
                    tech_resolved = TopperService.resolve_attempt(
                        s1_card.get("a1_score"),
                        s1_card.get("a2_score"),
                        60.0
                    )
                    
                    valid_scores = [s for s in [soft_avg, tech_resolved] if s is not None]
                    if valid_scores:
                        phase_scores["spark1"] = sum(valid_scores) / len(valid_scores)
                
                # Calculate Spark 2 Score
                if s2_card:
                    soft_skills = [
                        s2_card.get("communication_skills"),
                        s2_card.get("interpersonal_skills"),
                        s2_card.get("business_etiquette"),
                        s2_card.get("service_orientation"),
                        s2_card.get("emotional_intelligence_empathy"),
                        s2_card.get("accountability_ownership"),
                        s2_card.get("presentation_skills")
                    ]
                    valid_soft = [s for s in soft_skills if s is not None]
                    soft_avg = (sum(valid_soft) / len(valid_soft) * 20.0) if valid_soft else None
                    
                    tech_resolved = TopperService.resolve_attempt(
                        s2_card.get("a1_score"),
                        s2_card.get("a2_score"),
                        60.0
                    )
                    
                    valid_scores = [s for s in [soft_avg, tech_resolved] if s is not None]
                    if valid_scores:
                        phase_scores["spark2"] = sum(valid_scores) / len(valid_scores)
                
                # Calculate Foundational Score
                if f_card:
                    final_grade = TopperService.resolve_attempt(
                        f_card.get("final_grade_a1"),
                        f_card.get("final_grade_a2"),
                        60.0
                    )
                    if final_grade is not None:
                        phase_scores["foundational"] = final_grade
                    else:
                        # Fallback to GAs & Project average
                        gas = [f_card.get(f"ga{i}_a1") for i in range(1, 6)]
                        gas_resolved = [TopperService.resolve_attempt(f_card.get(f"ga{i}_a1"), f_card.get(f"ga{i}_a2"), 60.0) for i in range(1, 6)]
                        valid_gas = [g for g in gas_resolved if g is not None]
                        ga_avg = sum(valid_gas) / len(valid_gas) if valid_gas else None
                        
                        proj = TopperService.resolve_attempt(f_card.get("project_eval_a1"), f_card.get("project_eval_a2"), 65.0)
                        
                        valid_found = [s for s in [ga_avg, proj] if s is not None]
                        if valid_found:
                            phase_scores["foundational"] = sum(valid_found) / len(valid_found)
                
                # Calculate Stream Score
                if st_card:
                    mcqs = [TopperService.resolve_attempt(st_card.get(f"mcq{i}_a1"), st_card.get(f"mcq{i}_a2"), 60.0) for i in range(1, 8)]
                    valid_mcqs = [m for m in mcqs if m is not None]
                    mcq_avg = sum(valid_mcqs) / len(valid_mcqs) if valid_mcqs else None
                    
                    codings = [TopperService.resolve_attempt(st_card.get(f"coding{i}_a1"), st_card.get(f"coding{i}_a2"), 60.0) for i in range(1, 8)]
                    valid_codings = [c for c in codings if c is not None]
                    coding_avg = sum(valid_codings) / len(valid_codings) if valid_codings else None
                    
                    projs = [TopperService.resolve_attempt(st_card.get(f"project_score{i}_a1"), st_card.get(f"project_score{i}_a2"), 65.0) for i in [1, 2]]
                    valid_projs = [p for p in projs if p is not None]
                    proj_avg = sum(valid_projs) / len(valid_projs) if valid_projs else None
                    
                    online_coding = TopperService.resolve_attempt(st_card.get("online_coding_a1"), st_card.get("online_coding_a2"), 60.0)
                    
                    valid_stream = [s for s in [mcq_avg, coding_avg, proj_avg, online_coding] if s is not None]
                    if valid_stream:
                        phase_scores["stream"] = sum(valid_stream) / len(valid_stream)

                # Attendance Percentage Calculation (overall)
                cand_attendances = attendances_by_candidate.get(cand_id, [])
                attendance_percentage = 0.0
                if cand_attendances:
                    present_count = sum(1 for a in cand_attendances if a.get("status") == "PRESENT")
                    attendance_percentage = (present_count / len(cand_attendances)) * 100
                elif s1_card and s1_card.get("attendance_percentage") is not None:
                    attendance_percentage = s1_card.get("attendance_percentage")
                elif st_card and st_card.get("attendance_percentage") is not None:
                    attendance_percentage = st_card.get("attendance_percentage")

                # Weighted Score Calculation (Option A)
                if phase_scores:
                    weighted_sum = 0.0
                    weight_sum = 0.0
                    for phase, score in phase_scores.items():
                        w = weights[phase]
                        weighted_sum += score * w
                        weight_sum += w
                    overall_score = weighted_sum / weight_sum if weight_sum > 0 else 0.0
                else:
                    # Fallback to general assessments table average
                    cand_assessments = assessments_by_candidate.get(cand_id, [])
                    avg_assessment_score = 0.0
                    if cand_assessments:
                        total_percentage = sum(a.get("percentage", 0) for a in cand_assessments)
                        avg_assessment_score = total_percentage / len(cand_assessments)
                    overall_score = (avg_assessment_score * 0.6) + (attendance_percentage * 0.4)

                toppers_data.append({
                    "_id": cand_id,
                    "email": candidate.get("email"),
                    "fullName": candidate.get("full_name"),
                    "registrationNumber": candidate.get("registration_number"),
                    "overallScore": overall_score,
                    "assessmentScore": sum(phase_scores.values()) / len(phase_scores) if phase_scores else overall_score,
                    "attendancePercentage": attendance_percentage
                })
            
            # Sort by overall score descending
            toppers_data.sort(key=lambda x: x["overallScore"], reverse=True)
            topper_percentage = get_setting("TOPPER_PERCENTAGE", 10)
            topper_count = max(1, int(len(toppers_data) * (topper_percentage / 100)))
            
            return toppers_data[:topper_count]
        
        except Exception as e:
            print(f"Error calculating toppers: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    @staticmethod
    async def get_top_performers(batch_id: str, limit: int = 5) -> List[Dict]:
        """Get top performers in a batch"""
        toppers = await TopperService.calculate_batch_toppers(batch_id)
        return toppers[:limit]
    
    @staticmethod
    async def get_candidate_rank(batch_id: str, candidate_id: str) -> Dict:
        """Get candidate rank among ALL candidates in batch using Option A calculations"""
        db = get_db()
        
        try:
            users_res = db.table("users").select("email").eq("role", "TRAINEE").cs("assigned_batches", [batch_id]).execute()
            emails = {u["email"].strip().lower() for u in users_res.data} if users_res.data else set()
            
            cand_direct_res = db.table("candidates").select("email").eq("batch_id", batch_id).execute()
            if cand_direct_res.data:
                for c in cand_direct_res.data:
                    emails.add(c["email"].strip().lower())
                    
            if not emails:
                return {"rank": -1, "totalCandidates": 0, "percentile": 0, "score": 0}
                
            candidates_result = db.table("candidates").select("id, email").in_("email", list(emails)).execute()
            candidates = candidates_result.data or []
            
            if not candidates:
                return {"rank": -1, "totalCandidates": 0, "percentile": 0, "score": 0}
            
            # Fetch report cards and build rank list
            emails_list = list(emails)
            spark1_res = db.table("spark_1_report_cards").select("email, a1_score, a2_score, communication_skills, interpersonal_skills, business_etiquette, service_orientation, emotional_intelligence_empathy, accountability_ownership, presentation_skills").in_("email", emails_list).execute()
            spark2_res = db.table("spark_2_report_cards").select("email, a1_score, a2_score, communication_skills, interpersonal_skills, business_etiquette, service_orientation, emotional_intelligence_empathy, accountability_ownership, presentation_skills").in_("email", emails_list).execute()
            found_res = db.table("foundation_report_cards").select("email, final_grade_a1, final_grade_a2, ga1_a1, ga2_a1, ga3_a1, ga4_a1, ga5_a1, project_eval_a1").in_("email", emails_list).execute()
            stream_res = db.table("stream_report_cards").select("email, mcq1_a1, coding1_a1, project_score1_a1, online_coding_a1").in_("email", emails_list).execute()
            
            spark1_map = {r["email"].strip().lower(): r for r in (spark1_res.data or [])}
            spark2_map = {r["email"].strip().lower(): r for r in (spark2_res.data or [])}
            found_map = {r["email"].strip().lower(): r for r in (found_res.data or [])}
            stream_map = {r["email"].strip().lower(): r for r in (stream_res.data or [])}
            
            assessments_result = db.table("assessments").select("candidate_id, percentage").eq("batch_id", batch_id).execute()
            attendances_result = db.table("attendances").select("candidate_id, status").eq("batch_id", batch_id).execute()
            
            assessments_by_cand = defaultdict(list)
            for a in (assessments_result.data or []):
                assessments_by_cand[a["candidate_id"]].append(a)
            
            attendances_by_cand = defaultdict(list)
            for att in (attendances_result.data or []):
                attendances_by_cand[att["candidate_id"]].append(att)
            
            scores = []
            weights = {"spark1": 0.15, "spark2": 0.15, "foundational": 0.35, "stream": 0.35}
            
            for c in candidates:
                cid = c["id"]
                email = c.get("email", "").strip().lower()
                
                s1_card = spark1_map.get(email)
                s2_card = spark2_map.get(email)
                f_card = found_map.get(email)
                st_card = stream_map.get(email)
                
                phase_scores = {}
                
                if s1_card:
                    soft_skills = [s1_card.get("communication_skills"), s1_card.get("interpersonal_skills"), s1_card.get("business_etiquette"), s1_card.get("service_orientation"), s1_card.get("emotional_intelligence_empathy"), s1_card.get("accountability_ownership"), s1_card.get("presentation_skills")]
                    valid_soft = [s for s in soft_skills if s is not None]
                    soft_avg = (sum(valid_soft) / len(valid_soft) * 20.0) if valid_soft else None
                    tech_resolved = TopperService.resolve_attempt(s1_card.get("a1_score"), s1_card.get("a2_score"), 60.0)
                    valid = [s for s in [soft_avg, tech_resolved] if s is not None]
                    if valid:
                        phase_scores["spark1"] = sum(valid) / len(valid)
                        
                if s2_card:
                    soft_skills = [s2_card.get("communication_skills"), s2_card.get("interpersonal_skills"), s2_card.get("business_etiquette"), s2_card.get("service_orientation"), s2_card.get("emotional_intelligence_empathy"), s2_card.get("accountability_ownership"), s2_card.get("presentation_skills")]
                    valid_soft = [s for s in soft_skills if s is not None]
                    soft_avg = (sum(valid_soft) / len(valid_soft) * 20.0) if valid_soft else None
                    tech_resolved = TopperService.resolve_attempt(s2_card.get("a1_score"), s2_card.get("a2_score"), 60.0)
                    valid = [s for s in [soft_avg, tech_resolved] if s is not None]
                    if valid:
                        phase_scores["spark2"] = sum(valid) / len(valid)
                        
                if f_card:
                    final_grade = TopperService.resolve_attempt(f_card.get("final_grade_a1"), f_card.get("final_grade_a2"), 60.0)
                    if final_grade is not None:
                        phase_scores["foundational"] = final_grade
                    else:
                        gas_resolved = [TopperService.resolve_attempt(f_card.get(f"ga{i}_a1"), f_card.get(f"ga{i}_a2"), 60.0) for i in range(1, 6)]
                        valid_gas = [g for g in gas_resolved if g is not None]
                        ga_avg = sum(valid_gas) / len(valid_gas) if valid_gas else None
                        proj = TopperService.resolve_attempt(f_card.get("project_eval_a1"), f_card.get("project_eval_a2"), 65.0)
                        valid = [s for s in [ga_avg, proj] if s is not None]
                        if valid:
                            phase_scores["foundational"] = sum(valid) / len(valid)
                            
                if st_card:
                    mcqs = [TopperService.resolve_attempt(st_card.get(f"mcq{i}_a1"), st_card.get(f"mcq{i}_a2"), 60.0) for i in range(1, 8)]
                    valid_mcqs = [m for m in mcqs if m is not None]
                    mcq_avg = sum(valid_mcqs) / len(valid_mcqs) if valid_mcqs else None
                    
                    codings = [TopperService.resolve_attempt(st_card.get(f"coding{i}_a1"), st_card.get(f"coding{i}_a2"), 60.0) for i in range(1, 8)]
                    valid_codings = [c for c in codings if c is not None]
                    coding_avg = sum(valid_codings) / len(valid_codings) if valid_codings else None
                    
                    projs = [TopperService.resolve_attempt(st_card.get(f"project_score{i}_a1"), st_card.get(f"project_score{i}_a2"), 65.0) for i in [1, 2]]
                    valid_projs = [p for p in projs if p is not None]
                    proj_avg = sum(valid_projs) / len(valid_projs) if valid_projs else None
                    
                    online_coding = TopperService.resolve_attempt(st_card.get("online_coding_a1"), st_card.get("online_coding_a2"), 60.0)
                    valid_stream = [s for s in [mcq_avg, coding_avg, proj_avg, online_coding] if s is not None]
                    if valid_stream:
                        phase_scores["stream"] = sum(valid_stream) / len(valid_stream)

                cand_attendances = attendances_by_cand.get(cid, [])
                attendance_percentage = 0.0
                if cand_attendances:
                    present_count = sum(1 for a in cand_attendances if a.get("status") == "PRESENT")
                    attendance_percentage = (present_count / len(cand_attendances)) * 100
                
                if phase_scores:
                    weighted_sum = 0.0
                    weight_sum = 0.0
                    for phase, score in phase_scores.items():
                        w = weights[phase]
                        weighted_sum += score * w
                        weight_sum += w
                    overall = weighted_sum / weight_sum if weight_sum > 0 else 0.0
                else:
                    cand_assessments = assessments_by_cand.get(cid, [])
                    avg_score = sum(a.get("percentage", 0) for a in cand_assessments) / len(cand_assessments) if cand_assessments else 0.0
                    overall = (avg_score * 0.6) + (attendance_percentage * 0.4)
                
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
            print(f"Error ranking candidate: {e}")
            return {"rank": -1, "totalCandidates": 0, "percentile": 0, "score": 0}
