import env from "@/env";

/** FOC backup (Synapse + CDN) runs only when enabled; otherwise storage is R2-only. */
export function isFocEnabled(): boolean {
	return env.TEST_FOC;
}
