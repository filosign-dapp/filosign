import { getAddress, isAddress } from "viem";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";

type RosterPerson = {
	wallet: string;
	name?: string | null;
	email?: string | null;
};

function mapRosterPersonToRecipient(
	person: RosterPerson,
	role: Recipient["role"],
): Recipient | null {
	const walletRaw = person.wallet?.trim();
	if (!walletRaw || !isAddress(walletRaw)) {
		return null;
	}

	const walletAddress = getAddress(walletRaw);
	const email = person.email?.trim() ?? "";
	const name =
		person.name?.trim() ||
		email ||
		`${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`;

	return {
		clientRowId: walletAddress,
		role,
		name,
		email,
		walletAddress,
	};
}

export function mapEnvelopeRosterToRecipients(args: {
	signers?: readonly RosterPerson[];
	viewers?: readonly RosterPerson[];
}): Recipient[] {
	const recipients: Recipient[] = [];

	for (const signer of args.signers ?? []) {
		const mapped = mapRosterPersonToRecipient(signer, "signer");
		if (mapped) recipients.push(mapped);
	}

	for (const viewer of args.viewers ?? []) {
		const mapped = mapRosterPersonToRecipient(viewer, "viewer");
		if (mapped) recipients.push(mapped);
	}

	return recipients;
}

/** @deprecated Use mapEnvelopeRosterToRecipients for sign-page flows that need viewers. */
export function mapSignersToRecipients(
	signers: readonly RosterPerson[],
): Recipient[] {
	return mapEnvelopeRosterToRecipients({ signers });
}
