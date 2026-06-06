import type { RegisterRoutingInput } from "@filosign/shared";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";

export type IndexedRecipient = {
	recipient: Recipient;
	index: number;
};

export function recipientSignerEmail(recipient: Recipient): string | null {
	if (recipient.role !== "signer") return null;
	const raw = recipient.email?.trim() ?? "";
	if (!isValidRecipientEmail(raw)) return null;
	return normalizePlacementRecipientEmail(raw);
}

export function signerEmailsFromRecipients(recipients: Recipient[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const recipient of recipients) {
		const email = recipientSignerEmail(recipient);
		if (!email || seen.has(email)) continue;
		seen.add(email);
		out.push(email);
	}
	return out;
}

export function defaultRoutingOrderFromRecipients(
	recipients: Recipient[],
): string[] {
	return signerEmailsFromRecipients(recipients);
}

export function partitionRecipientsForTurnOrder(
	recipients: Recipient[],
	routingOrderEmails: string[] = [],
): { signers: IndexedRecipient[]; viewers: IndexedRecipient[] } {
	const orderRank = new Map(
		routingOrderEmails.map((email, index) => [
			email.trim().toLowerCase(),
			index,
		]),
	);

	const signers: IndexedRecipient[] = [];
	const viewers: IndexedRecipient[] = [];

	recipients.forEach((recipient, index) => {
		if (recipient.role === "signer") {
			signers.push({ recipient, index });
		} else {
			viewers.push({ recipient, index });
		}
	});

	signers.sort((a, b) => {
		const emailA = recipientSignerEmail(a.recipient);
		const emailB = recipientSignerEmail(b.recipient);
		const rankA = emailA
			? (orderRank.get(emailA.toLowerCase()) ?? Number.MAX_SAFE_INTEGER)
			: Number.MAX_SAFE_INTEGER;
		const rankB = emailB
			? (orderRank.get(emailB.toLowerCase()) ?? Number.MAX_SAFE_INTEGER)
			: Number.MAX_SAFE_INTEGER;
		if (rankA !== rankB) return rankA - rankB;
		return a.index - b.index;
	});

	return { signers, viewers };
}

export function reorderSignersInRecipients(
	recipients: Recipient[],
	signerFromIndex: number,
	signerToIndex: number,
	routingOrderEmails: string[] = [],
): { recipients: Recipient[]; routingOrderEmails: string[] } {
	const { signers, viewers } = partitionRecipientsForTurnOrder(
		recipients,
		routingOrderEmails,
	);

	if (
		signerFromIndex < 0 ||
		signerToIndex < 0 ||
		signerFromIndex >= signers.length ||
		signerToIndex >= signers.length ||
		signerFromIndex === signerToIndex
	) {
		return { recipients, routingOrderEmails };
	}

	const nextSigners = [...signers];
	const [moved] = nextSigners.splice(signerFromIndex, 1);
	if (!moved) return { recipients, routingOrderEmails };
	nextSigners.splice(signerToIndex, 0, moved);

	const nextRecipients = [
		...nextSigners.map((row) => row.recipient),
		...viewers.map((row) => row.recipient),
	];

	return {
		recipients: nextRecipients,
		routingOrderEmails: signerEmailsFromRecipients(nextRecipients),
	};
}

export { syncRoutingOrderOnRecipientChange } from "@/src/routes/dashboard/envelope/create/-lib/utils/sync-routing-order";

export function isTurnOrderEnabled(
	routing: RegisterRoutingInput | undefined,
): boolean {
	return routing?.routingMode === 1;
}
