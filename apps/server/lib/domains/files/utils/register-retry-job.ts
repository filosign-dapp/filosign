import { getAddress } from "viem";
import { filesRegister } from "@/lib/domains/files/register";
import { findRegisteredFileByPieceCid } from "@/lib/domains/files/utils/register-helpers";
import {
	clearRegisterState,
	getRegisterState,
	type StoredRegisterRetryPayload,
} from "@/lib/domains/files/utils/register-state";

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

	const payload = state.registerPayloadJson as StoredRegisterRetryPayload;
	await filesRegister(
		getAddress(payload.sender),
		payload.rawBody,
		payload.activeOrg,
	);
}
