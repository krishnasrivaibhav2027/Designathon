import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def clean_and_sync_pool(db):
    """
    Scans the trainee pool and updates trainee statuses based on:
    1. Continuous three days absence in their current batch.
    2. Elimination due to not clearing assessment rounds in their current batch.
    If a trainee is eliminated/terminated, their status in trainee_pool is set to 'ELIMINATED',
    and they are removed from any subsequent/other assigned batches they are mapped to.
    """
    logger.info("Starting clean and sync of trainee pool...")
    try:
        # Fetch all trainees in pool that are not ELIMINATED or COMPLETED
        trainees_res = db.table("trainee_pool").select("*").not_.in_("status", ["ELIMINATED", "COMPLETED"]).execute()
        trainees = trainees_res.data or []
        
        for t in trainees:
            email = t["email"].strip().lower()
            current_batch_id = t.get("current_batch_id")
            t_id = t["id"]
            
            if not current_batch_id:
                continue
                
            # Get batch info
            batch_res = db.table("batches").select("*").eq("id", current_batch_id).execute()
            if not batch_res.data:
                continue
            batch_data = batch_res.data[0]
            category = batch_data.get("category", "SPARK") or "SPARK"
            phase = batch_data.get("phase")
            
            # Get candidate id for attendances query
            cand_res = db.table("candidates").select("id").eq("email", email).eq("batch_id", current_batch_id).execute()
            cand_id = cand_res.data[0]["id"] if cand_res.data else None
            
            is_terminated = False
            eliminated_reason = None
            eliminated_phase_name = f"{category}_{phase}" if phase else category
            
            # Check 1: Continuous 3 days absence
            if cand_id:
                att_res = db.table("attendances").select("status", "date").eq("batch_id", current_batch_id).eq("candidate_id", cand_id).execute()
                attendances = att_res.data or []
                # Sort by date ascending to check consecutive order
                attendances_sorted = sorted(attendances, key=lambda x: x.get("date", ""))
                
                consec_absent = 0
                max_consec = 0
                for att in attendances_sorted:
                    if att.get("status") == "ABSENT":
                        consec_absent += 1
                        if consec_absent > max_consec:
                            max_consec = consec_absent
                    else:
                        consec_absent = 0
                
                if max_consec >= 3:
                    is_terminated = True
                    eliminated_reason = "continuous_absence"
                    logger.info(f"Trainee {email} has {max_consec} consecutive absences in batch {current_batch_id}. Terminating.")

            # Check 2: Assessment rounds not cleared
            if not is_terminated:
                # Check corresponding report card table
                if category == "SPARK":
                    rc_table = "spark_2_report_cards" if phase == "PHASE_2" else "spark_1_report_cards"
                    rc_res = db.table(rc_table).select("final_status").eq("batch_id", current_batch_id).eq("email", email).execute()
                    if rc_res.data:
                        rc_row = rc_res.data[0]
                        final_status = rc_row.get("final_status") or "Cleared"
                        if final_status == "Failed":
                            is_terminated = True
                            eliminated_reason = f"failed_assessment_{final_status}"
                elif category == "FOUNDATIONAL":
                    rc_res = db.table("foundation_report_cards").select("training_status").eq("batch_id", current_batch_id).eq("email", email).execute()
                    if rc_res.data:
                        rc_row = rc_res.data[0]
                        training_status = rc_row.get("training_status") or "Active"
                        if training_status == "Failed":
                            is_terminated = True
                            eliminated_reason = f"failed_assessment_{training_status}"
                elif category == "STREAM":
                    rc_res = db.table("stream_report_cards").select("final_status").eq("batch_id", current_batch_id).eq("email", email).execute()
                    if rc_res.data:
                        rc_row = rc_res.data[0]
                        final_status = rc_row.get("final_status") or "Cleared"
                        if final_status == "Failed":
                            is_terminated = True
                            eliminated_reason = f"failed_assessment_{final_status}"
            
            if is_terminated:
                logger.info(f"Trainee {email} eliminated due to: {eliminated_reason} in phase {eliminated_phase_name}")
                # 1. Update status in trainee_pool to ELIMINATED
                db.table("trainee_pool").update({
                    "status": "ELIMINATED",
                    "eliminated_phase": eliminated_phase_name
                }).eq("id", t_id).execute()
                
                # 2. Get trainee's assigned batches from users table
                user_res = db.table("users").select("id", "assigned_batches").eq("email", email).execute()
                if user_res.data:
                    user_row = user_res.data[0]
                    user_uuid = user_row["id"]
                    assigned_batches = user_row.get("assigned_batches", []) or []
                    
                    # Keep only current_batch_id, remove from other future/assigned batches
                    updated_batches = [b_id for b_id in assigned_batches if b_id == current_batch_id]
                    
                    # For each batch removed, clean up candidates table and decrement count
                    removed_batches = [b_id for b_id in assigned_batches if b_id != current_batch_id]
                    for b_id in removed_batches:
                        logger.info(f"Removing eliminated trainee {email} from assigned batch {b_id}")
                        # Delete candidate
                        db.table("candidates").delete().eq("email", email).eq("batch_id", b_id).execute()
                        
                        # Decrement batch candidates_count
                        b_count_res = db.table("batches").select("candidates_count").eq("id", b_id).execute()
                        if b_count_res.data:
                            curr_count = b_count_res.data[0].get("candidates_count") or 0
                            db.table("batches").update({"candidates_count": max(0, curr_count - 1)}).eq("id", b_id).execute()
                    
                    # Update users assigned_batches
                    db.table("users").update({"assigned_batches": updated_batches}).eq("id", user_uuid).execute()
                    
        logger.info("Clean and sync of trainee pool completed.")
    except Exception as e:
        logger.error(f"Error in clean_and_sync_pool: {e}", exc_info=True)
