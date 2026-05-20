import { eq, type InferInsertModel } from "drizzle-orm";
import { isHex } from "viem";
import { materializePendingInvitesForEmail } from "@/lib/domains/sharing";
import { syncSenderApprovalsFromChainForWallet } from "@/lib/domains/sharing/sync-chain-approvals";
import db from "@/lib/platform/db";
import { users } from "@/lib/platform/db/schema/user";
import { fsContracts } from "@/lib/platform/evm";
import { ProcessTxUserError } from "@/lib/platform/indexer/errors";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import type { IndexerTxBodyParsed } from "@/lib/platform/validation/tx-registration";

const { FSKeyRegistry } = fsContracts;

export async function handleKeygenDataRegisteredFromIndexer(
	data: IndexerTxBodyParsed,
	log: {
		args: { user: `0x${string}` };
	},
): Promise<void> {
	const encryptionPublicKey = data.encryptionPublicKey?.trim();
	const signaturePublicKey = data.signaturePublicKey?.trim();
	const email = typeof data.email === "string" ? data.email.trim() : undefined;
	const privyDid =
		typeof data.privyDid === "string" ? data.privyDid.trim() : undefined;

	if (!encryptionPublicKey || !isHex(encryptionPublicKey)) {
		throw new ProcessTxUserError(
			"encryptionPublicKey is required for key registration and must be hex",
			400,
		);
	}
	if (!signaturePublicKey || !isHex(signaturePublicKey)) {
		throw new ProcessTxUserError(
			"signaturePublicKey is required for key registration and must be hex",
			400,
		);
	}

	const keygenData = await FSKeyRegistry.read.keygenData([log.args.user]);

	const [exists] = await db
		.select()
		.from(users)
		.where(eq(users.walletAddress, log.args.user));
	if (exists) return;

	await db.insert(users).values({
		walletAddress: log.args.user,
		encryptionPublicKey,
		signaturePublicKey,
		email: email || null,
		privyDid: privyDid || null,
		lastActiveAt: new Date(),
		keygenDataJson: {
			saltPin: keygenData[0],
			saltSeed: keygenData[1],
			saltChallenge: keygenData[2],
			commitmentKem: keygenData[3],
			commitmentSig: keygenData[4],
		},
	} as InferInsertModel<typeof users>);

	if (email?.trim()) {
		const inviteRes = await tryCatch(
			materializePendingInvitesForEmail({
				walletAddress: log.args.user,
				email: email.trim(),
			}),
		);
		if (inviteRes.error) {
			console.error(
				"materializePendingInvitesForEmail after registration:",
				inviteRes.error,
			);
		}
	}

	const syncRes = await tryCatch(
		syncSenderApprovalsFromChainForWallet(log.args.user),
	);
	if (syncRes.error) {
		console.error(
			"syncSenderApprovalsFromChainForWallet after registration:",
			syncRes.error,
		);
	}
}
