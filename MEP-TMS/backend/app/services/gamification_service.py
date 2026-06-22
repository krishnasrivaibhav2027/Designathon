from typing import Dict, Any, Optional

class GamificationService:
    """Service to handle Bits and Bytes gamification mechanics for trainees"""

    @staticmethod
    def award_bits(db, candidate_id: str, amount: int, reason: str) -> Optional[Dict[str, int]]:
        """
        Awards Bits to a trainee, handles Byte rollover logic (8 Bits = 1 Byte),
        persists updates in both candidates and trainee_pool, and logs a ledger transaction.
        """
        if amount <= 0:
            return None

        try:
            # 1. Fetch Candidate record to resolve Email
            cand_res = db.table("candidates").select("email, bits_accumulated, bytes_total").eq("id", candidate_id).execute()
            if not cand_res.data:
                print(f"[Gamification] Candidate {candidate_id} not found.")
                return None
            
            candidate = cand_res.data[0]
            email = candidate.get("email")
            if not email:
                print(f"[Gamification] Email missing for Candidate {candidate_id}.")
                return None

            email_clean = email.strip().lower()

            # 2. Fetch Trainee Pool record (to ensure global storage tracking)
            pool_res = db.table("trainee_pool").select("id, bits_accumulated, bytes_total").eq("email", email_clean).execute()
            
            # Resolve current bits and bytes from trainee pool (or fallback to candidate record)
            pool_id = None
            if pool_res.data:
                pool_rec = pool_res.data[0]
                pool_id = pool_rec.get("id")
                current_bits = pool_rec.get("bits_accumulated") or 0
                current_bytes = pool_rec.get("bytes_total") or 0
            else:
                current_bits = candidate.get("bits_accumulated") or 0
                current_bytes = candidate.get("bytes_total") or 0

            # 3. Calculate Bit and Byte values (8 Bits = 1 Byte progression)
            total_bits = current_bits + amount
            earned_bytes = total_bits // 8
            remaining_bits = total_bits % 8
            new_bytes = current_bytes + earned_bytes

            # 4. Insert transaction ledger entry
            ledger_row = {
                "email": email_clean,
                "amount_bits": amount,
                "reason": reason
            }
            db.table("gamification_ledger").insert(ledger_row).execute()

            # 5. Update Trainee Pool record globally
            if pool_id:
                db.table("trainee_pool").update({
                    "bits_accumulated": remaining_bits,
                    "bytes_total": new_bytes
                }).eq("id", pool_id).execute()

            # 6. Sync Candidate record(s) so dashboard UI is updated
            db.table("candidates").update({
                "bits_accumulated": remaining_bits,
                "bytes_total": new_bytes
            }).eq("email", email_clean).execute()

            print(f"[Gamification] Successful: {email_clean} +{amount} bits ({reason}). Bal: {new_bytes} B, {remaining_bits} b.")
            return {"bits": remaining_bits, "bytes": new_bytes}

        except Exception as e:
            print(f"[Gamification] Error awarding bits to Candidate {candidate_id}: {e}")
            import traceback
            traceback.print_exc()
            return None

    @staticmethod
    def get_candidate_ledger(db, email: str):
        """Retrieves history of bits/bytes earned by candidate"""
        try:
            res = db.table("gamification_ledger").select("*").eq("email", email.strip().lower()).order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            print(f"[Gamification] Error fetching ledger: {e}")
            return []
