import { findRegisteredFileByPieceCid } from "@/lib/domains/files/utils/register-helpers";
import {
	clearRegisterState,
	getRegisterState,
} from "@/lib/domains/files/utils/register-state";
import { executeRegisterJob } from "@/lib/domains/files/utils/register-worker";

export async function runFileRegisterRetryJob(pieceCid: string): Promise<void> {
	const existing = await findRegisteredFileByPieceCid(pieceCid);
	if (existing) {
		await clearRegisterState(pieceCid);
		return;
	}

	const state = await getRegisterState(pieceCid);
	if (!state) {
		return;
	}
	if (state.registrationStatus === "registered") {
		await clearRegisterState(pieceCid);
		return;
	}

	await executeRegisterJob(pieceCid);
}
