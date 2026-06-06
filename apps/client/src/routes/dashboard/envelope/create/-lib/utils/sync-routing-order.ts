import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import {
	recipientSignerEmail,
	signerEmailsFromRecipients,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/routing-turn-order";

function applyAddedRecipient(
	order: string[],
	prevRecipient: Recipient | undefined,
	nextRecipient: Recipient,
): string[] {
	if (!prevRecipient) {
		if (nextRecipient.role !== "signer") return order;
		const email = recipientSignerEmail(nextRecipient);
		if (email && !order.includes(email)) return [...order, email];
		return order;
	}
	return order;
}

function applyRoleChange(
	order: string[],
	prevRecipient: Recipient,
	nextRecipient: Recipient,
): string[] {
	const prevEmail = recipientSignerEmail(prevRecipient);
	const nextEmail = recipientSignerEmail(nextRecipient);

	if (prevRecipient.role === "signer" && nextRecipient.role === "viewer") {
		if (!prevEmail) return order;
		return order.filter((email) => email !== prevEmail);
	}

	if (prevRecipient.role === "viewer" && nextRecipient.role === "signer") {
		if (nextEmail && !order.includes(nextEmail)) return [...order, nextEmail];
		return order;
	}

	if (
		prevRecipient.role === "signer" &&
		nextRecipient.role === "signer" &&
		prevEmail &&
		nextEmail &&
		prevEmail !== nextEmail
	) {
		return order.map((email) => (email === prevEmail ? nextEmail : email));
	}

	return order;
}

function applyRemovedSigners(
	order: string[],
	prev: Recipient[],
	nextIds: Set<string>,
): string[] {
	let nextOrder = order;
	for (const prevRecipient of prev) {
		if (
			prevRecipient.clientRowId &&
			!nextIds.has(prevRecipient.clientRowId) &&
			prevRecipient.role === "signer"
		) {
			const email = recipientSignerEmail(prevRecipient);
			if (email) nextOrder = nextOrder.filter((e) => e !== email);
		}
	}
	return nextOrder;
}

function reconcileOrderWithRecipients(
	order: string[],
	next: Recipient[],
): string[] {
	const validSignerEmails = new Set(signerEmailsFromRecipients(next));
	const nextOrder = order.filter((email) => validSignerEmails.has(email));
	for (const email of signerEmailsFromRecipients(next)) {
		if (!nextOrder.includes(email)) nextOrder.push(email);
	}
	return nextOrder;
}

export function syncRoutingOrderOnRecipientChange(
	prev: Recipient[],
	next: Recipient[],
	currentOrder: string[],
): string[] {
	const prevById = new Map(
		prev.filter((r) => r.clientRowId).map((r) => [r.clientRowId as string, r]),
	);
	const nextIds = new Set(
		next.map((r) => r.clientRowId).filter(Boolean) as string[],
	);

	let order = [...currentOrder];

	for (const nextRecipient of next) {
		const id = nextRecipient.clientRowId;
		if (!id) continue;
		const prevRecipient = prevById.get(id);
		order = applyAddedRecipient(order, prevRecipient, nextRecipient);
		if (prevRecipient) {
			order = applyRoleChange(order, prevRecipient, nextRecipient);
		}
	}

	order = applyRemovedSigners(order, prev, nextIds);
	return reconcileOrderWithRecipients(order, next);
}
