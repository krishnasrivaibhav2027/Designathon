from app.core.database import Client

class ReportCardService:
    @staticmethod
    def create_report_cards_for_candidate(db: Client, batch_uuid: str, candidate_uuid: str, name: str, email: str, college: str = None, batch_data: dict = None):
        """
        Creates empty report card rows for a candidate in the 4 phases when added to a batch.
        """
        try:
            start_date = None
            end_date = None
            trainer_name = None
            batch_no = None
            b = {}
            
            if batch_data:
                b = batch_data
            else:
                # 1. Fetch batch details for dates and trainers
                batch_res = db.table("batches").select("*").eq("id", batch_uuid).execute()
                if batch_res.data:
                    b = batch_res.data[0]
            
            if b:
                start_date = b.get("start_date")[:10] if b.get("start_date") else None
                end_date = b.get("end_date")[:10] if b.get("end_date") else None
                batch_no = b.get("batch_id")
                trainers = b.get("trainers", [])
                if trainers:
                    trainer_name = ", ".join(trainers)

            # 2. Insert corresponding report card placeholder
            category = b.get("category", "SPARK") or "SPARK"
            phase = b.get("phase")
            
            if category == "SPARK":
                if phase == "PHASE_2":
                    db.table("spark_2_report_cards").insert({
                        "batch_id": batch_uuid,
                        "candidate_id": candidate_uuid,
                        "name": name,
                        "email": email,
                        "college": college or "",
                        "training_start_date": start_date,
                        "training_end_date": end_date,
                        "trainer_name": trainer_name,
                        "batch_no": batch_no,
                        "training_status": "Active",
                        "final_status": "Not Cleared",
                        "communication_skills": None,
                        "interpersonal_skills": None,
                        "business_etiquette": None,
                        "service_orientation": None,
                        "emotional_intelligence_empathy": None,
                        "accountability_ownership": None,
                        "presentation_skills": None,
                        "rank": None,
                        "reevaluation_comments": None,
                        "reason_for_absence": None,
                        "pc_name": None
                    }).execute()
                else:
                    db.table("spark_1_report_cards").insert({
                        "batch_id": batch_uuid,
                        "candidate_id": candidate_uuid,
                        "name": name,
                        "email": email,
                        "college": college or "",
                        "training_start_date": start_date,
                        "training_end_date": end_date,
                        "trainer_name": trainer_name,
                        "batch_no": batch_no,
                        "training_status": "Active",
                        "final_status": "Not Cleared",
                        "communication_skills": None,
                        "interpersonal_skills": None,
                        "business_etiquette": None,
                        "service_orientation": None,
                        "emotional_intelligence_empathy": None,
                        "accountability_ownership": None,
                        "presentation_skills": None,
                        "rank": None,
                        "reevaluation_comments": None,
                        "reason_for_absence": None,
                        "pc_name": None
                    }).execute()
            elif category == "FOUNDATIONAL":
                db.table("foundation_report_cards").insert({
                    "batch_id": batch_uuid,
                    "candidate_id": candidate_uuid,
                    "name": name,
                    "email": email,
                    "college": college or "",
                    "status": "Active",
                    "training_status": "Active"
                }).execute()
            elif category == "STREAM":
                db.table("stream_report_cards").insert({
                    "batch_id": batch_uuid,
                    "candidate_id": candidate_uuid,
                    "name": name,
                    "email": email,
                    "college": college or "",
                    "training_start_date": start_date,
                    "training_end_date": end_date,
                    "trainer_name": trainer_name,
                    "batch_no": batch_no,
                    "training_status": "Active",
                    "final_status": "Cleared"
                }).execute()

            print(f"[OK] Report card created for candidate {email} in batch {batch_uuid} ({category} / {phase})")
            return True
        except Exception as e:
            print(f"[FAIL] Error creating report cards for candidate: {e}")
            return False

    @staticmethod
    def create_report_cards_for_candidates_bulk(db: Client, batch_uuid: str, candidates_info: list, batch_data: dict = None):
        """
        Creates empty report card rows in bulk for multiple candidates when added to a batch.
        """
        try:
            start_date = None
            end_date = None
            trainer_name = None
            batch_no = None
            b = {}
            
            if batch_data:
                b = batch_data
            else:
                batch_res = db.table("batches").select("*").eq("id", batch_uuid).execute()
                if batch_res.data:
                    b = batch_res.data[0]
            
            if b:
                start_date = b.get("start_date")[:10] if b.get("start_date") else None
                end_date = b.get("end_date")[:10] if b.get("end_date") else None
                batch_no = b.get("batch_id")
                trainers = b.get("trainers", [])
                if trainers:
                    trainer_name = ", ".join(trainers)
            
            category = b.get("category", "SPARK") or "SPARK"
            phase = b.get("phase")
            
            rows = []
            table_name = None
            
            if category == "SPARK":
                if phase == "PHASE_2":
                    table_name = "spark_2_report_cards"
                    for cand in candidates_info:
                        rows.append({
                            "batch_id": batch_uuid,
                            "candidate_id": cand["id"],
                            "name": cand["name"],
                            "email": cand["email"],
                            "college": cand.get("college") or "",
                            "training_start_date": start_date,
                            "training_end_date": end_date,
                            "trainer_name": trainer_name,
                            "batch_no": batch_no,
                            "training_status": "Active",
                            "final_status": "Not Cleared",
                            "communication_skills": None,
                            "interpersonal_skills": None,
                            "business_etiquette": None,
                            "service_orientation": None,
                            "emotional_intelligence_empathy": None,
                            "accountability_ownership": None,
                            "presentation_skills": None,
                            "rank": None,
                            "reevaluation_comments": None,
                            "reason_for_absence": None,
                            "pc_name": None
                        })
                else:
                    table_name = "spark_1_report_cards"
                    for cand in candidates_info:
                        rows.append({
                            "batch_id": batch_uuid,
                            "candidate_id": cand["id"],
                            "name": cand["name"],
                            "email": cand["email"],
                            "college": cand.get("college") or "",
                            "training_start_date": start_date,
                            "training_end_date": end_date,
                            "trainer_name": trainer_name,
                            "batch_no": batch_no,
                            "training_status": "Active",
                            "final_status": "Not Cleared",
                            "communication_skills": None,
                            "interpersonal_skills": None,
                            "business_etiquette": None,
                            "service_orientation": None,
                            "emotional_intelligence_empathy": None,
                            "accountability_ownership": None,
                            "presentation_skills": None,
                            "rank": None,
                            "reevaluation_comments": None,
                            "reason_for_absence": None,
                            "pc_name": None
                        })
            elif category == "FOUNDATIONAL":
                table_name = "foundation_report_cards"
                for cand in candidates_info:
                    rows.append({
                        "batch_id": batch_uuid,
                        "candidate_id": cand["id"],
                        "name": cand["name"],
                        "email": cand["email"],
                        "college": cand.get("college") or "",
                        "status": "Active",
                        "training_status": "Active"
                    })
            elif category == "STREAM":
                table_name = "stream_report_cards"
                for cand in candidates_info:
                    rows.append({
                        "batch_id": batch_uuid,
                        "candidate_id": cand["id"],
                        "name": cand["name"],
                        "email": cand["email"],
                        "college": cand.get("college") or "",
                        "training_start_date": start_date,
                        "training_end_date": end_date,
                        "trainer_name": trainer_name,
                        "batch_no": batch_no,
                        "training_status": "Active",
                        "final_status": "Cleared"
                    })
            
            if table_name and rows:
                db.table(table_name).insert(rows).execute()
                print(f"[OK] Bulk report cards ({len(rows)} rows) created in {table_name} for batch {batch_uuid}")
                return True
            return False
        except Exception as e:
            print(f"[FAIL] Error creating bulk report cards for candidates: {e}")
            return False

    @staticmethod
    def bg_create_report_cards(batch_uuid: str, candidates_info: list, batch_data: dict = None):
        """
        Background task wrapper for bulk report card creation.
        """
        from app.core.database import get_db
        db = get_db()
        ReportCardService.create_report_cards_for_candidates_bulk(db, batch_uuid, candidates_info, batch_data)
