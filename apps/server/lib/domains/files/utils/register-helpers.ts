import type { PlacementManifest, RegisterRoutingInput } from "@filosign/shared";
import {
	buildRegisterRoutingCalldata,
	buildRegistrationEmailCommitmentsForRouting,
	hashNormalizedSignerEmail,
	validateRegisterRoutingCalldata,
} from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { inviteExpiresAt } from "@/lib/domains/invites";
import {
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { buildEmailIdempotencyKey } from "@/lib/platform/email";
import type { JobOutboxInsert } from "@/lib/platform/jobs";

const { files, fileParticipants, fileColdInvites, users } = db.schema;

export type PersistRegisteredFileArgs = {
	pieceCid: string;
	sender: Address;
	organizationId: string;
	orgKemCiphertext: `0x${string}`;
	orgEncryptedEncryptionKey: `0x${string}`;
	onchainTxHash: `0x${string}`;
	registryAddress: Address;
	placementCommitment: `0x${string}`;
	documentSha256: `0x${string}`;
	placementManifest: PlacementManifest;
	registerRouting?: RegisterRoutingInput;
	warmParticipantCount: number;
	coldInviteCount: number;
	signerSlotCount: number;
	recipientSlotCount: number;
	displayName: string;
	mimeType: string;
	ciphertextByteLength: number;
	timestamp: number;
	participants: {
		address: Address;
		kemCiphertext: `0x${string}`;
		encryptedEncryptionKey: `0x${string}`;
		isSigner?: boolean;
	}[];
	senderKemCiphertext: `0x${string}`;
	senderEncryptedEncryptionKey: `0x${string}`;
	coldInvites: {
		email: string;
		inviteToken: string;
		wrappedEncryptionKey: `0x${string}`;
		isSigner: boolean;
	}[];
};

export type RegisterPersistTx = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

async function signerEmailCommitmentsByWallet(
	tx: RegisterPersistTx,
	wallets: Address[],
): Promise<Map<string, `0x${string}`>> {
	const unique = [...new Set(wallets.map((w) => getAddress(w)))];
	if (unique.length === 0) return new Map();

	const rows = await tx
		.select({
			walletAddress: users.walletAddress,
			email: users.email,
		})
		.from(users)
		.where(inArray(users.walletAddress, unique));

	const map = new Map<string, `0x${string}`>();
	for (const row of rows) {
		const email = row.email?.trim();
		if (!email) continue;
		map.set(
			getAddress(row.walletAddress).toLowerCase(),
			hashNormalizedSignerEmail(email),
		);
	}
	return map;
}

export function resolveRegisterRoutingCalldata(args: {
	placementManifest: PlacementManifest;
	routing: RegisterRoutingInput | undefined;
	viewerEmails: string[];
}) {
	const routing = args.routing ?? {};

	const routingCalldata = buildRegisterRoutingCalldata({
		placementManifest: args.placementManifest,
		routing,
	});
	const routingError = validateRegisterRoutingCalldata(routingCalldata);
	if (routingError) {
		throw new ORPCError("BAD_REQUEST", { message: routingError });
	}

	const {
		requiredCommitments: routingRequiredCommitments,
		optionalCommitments: optionalCommitmentsSorted,
		routingMode,
		routingOrder,
		quorumN,
		quorumSet,
	} = routingCalldata;

	const {
		requiredCommitments: requiredCommitmentsSorted,
		viewerEmailCommitmentsSorted,
	} = buildRegistrationEmailCommitmentsForRouting({
		placementManifest: args.placementManifest,
		viewerEmails: args.viewerEmails,
		routing,
	});

	return {
		requiredCommitmentsSorted,
		viewerEmailCommitmentsSorted,
		routingRequiredCommitments,
		optionalCommitmentsSorted,
		routingMode,
		routingOrder,
		quorumN,
		quorumSet,
	};
}

export async function persistRegisteredFileInTx(
	tx: RegisterPersistTx,
	args: PersistRegisteredFileArgs,
): Promise<void> {
	await tx
		.insert(files)
		.values({
			pieceCid: args.pieceCid,
			status: "s3",
			sender: args.sender,
			createdByWallet: getAddress(args.sender),
			organizationId: args.organizationId,
			orgKemCiphertext: args.orgKemCiphertext,
			orgEncryptedEncryptionKey: args.orgEncryptedEncryptionKey,
			onchainTxHash: args.onchainTxHash,
			registryAddress: args.registryAddress,
			placementCommitment: args.placementCommitment,
			documentSha256: args.documentSha256,
			placementManifestJson: args.placementManifest,
			registerRoutingJson: args.registerRouting ?? null,
			warmParticipantCount: args.warmParticipantCount,
			coldInviteCount: args.coldInviteCount,
			signerSlotCount: args.signerSlotCount,
			recipientSlotCount: args.recipientSlotCount,
			displayName: args.displayName,
			mimeType: args.mimeType,
			ciphertextByteLength: args.ciphertextByteLength,
			createdAt: new Date(args.timestamp * 1000),
		})
		.returning();

	const signerWallets = args.participants
		.filter((p) => p.isSigner)
		.map((p) => getAddress(p.address));
	const signerCommitmentsByWallet = await signerEmailCommitmentsByWallet(
		tx,
		signerWallets,
	);

	await tx.insert(fileParticipants).values([
		{
			filePieceCid: args.pieceCid,
			wallet: getAddress(args.sender),
			role: "sender",
			kemCiphertext: args.senderKemCiphertext,
			encryptedEncryptionKey: args.senderEncryptedEncryptionKey,
		},
		...args.participants.map((p) => {
			const wallet = getAddress(p.address);
			let emailCommitment: `0x${string}` | null = null;
			if (p.isSigner) {
				emailCommitment =
					signerCommitmentsByWallet.get(wallet.toLowerCase()) ?? null;
				if (!emailCommitment) {
					throw new ORPCError("BAD_REQUEST", {
						message: `Signer ${wallet} has no primary email for commitment`,
					});
				}
			}
			return {
				filePieceCid: args.pieceCid,
				wallet,
				role: p.isSigner ? ("signer" as const) : ("viewer" as const),
				emailCommitment,
				kemCiphertext: p.kemCiphertext,
				encryptedEncryptionKey: p.encryptedEncryptionKey,
			};
		}),
	]);

	if (args.coldInvites.length > 0) {
		await tx.insert(fileColdInvites).values(
			args.coldInvites.map((c) => ({
				filePieceCid: args.pieceCid,
				email: c.email.trim().toLowerCase(),
				emailCommitment: hashNormalizedSignerEmail(c.email),
				inviteToken: c.inviteToken,
				wrappedEncryptionKey: c.wrappedEncryptionKey,
				isSigner: c.isSigner,
				status: "pending" as const,
				expiresAt: inviteExpiresAt(),
			})),
		);
	}
}

export async function persistRegisteredFileInDb(
	args: PersistRegisteredFileArgs,
): Promise<void> {
	await db.transaction(async (tx) => {
		await persistRegisteredFileInTx(tx, args);
	});
}

export async function buildRegisterEmailOutboxRows(
	tx: RegisterPersistTx,
	args: {
		sender: Address;
		pieceCid: string;
		participantWallets: Address[];
		coldInvites: { email: string; inviteToken: string }[];
	},
): Promise<JobOutboxInsert[]> {
	const senderNorm = getAddress(args.sender);
	const walletList = [
		...new Set(args.participantWallets.map((w) => getAddress(w))),
	];

	const participantProfiles =
		walletList.length > 0
			? await tx
					.select({
						walletAddress: users.walletAddress,
						email: users.email,
					})
					.from(users)
					.where(inArray(users.walletAddress, walletList))
			: [];

	const [senderProfile] = await tx
		.select({
			email: users.email,
			firstName: users.firstName,
			lastName: users.lastName,
			username: users.username,
		})
		.from(users)
		.where(eq(users.walletAddress, senderNorm))
		.limit(1);

	const senderName =
		[senderProfile?.firstName, senderProfile?.lastName]
			.filter(Boolean)
			.join(" ") ||
		senderProfile?.username ||
		senderProfile?.email ||
		undefined;

	const rows: JobOutboxInsert[] = [];

	for (const profile of participantProfiles) {
		if (!profile.email?.trim()) continue;
		const to = profile.email.trim().toLowerCase();
		const idempotencySegments = [
			"doc-received",
			to,
			args.pieceCid,
			senderNorm.toLowerCase(),
		];
		rows.push({
			kind: "doc_received",
			payload: {
				to,
				senderWallet: senderNorm,
				pieceCid: args.pieceCid,
				senderName,
			},
			idempotencyKey: buildEmailIdempotencyKey(idempotencySegments),
		});
	}

	for (const invite of args.coldInvites) {
		const to = invite.email.trim().toLowerCase();
		const idempotencySegments = [
			"cold-doc-invite",
			to,
			args.pieceCid,
			senderNorm.toLowerCase(),
			invite.inviteToken,
		];
		rows.push({
			kind: "cold_doc_invite",
			payload: {
				to,
				senderWallet: senderNorm,
				pieceCid: args.pieceCid,
				inviteToken: invite.inviteToken,
				senderName,
			},
			idempotencyKey: buildEmailIdempotencyKey(idempotencySegments),
		});
	}

	return rows;
}

export function trackRegisterAnalytics(args: {
	sender: Address;
	pieceCid: string;
	slotCounts: {
		signerSlotCount: number;
		coldInviteCount: number;
		warmParticipantCount: number;
		recipientSlotCount: number;
	};
}) {
	trackServerEvent({
		distinctId: getAddress(args.sender),
		event: SERVER_ANALYTICS_EVENTS.fileRegistered,
		pieceCid: args.pieceCid,
		properties: {
			signer_count: args.slotCounts.signerSlotCount,
			cold_invite_count: args.slotCounts.coldInviteCount,
			warm_participant_count: args.slotCounts.warmParticipantCount,
			recipient_slot_count: args.slotCounts.recipientSlotCount,
		},
	});
	if (args.slotCounts.coldInviteCount > 0) {
		trackServerEvent({
			distinctId: getAddress(args.sender),
			event: SERVER_ANALYTICS_EVENTS.coldInviteCreated,
			pieceCid: args.pieceCid,
			properties: { cold_invite_count: args.slotCounts.coldInviteCount },
		});
	}
}
