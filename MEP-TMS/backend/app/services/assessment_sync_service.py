# app/services/assessment_sync_service.py
import json

class AssessmentSyncService:
    @staticmethod
    def sync_assessment_to_report_card(db, batch_id: str, candidate_id: str, assessment_name: str, obtained_score: float, total_score: float):
        """Sync trainee quiz submission score to the matching report card column"""
        try:
            # 1. Fetch batch details to identify category/phase and topics
            batch_res = db.table("batches").select("category", "phase", "description").eq("id", batch_id).execute()
            if not batch_res.data:
                return
            batch = batch_res.data[0]
            category = batch.get("category", "SPARK")
            phase = batch.get("phase", "PHASE_1")
            
            # Extract topics to identify topic index
            topics = []
            desc_str = batch.get("description", "")
            if desc_str:
                try:
                    desc_json = json.loads(desc_str)
                    topics = desc_json.get("topics", [])
                except:
                    pass
                    
            topic_index = -1
            for idx, t_str in enumerate(topics):
                t_name = t_str
                colon_idx = t_str.find(":")
                if colon_idx != -1:
                    t_name = t_str[:colon_idx].strip()
                else:
                    t_name = t_str.strip()
                    
                if t_name.lower() in assessment_name.lower() or assessment_name.lower() in t_name.lower():
                    topic_index = idx
                    break
            
            table_name = None
            col_name = None
            attempt = "a2" if "attempt 2" in assessment_name.lower() or "a2" in assessment_name.lower() else "a1"
            
            # 2. Determine report card table and column
            if category == "SPARK":
                table_name = "spark_2_report_cards" if phase == "PHASE_2" else "spark_1_report_cards"
                lower_name = assessment_name.lower()
                if "communication" in lower_name:
                    col_name = "communication_skills"
                elif "interpersonal" in lower_name:
                    col_name = "interpersonal_skills"
                elif "business" in lower_name:
                    col_name = "business_etiquette"
                elif "service" in lower_name:
                    col_name = "service_orientation"
                elif "emotional" in lower_name or "empathy" in lower_name:
                    col_name = "emotional_intelligence_empathy"
                elif "accountability" in lower_name or "ownership" in lower_name:
                    col_name = "accountability_ownership"
                elif "presentation" in lower_name:
                    col_name = "presentation_skills"
                # Fallbacks for standard/legacy index
                elif "1" in assessment_name or "a1" in assessment_name.lower() or topic_index == 0:
                    col_name = "communication_skills"
                elif "2" in assessment_name or "a2" in assessment_name.lower() or topic_index == 1:
                    col_name = "interpersonal_skills"
                    
            elif category == "FOUNDATIONAL":
                table_name = "foundation_report_cards"
                if "project" in assessment_name.lower():
                    col_name = f"project_eval_{attempt}"
                elif "final" in assessment_name.lower():
                    col_name = f"final_grade_{attempt}"
                else:
                    num = None
                    if "1" in assessment_name or "ga1" in assessment_name.lower() or topic_index == 0: num = 1
                    elif "2" in assessment_name or "ga2" in assessment_name.lower() or topic_index == 1: num = 2
                    elif "3" in assessment_name or "ga3" in assessment_name.lower() or topic_index == 2: num = 3
                    elif "4" in assessment_name or "ga4" in assessment_name.lower() or topic_index == 3: num = 4
                    elif "5" in assessment_name or "ga5" in assessment_name.lower() or topic_index == 4: num = 5
                    
                    if num:
                        col_name = f"ga{num}_{attempt}"
                        
            elif category == "STREAM":
                table_name = "stream_report_cards"
                if "project 1" in assessment_name.lower() or "project_score1" in assessment_name.lower():
                    col_name = f"project_score1_{attempt}"
                elif "project 2" in assessment_name.lower() or "project_score2" in assessment_name.lower():
                    col_name = f"project_score2_{attempt}"
                elif "online coding" in assessment_name.lower() or "online_coding" in assessment_name.lower():
                    col_name = f"online_coding_{attempt}"
                elif "coding" in assessment_name.lower():
                    num = None
                    for n in range(1, 8):
                        if f"coding{n}" in assessment_name.lower() or f"coding {n}" in assessment_name.lower() or str(n) in assessment_name:
                            num = n
                            break
                    if num is None and topic_index != -1:
                        num = (topic_index % 7) + 1
                    if num:
                        col_name = f"coding{num}_{attempt}"
                else: # Default MCQ
                    num = None
                    for n in range(1, 8):
                        if f"mcq{n}" in assessment_name.lower() or f"mcq {n}" in assessment_name.lower() or str(n) in assessment_name:
                            num = n
                            break
                    if num is None and topic_index != -1:
                        num = (topic_index % 7) + 1
                    if num:
                        col_name = f"mcq{num}_{attempt}"
            
            # 3. Apply DB Update
            if table_name and col_name:
                res = db.table(table_name).select("id").eq("batch_id", batch_id).eq("candidate_id", candidate_id).execute()
                if res.data:
                    row_id = res.data[0]["id"]
                    db.table(table_name).update({col_name: obtained_score}).eq("id", row_id).execute()
                else:
                    cand_res = db.table("candidates").select("*").eq("id", candidate_id).execute()
                    if cand_res.data:
                        cand = cand_res.data[0]
                        new_rc = {
                            "batch_id": batch_id,
                            "candidate_id": candidate_id,
                            "name": cand["full_name"],
                            "email": cand["email"],
                            col_name: obtained_score
                        }
                        db.table(table_name).insert(new_rc).execute()
        except Exception as e:
            print(f"[Warn] Failed syncing assessment to report card: {e}")

    @staticmethod
    def sync_report_card_to_assessments(db, batch_id: str, candidate_id: str, assessment_name: str, obtained_score: float, total_score: float = 100.0):
        """Sync Excel uploaded score back to the individual assessments table"""
        try:
            if obtained_score is None:
                return
                
            existing = db.table("assessments").select("id")\
                .eq("batch_id", batch_id)\
                .eq("candidate_id", candidate_id)\
                .eq("assessment_name", assessment_name)\
                .execute()
                
            percentage = (obtained_score / total_score * 100) if total_score > 0 else 0
            result_val = "PASS" if percentage >= 40 else "FAIL"
            
            payload = {
                "batch_id": batch_id,
                "candidate_id": candidate_id,
                "assessment_name": assessment_name,
                "total_score": total_score,
                "obtained_score": obtained_score,
                "percentage": percentage,
                "result": result_val
            }
            
            if existing.data:
                db.table("assessments").update(payload).eq("id", existing.data[0]["id"]).execute()
            else:
                db.table("assessments").insert(payload).execute()
        except Exception as e:
            print(f"[Warn] Failed syncing report card score to assessments table: {e}")
