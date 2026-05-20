import { normalizePlacementRecipientEmail } from "@filosign/shared";
import type { Recipient } from "../../../-lib/types";

export function collectViewerEmails(args: {
	recipients: Recipient[];
	coldInvites?: { email: string; isSigner: boolean }[];
}): string[] {
	const emails = new Set<string>();
	for (const r of args.recipients) {
		if (r.role !== "viewer") continue;
		const raw = r.email?.trim();
		if (raw) emails.add(normalizePlacementRecipientEmail(raw));
	}
	for (const c of args.coldInvites ?? []) {
		if (!c.isSigner)
			emails.add(normalizePlacementRecipientEmail(c.email.trim()));
	}
	return [...emails];
}
