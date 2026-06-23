import env from "@/env";

/** FOC cold backup (Synapse upload + verify) runs when enabled; otherwise storage is R2-only. */
export function isFocBackupEnabled(): boolean {
	return env.FOC_BACKUP_ENABLED;
}

/** Serve ciphertext from FOC (FilBeam) when replicated; otherwise R2 presign. */
export function isFocRetrievalEnabled(): boolean {
	return env.FOC_RETRIEVAL;
}
