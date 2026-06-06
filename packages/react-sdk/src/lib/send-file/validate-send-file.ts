import {
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import type { SendFileArgs, SendFileDeps, SendFileUser } from "./types";

export type ValidatedSendContext = {
	senderEmailCommitment: `0x${string}`;
	senderAuthSubjectCommitment: string;
};

export function assertSendFileConnected(deps: SendFileDeps): void {
	if (!deps.contracts || !deps.wallet || !deps.user) {
		throw new Error(
			"Not connected: contracts, wallet, profile, and auth required",
		);
	}
}

export function validateSendFileInput(args: {
	user: SendFileUser;
	documents: SendFileArgs["documents"];
	placementManifest: SendFileArgs["placementManifest"];
}): ValidatedSendContext {
	const rawSenderEmail = args.user.email?.trim();
	if (!rawSenderEmail) {
		throw new Error(
			"Add a primary email to your Filosign profile before sending documents",
		);
	}
	const senderEmailCommitment = hashNormalizedSignerEmail(
		normalizePlacementRecipientEmail(rawSenderEmail),
	);
	const senderAuthSubjectCommitment = args.user.authSubjectCommitment;
	if (!senderAuthSubjectCommitment?.trim()) {
		throw new Error(
			"Profile missing identity commitment; try signing out and back in.",
		);
	}

	if (args.documents.length === 0) {
		throw new Error("At least one signable document is required");
	}

	if (args.placementManifest.version !== 1) {
		throw new Error("Sends require placement manifest version 1");
	}

	return { senderEmailCommitment, senderAuthSubjectCommitment };
}
