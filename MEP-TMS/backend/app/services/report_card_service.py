from app.core.database import Client

class ReportCardService:
    @staticmethod
    def create_report_cards_for_candidate(db: Client, batch_uuid: str, candidate_uuid: str, name: str, email: str, college: str = None):
        """
        Creates empty report card rows for a candidate in the 4 phases when added to a batch.
        """
        try:
            # 1. Fetch batch details for dates and trainers
            batch_res = db.table("batches").select("*").eq("id", batch_uuid).execute()
            start_date = None
            end_date = None
            trainer_name = None
            batch_no = None
            
            if batch_res.data:
                b = batch_res.data[0]
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
                        "final_status": "Cleared"
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
                        "final_status": "Cleared"
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
