import type { PlacementManifest } from "@filosign/shared";
import type { Address } from "viem";
import { getAddress } from "viem";
import { primaryEmailForWallet } from "../../invites";
import { type ParticipantRow, rosterPerson } from "./access";

export async function buildPieceDetailSigners(args: {
	participants: ParticipantRow[];
	sender: Address;
	manifestParsed:
		| { success: boolean; data: PlacementManifest }
		| { success: false };
	senderEmail: string | null;
}): Promise<
	Array<{ wallet: Address; name: string | null; email: string | null }>
> {
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

	return [
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
	].sort((a, b) => a.wallet.localeCompare(b.wallet));
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
