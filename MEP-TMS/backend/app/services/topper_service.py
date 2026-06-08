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
    def resolve_and_scale(a1: Optional[float], a2: Optional[float], raw_max: float, pass_threshold_pct: float) -> Optional[float]:
        """Resolves score and scales it to 100.0, handling both raw and already scaled inputs."""
        if a1 is None and a2 is None:
            return None
            
        # Detect if already scaled (e.g. > raw_max)
        is_scaled = False
        v1 = a1 if a1 is not None else a2
        if v1 > raw_max:
            is_scaled = True
            
        max_val = 100.0 if is_scaled else raw_max
        pass_mark = max_val * (pass_threshold_pct / 100.0)
        
        resolved = TopperService.resolve_attempt(a1, a2, pass_mark)
        if resolved is None:
            return None
            
        if is_scaled:
            return resolved
        else:
            return resolved * (100.0 / raw_max)

    @staticmethod
    def calculate_stream_score(st_card: Optional[dict]) -> Optional[float]:
        """Calculates normalized stream score out of 100."""
        if not st_card:
            return None
            
        mcqs = [TopperService.resolve_and_scale(st_card.get(f"mcq{i}_a1"), st_card.get(f"mcq{i}_a2"), 3.0, 40.0) for i in range(1, 8)]
        valid_mcqs = [m for m in mcqs if m is not None]
        mcq_avg = sum(valid_mcqs) / len(valid_mcqs) if valid_mcqs else None
        
        codings = [TopperService.resolve_and_scale(st_card.get(f"coding{i}_a1"), st_card.get(f"coding{i}_a2"), 10.0, 80.0) for i in range(1, 8)]
        valid_codings = [c for c in codings if c is not None]
        coding_avg = sum(valid_codings) / len(valid_codings) if valid_codings else None
        
        projs = [TopperService.resolve_and_scale(st_card.get(f"project_score{i}_a1"), st_card.get(f"project_score{i}_a2"), 100.0, 65.0) for i in [1, 2]]
        valid_projs = [p for p in projs if p is not None]
        proj_avg = sum(valid_projs) / len(valid_projs) if valid_projs else None
        
        online_coding = TopperService.resolve_and_scale(st_card.get("online_coding_a1"), st_card.get("online_coding_a2"), 10.0, 80.0)
        
        valid_stream = [s for s in [mcq_avg, coding_avg, proj_avg, online_coding] if s is not None]
        return sum(valid_stream) / len(valid_stream) if valid_stream else None

    @staticmethod
    def get_coding_stats(st_card: Optional[dict]) -> tuple:
        """
        Returns (total_test_cases_passed, second_attempt_count) for coding assessments in stream card.
        Each coding assessment is out of 10.
        """
        if not st_card:
            return 0.0, 0
            
        total_passed = 0.0
        second_attempts = 0
        
        coding_keys = [f"coding{i}" for i in range(1, 8)] + ["online_coding"]
        
        for key in coding_keys:
            a1 = st_card.get(f"{key}_a1")
            a2 = st_card.get(f"{key}_a2")
            
            if a1 is not None:
                is_scaled = a1 > 10.0
                pass_thresh = 80.0 if is_scaled else 8.0
                raw_score = a1 / 10.0 if is_scaled else a1
                
                if a1 >= pass_thresh:
                    total_passed += raw_score
                else:
                    if a2 is not None:
                        raw_score_a2 = a2 / 10.0 if a2 > 10.0 else a2
                        total_passed += raw_score_a2
                        second_attempts += 1
                    else:
                        total_passed += raw_score
            elif a2 is not None:
                raw_score_a2 = a2 / 10.0 if a2 > 10.0 else a2
                total_passed += raw_score_a2
                second_attempts += 1
                
        return total_passed, second_attempts

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
            candidates = [c for c in (candidates_result.data or []) if c.get("batch_id") == batch_id]
            
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
            assessments_result = db.table("assessments").select("candidate_id, percentage, time_taken").eq("batch_id", batch_id).execute()
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
                stream_score = TopperService.calculate_stream_score(st_card)
                if stream_score is not None:
                    phase_scores["stream"] = stream_score

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

                cand_assessments = assessments_by_candidate.get(cand_id, [])
                valid_times = [a.get("time_taken") for a in cand_assessments if a.get("time_taken") is not None]
                avg_time_taken = sum(valid_times) / len(valid_times) if valid_times else 999999

                coding_passed, coding_sec_att = TopperService.get_coding_stats(st_card)
                toppers_data.append({
                    "_id": cand_id,
                    "email": candidate.get("email"),
                    "fullName": candidate.get("full_name"),
                    "registrationNumber": candidate.get("registration_number"),
                    "overallScore": overall_score,
                    "assessmentScore": sum(phase_scores.values()) / len(phase_scores) if phase_scores else overall_score,
                    "attendancePercentage": attendance_percentage,
                    "avgTimeTaken": avg_time_taken,
                    "codingTestCasesPassed": coding_passed,
                    "codingSecondAttempts": coding_sec_att
                })
            
            # Sort by overall score descending, coding test cases passed descending, coding second attempts ascending, and time taken ascending as tie-breaker
            toppers_data.sort(key=lambda x: (
                -x["overallScore"],
                -x.get("codingTestCasesPassed", 0.0),
                x.get("codingSecondAttempts", 0),
                x.get("avgTimeTaken", 999999)
            ))
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
                
            candidates_result = db.table("candidates").select("id, email, batch_id").in_("email", list(emails)).execute()
            candidates = [c for c in (candidates_result.data or []) if c.get("batch_id") == batch_id]
            
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
            
            assessments_result = db.table("assessments").select("candidate_id, percentage, time_taken").eq("batch_id", batch_id).execute()
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
                            
                stream_score = TopperService.calculate_stream_score(st_card)
                if stream_score is not None:
                    phase_scores["stream"] = stream_score

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
                
                coding_passed, coding_sec_att = TopperService.get_coding_stats(st_card)
                scores.append({
                    "_id": cid,
                    "overallScore": overall,
                    "codingTestCasesPassed": coding_passed,
                    "codingSecondAttempts": coding_sec_att,
                    "avgTimeTaken": avg_time_taken
                })
            
            # Sort by overall score descending, coding test cases passed descending, coding second attempts ascending, and time taken ascending as tie-breaker
            scores.sort(key=lambda x: (
                -x["overallScore"],
                -x.get("codingTestCasesPassed", 0.0),
                x.get("codingSecondAttempts", 0),
                x.get("avgTimeTaken", 999999)
            ))
            
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

    @staticmethod
    async def get_combined_candidate_rank(email: str) -> Dict:
        """Get combined candidate rank across all their assigned batches using Option A calculations"""
        db = get_db()
        email_clean = email.strip().lower()
        
        try:
            # 1. Find all candidate records for this email
            user_candidates_res = db.table("candidates").select("id, batch_id").eq("email", email_clean).execute()
            user_candidates = user_candidates_res.data or []
            if not user_candidates:
                return {"rank": -1, "totalCandidates": 0, "percentile": 0, "score": 0}
                
            batch_ids = [c["batch_id"] for c in user_candidates]
            
            # 2. Get all candidate emails in these batches
            users_res = db.table("users").select("email, assigned_batches").eq("role", "TRAINEE").execute()
            emails = set()
            for u in (users_res.data or []):
                assigned = u.get("assigned_batches") or []
                if any(bid in assigned for bid in batch_ids):
                    emails.add(u["email"].strip().lower())
                    
            cand_direct_res = db.table("candidates").select("email").in_("batch_id", batch_ids).execute()
            if cand_direct_res.data:
                for c in cand_direct_res.data:
                    emails.add(c["email"].strip().lower())
                    
            if not emails:
                return {"rank": -1, "totalCandidates": 0, "percentile": 0, "score": 0}
                
            # 3. Fetch candidate info for all these emails
            candidates_result = db.table("candidates").select("id, email, batch_id").in_("email", list(emails)).execute()
            candidates = [c for c in (candidates_result.data or []) if c.get("batch_id") in batch_ids]
            
            if not candidates:
                return {"rank": -1, "totalCandidates": 0, "percentile": 0, "score": 0}
                
            # 4. Fetch report cards and build rank list
            emails_list = list(emails)
            spark1_res = db.table("spark_1_report_cards").select("email, a1_score, a2_score, communication_skills, interpersonal_skills, business_etiquette, service_orientation, emotional_intelligence_empathy, accountability_ownership, presentation_skills").in_("email", emails_list).execute()
            spark2_res = db.table("spark_2_report_cards").select("email, a1_score, a2_score, communication_skills, interpersonal_skills, business_etiquette, service_orientation, emotional_intelligence_empathy, accountability_ownership, presentation_skills").in_("email", emails_list).execute()
            found_res = db.table("foundation_report_cards").select("email, final_grade_a1, final_grade_a2, ga1_a1, ga2_a1, ga3_a1, ga4_a1, ga5_a1, project_eval_a1").in_("email", emails_list).execute()
            stream_res = db.table("stream_report_cards").select("email, mcq1_a1, coding1_a1, project_score1_a1, online_coding_a1").in_("email", emails_list).execute()
            
            spark1_map = {r["email"].strip().lower(): r for r in (spark1_res.data or [])}
            spark2_map = {r["email"].strip().lower(): r for r in (spark2_res.data or [])}
            found_map = {r["email"].strip().lower(): r for r in (found_res.data or [])}
            stream_map = {r["email"].strip().lower(): r for r in (stream_res.data or [])}
            
            assessments_result = db.table("assessments").select("candidate_id, percentage, time_taken").in_("batch_id", batch_ids).execute()
            attendances_result = db.table("attendances").select("candidate_id, status").in_("batch_id", batch_ids).execute()
            
            assessments_by_cand = defaultdict(list)
            for a in (assessments_result.data or []):
                assessments_by_cand[a["candidate_id"]].append(a)
            
            attendances_by_cand = defaultdict(list)
            for att in (attendances_result.data or []):
                attendances_by_cand[att["candidate_id"]].append(att)
            
            candidate_scores = {}
            candidate_times = {}
            candidate_coding_passed = {}
            candidate_coding_second_attempts = {}
            weights = {"spark1": 0.15, "spark2": 0.15, "foundational": 0.35, "stream": 0.35}
            
            for c in candidates:
                cid = c["id"]
                c_email = c.get("email", "").strip().lower()
                
                s1_card = spark1_map.get(c_email)
                s2_card = spark2_map.get(c_email)
                f_card = found_map.get(c_email)
                st_card = stream_map.get(c_email)
                
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
                            
                stream_score = TopperService.calculate_stream_score(st_card)
                if stream_score is not None:
                    phase_scores["stream"] = stream_score

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
                
                cand_ass = assessments_by_cand.get(cid, [])
                valid_times = [a.get("time_taken") for a in cand_ass if a.get("time_taken") is not None]
                avg_time_taken = sum(valid_times) / len(valid_times) if valid_times else 999999

                coding_passed, coding_sec_att = TopperService.get_coding_stats(st_card)
                candidate_scores[cid] = overall
                candidate_times[cid] = avg_time_taken
                candidate_coding_passed[cid] = coding_passed
                candidate_coding_second_attempts[cid] = coding_sec_att
            
            # 5. Combine candidate scores by unique email
            email_scores = []
            for email_item in emails:
                cands_for_email = [c for c in candidates if c.get("email", "").strip().lower() == email_item]
                if not cands_for_email:
                    continue
                combined_score = sum(candidate_scores[c["id"]] for c in cands_for_email) / len(cands_for_email)
                combined_time = sum(candidate_times[c["id"]] for c in cands_for_email) / len(cands_for_email)
                combined_coding_passed = sum(candidate_coding_passed[c["id"]] for c in cands_for_email) / len(cands_for_email)
                combined_second_attempts = sum(candidate_coding_second_attempts[c["id"]] for c in cands_for_email) / len(cands_for_email)
                email_scores.append({
                    "email": email_item,
                    "overallScore": combined_score,
                    "codingTestCasesPassed": combined_coding_passed,
                    "codingSecondAttempts": combined_second_attempts,
                    "avgTimeTaken": combined_time
                })
            
            # Sort by overall score descending, coding test cases passed descending, coding second attempts ascending, and time taken ascending as tie-breaker
            email_scores.sort(key=lambda x: (
                -x["overallScore"],
                -x.get("codingTestCasesPassed", 0.0),
                x.get("codingSecondAttempts", 0),
                x.get("avgTimeTaken", 999999)
            ))
            
            for rank, s in enumerate(email_scores, 1):
                if s["email"] == email_clean:
                    return {
                        "rank": rank,
                        "totalCandidates": len(email_scores),
                        "percentile": round((1 - (rank - 1) / len(email_scores)) * 100, 1) if email_scores else 0,
                        "score": s["overallScore"]
                    }
            
            return {"rank": -1, "totalCandidates": len(email_scores), "percentile": 0, "score": 0}
        except Exception as e:
            print(f"Error ranking combined candidates: {e}")
            import traceback
            traceback.print_exc()
            return {"rank": -1, "totalCandidates": 0, "percentile": 0, "score": 0}
