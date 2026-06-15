import {
	orderSignersByRoutingEmails,
	type PlacementManifest,
	type RegisterRoutingInput,
} from "@filosign/shared";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { primaryEmailForWallet } from "../../invites";
import { type ParticipantRow, rosterPerson } from "./access";

export type ColdSignerInviteRow = {
	email: string;
	emailCommitment: Hex;
	claimedByWallet: Address | null;
};

export type PieceDetailSignerRow = {
	wallet: Address;
	name: string | null;
	email: string | null;
	invitePending?: boolean;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export async function buildPieceDetailSigners(args: {
	participants: ParticipantRow[];
	sender: Address;
	manifestParsed:
		| { success: boolean; data: PlacementManifest }
		| { success: false };
	senderEmail: string | null;
	registerRouting?: RegisterRoutingInput | null;
	coldSignerInvites?: ColdSignerInviteRow[];
}): Promise<PieceDetailSignerRow[]> {
	const signerParticipants = args.participants.filter(
		(p) => p.role === "signer",
	);
	const senderWallet = getAddress(args.sender);
	const senderParticipant = args.participants.find(
		(p) => getAddress(p.wallet) === senderWallet,
	);

	let senderEmailForManifest: string | null =
		senderParticipant?.email ?? args.senderEmail;
	if (
		!senderEmailForManifest &&
		args.manifestParsed.success &&
		args.manifestParsed.data.fields.length > 0
	) {
		senderEmailForManifest = await primaryEmailForWallet(senderWallet);
	}

	const senderHasAssignedFields = Boolean(
		senderEmailForManifest &&
			args.manifestParsed.success &&
			args.manifestParsed.data.fields.some(
				(f) => f.assignedRecipientEmail === senderEmailForManifest,
			),
	);

	const warmRoster: PieceDetailSignerRow[] = [
		...signerParticipants.map(rosterPerson),
		...(senderHasAssignedFields &&
		!signerParticipants.some((p) => getAddress(p.wallet) === senderWallet)
			? [
					senderParticipant
						? rosterPerson(senderParticipant)
						: {
								wallet: senderWallet,
								name: null,
								email: senderEmailForManifest,
							},
				]
			: []),
	];

	const warmEmails = new Set(
		warmRoster
			.map((signer) => signer.email?.trim().toLowerCase())
			.filter((email): email is string => Boolean(email)),
	);

	for (const invite of args.coldSignerInvites ?? []) {
		const email = invite.email.trim();
		if (!email || warmEmails.has(email.toLowerCase())) continue;
		warmRoster.push({
			wallet: invite.claimedByWallet
				? getAddress(invite.claimedByWallet)
				: ZERO_ADDRESS,
			name: null,
			email,
			invitePending: invite.claimedByWallet == null,
		});
	}

	return orderSignersByRoutingEmails(warmRoster, {
		routingMode: args.registerRouting?.routingMode ?? 0,
		routingOrderEmails: args.registerRouting?.routingOrderEmails,
	}).map(({ turnIndex: _turnIndex, ...signer }) => signer);
}

export function senderHasManifestFields(args: {
	manifestParsed:
		| { success: boolean; data: PlacementManifest }
		| { success: false };
	senderEmailForManifest: string | null;
}): boolean {
	return Boolean(
		args.senderEmailForManifest &&
			args.manifestParsed.success &&
			args.manifestParsed.data.fields.some(
				(f) => f.assignedRecipientEmail === args.senderEmailForManifest,
			),
	);
}

export async function resolveSenderEmailForManifest(args: {
	sender: Address;
	senderParticipant: ParticipantRow | undefined;
	senderEmail: string | null;
	manifestParsed:
		| { success: boolean; data: PlacementManifest }
		| { success: false };
}): Promise<string | null> {
	let senderEmailForManifest: string | null =
		args.senderParticipant?.email ?? args.senderEmail;
	if (
		!senderEmailForManifest &&
		args.manifestParsed.success &&
		args.manifestParsed.data.fields.length > 0
	) {
		senderEmailForManifest = await primaryEmailForWallet(
			getAddress(args.sender),
		);
	}
	return senderEmailForManifest;
}
