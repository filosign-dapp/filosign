import { throwAppError } from "@filosign/errors/server";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import { getOrgMemberWithDocumentRead } from "@/lib/domains/orgs";
import type { FileParticipantRole } from "@/lib/platform/db/schema/file";

export type ParticipantRow = {
	wallet: Address;
	role: FileParticipantRole;
	kemCiphertext: Hex;
	encryptedEncryptionKey: Hex;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	username: string | null;
};

export type PieceDetailAccess = {
	participantUser: ParticipantRow | undefined;
	orgRead: Awaited<ReturnType<typeof getOrgMemberWithDocumentRead>>;
	isSender: boolean;
	userWalletNorm: Address;
};

export async function resolvePieceDetailAccess(args: {
	userWallet: Address;
	participants: ParticipantRow[];
	organizationId: string | null;
	sender: Address;
}): Promise<PieceDetailAccess> {
	const userWalletNorm = getAddress(args.userWallet);
	const participantUser = args.participants.find(
		(p) => getAddress(p.wallet) === userWalletNorm,
	);

	const orgRead =
		participantUser || !args.organizationId
			? null
			: await getOrgMemberWithDocumentRead(userWalletNorm, args.organizationId);

	if (!participantUser && !orgRead) {
		throwAppError("FILES.FORBIDDEN");
	}

	const isSender = getAddress(args.sender) === userWalletNorm;

	return { participantUser, orgRead, isSender, userWalletNorm };
}

export function rosterPerson(p: ParticipantRow) {
	return {
		wallet: getAddress(p.wallet),
		name:
			[p.firstName, p.lastName].filter(Boolean).join(" ") || p.username || null,
		email: p.email || null,
	};
}
