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

export function syncRoutingOrderOnRecipientChange(
	prev: Recipient[],
	next: Recipient[],
	currentOrder: string[],
): string[] {
	let order = [...currentOrder];
	const prevById = new Map(
		prev.filter((r) => r.clientRowId).map((r) => [r.clientRowId as string, r]),
	);
	const nextIds = new Set(
		next.map((r) => r.clientRowId).filter(Boolean) as string[],
	);

	for (const nextRecipient of next) {
		const id = nextRecipient.clientRowId;
		if (!id) continue;
		const prevRecipient = prevById.get(id);

		if (!prevRecipient) {
			if (nextRecipient.role === "signer") {
				const email = recipientSignerEmail(nextRecipient);
				if (email && !order.includes(email)) order.push(email);
			}
			continue;
		}

		const prevEmail = recipientSignerEmail(prevRecipient);
		const nextEmail = recipientSignerEmail(nextRecipient);

		if (prevRecipient.role === "signer" && nextRecipient.role === "viewer") {
			if (prevEmail) {
				order = order.filter((email) => email !== prevEmail);
			}
		}

		if (prevRecipient.role === "viewer" && nextRecipient.role === "signer") {
			if (nextEmail && !order.includes(nextEmail)) order.push(nextEmail);
		}

		if (
			prevRecipient.role === "signer" &&
			nextRecipient.role === "signer" &&
			prevEmail &&
			nextEmail &&
			prevEmail !== nextEmail
		) {
			order = order.map((email) => (email === prevEmail ? nextEmail : email));
		}
	}

	for (const prevRecipient of prev) {
		if (
			prevRecipient.clientRowId &&
			!nextIds.has(prevRecipient.clientRowId) &&
			prevRecipient.role === "signer"
		) {
			const email = recipientSignerEmail(prevRecipient);
			if (email) order = order.filter((e) => e !== email);
		}
	}

	const validSignerEmails = new Set(signerEmailsFromRecipients(next));
	order = order.filter((email) => validSignerEmails.has(email));
	for (const email of signerEmailsFromRecipients(next)) {
		if (!order.includes(email)) order.push(email);
	}

	return order;
}

export function isTurnOrderEnabled(
	routing: RegisterRoutingInput | undefined,
): boolean {
	return routing?.routingMode === 1;
}
