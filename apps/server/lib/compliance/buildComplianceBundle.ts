import { createHash } from "node:crypto";
import type { ComplianceBundle } from "@filosign/shared";
import {
	canonicalComplianceBundleJson,
	completionsMerkleProofsV1,
	FILE_ACK_COLD_CLAIM_SENTINEL_V1,
	fieldIdsForRecipientEmail,
	hashNormalizedSignerEmail,
	hashPrivySubjectCommitment,
	normalizePlacementRecipientEmail,
	requiredFieldIdsForRecipientEmail,
	zComplianceBundle,
	zPlacementManifest,
} from "@filosign/shared";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { getAddress, hexToBytes, isHex } from "viem";
import config from "@/config";
import type db from "@/lib/db";
import {
	complianceExportLogs,
	fileAcknowledgements,
	fileSignatures,
	fileSignerDrafts,
	files,
} from "@/lib/db/schema/file";
import { shareApprovals } from "@/lib/db/schema/sharing";
import { users } from "@/lib/db/schema/user";
import { evmClient, fsContracts } from "@/lib/evm";
import { tryCatch } from "@/lib/utils/tryCatch";

const { FSFileRegistry, FSManager } = fsContracts;

function sha256HexUtf8(s: string): `0x${string}` {
	const hex = createHash("sha256").update(s, "utf8").digest("hex");
	return `0x${hex}` as `0x${string}`;
}

function sha256HexOfHexBytes(h: Hex): `0x${string}` {
	const bytes = hexToBytes(h);
	const hex = createHash("sha256").update(bytes).digest("hex");
	return `0x${hex}` as `0x${string}`;
}

export type ParticipantRow = {
	wallet: Address;
	role: "sender" | "viewer" | "signer";
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	username: string | null;
	privyDid: string | null;
};

function displayNameFromUser(p: ParticipantRow): string | null {
	const n = [p.firstName, p.lastName].filter(Boolean).join(" ");
	if (n.trim()) return n.trim();
	return p.username?.trim() || null;
}

function roleOrder(r: ParticipantRow["role"]): number {
	if (r === "sender") return 0;
	if (r === "signer") return 1;
	return 2;
}

type TxDraft = {
	kind: ComplianceBundle["transactions"][number]["kind"];
	txHash: Hex;
	contractAddress: Address;
	summary: string;
	relatedAddresses: Address[];
};

async function receiptMeta(txHash: Hex): Promise<{
	blockNumber: number | null;
	timestamp: number | null;
}> {
	const recRes = await tryCatch(
		evmClient.getTransactionReceipt({ hash: txHash }),
	);
	const receipt = recRes.data;
	if (!receipt?.blockNumber) {
		return { blockNumber: null, timestamp: null };
	}
	const blockNumber = Number(receipt.blockNumber);
	let timestamp: number | null = null;
	const blockRes = await tryCatch(
		evmClient.getBlock({ blockNumber: receipt.blockNumber }),
	);
	if (blockRes.data?.timestamp) {
		timestamp = Number(blockRes.data.timestamp);
	}
	return { blockNumber, timestamp };
}

export async function buildComplianceBundleAndHash(args: {
	db: typeof db;
	pieceCid: string;
	participantRows: ParticipantRow[];
}): Promise<{
	bundle: ComplianceBundle;
	bundleHash: `0x${string}`;
}> {
	const { db: database, pieceCid, participantRows } = args;

	const [fileRecord] = await database
		.select({
			sender: files.sender,
			onchainTxHash: files.onchainTxHash,
			createdAt: files.createdAt,
			placementCommitment: files.placementCommitment,
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throw new Error("File not found");
	}

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new Error("Invalid placement manifest on file record");
	}
	const manifest = manifestParsed.data;

	const sigRows = await database
		.select({
			signer: fileSignatures.signer,
			onchainTxHash: fileSignatures.onchainTxHash,
			createdAt: fileSignatures.createdAt,
			completedFieldIds: fileSignatures.completedFieldIds,
			completionsRoot: fileSignatures.completionsRoot,
			leafSchemaVersion: fileSignatures.leafSchemaVersion,
		})
		.from(fileSignatures)
		.where(eq(fileSignatures.filePieceCid, pieceCid));

	const draftRows = await database
		.select({
			wallet: fileSignerDrafts.wallet,
			completedFieldIds: fileSignerDrafts.completedFieldIds,
		})
		.from(fileSignerDrafts)
		.where(eq(fileSignerDrafts.filePieceCid, pieceCid));

	const ackRowsRaw = await database
		.select({
			wallet: fileAcknowledgements.wallet,
			ackCreatedAt: fileAcknowledgements.createdAt,
			ack: fileAcknowledgements.ack,
			email: users.email,
			privyDid: users.privyDid,
		})
		.from(fileAcknowledgements)
		.innerJoin(users, eq(fileAcknowledgements.wallet, users.walletAddress))
		.where(eq(fileAcknowledgements.filePieceCid, pieceCid));

	const draftByWallet = new Map(
		draftRows.map((d) => [
			getAddress(d.wallet).toLowerCase(),
			d.completedFieldIds,
		]),
	);

	const sigByWallet = new Map(
		sigRows.map((s) => [getAddress(s.signer).toLowerCase(), s]),
	);

	const signerParticipants = participantRows.filter((p) => p.role === "signer");
	const totalSigners = signerParticipants.length;
	const signedCount = signerParticipants.filter((p) =>
		sigByWallet.has(getAddress(p.wallet).toLowerCase()),
	).length;

	const executionStatus =
		totalSigners > 0 && signedCount === totalSigners
			? ("fully_executed" as const)
			: ("partially_executed" as const);

	const exportedAtIso = new Date().toISOString();
	const senderNorm = getAddress(fileRecord.sender);
	const participantWallets = [
		...new Set(participantRows.map((p) => getAddress(p.wallet))),
	];

	const approvalRows = await database
		.select({
			recipientWallet: shareApprovals.recipientWallet,
			senderWallet: shareApprovals.senderWallet,
			active: shareApprovals.active,
			txHash: shareApprovals.txHash,
			createdAt: shareApprovals.createdAt,
		})
		.from(shareApprovals)
		.where(
			or(
				and(
					eq(shareApprovals.senderWallet, senderNorm),
					inArray(shareApprovals.recipientWallet, participantWallets),
				),
				and(
					eq(shareApprovals.recipientWallet, senderNorm),
					inArray(shareApprovals.senderWallet, participantWallets),
				),
			),
		)
		.orderBy(desc(shareApprovals.createdAt));

	const latestApproveByRecipient = new Map<string, Hex>();
	for (const row of approvalRows) {
		if (!row.active) continue;
		const rec = getAddress(row.recipientWallet).toLowerCase();
		if (
			getAddress(row.senderWallet) === senderNorm &&
			!latestApproveByRecipient.has(rec)
		) {
			latestApproveByRecipient.set(rec, row.txHash as Hex);
		}
	}

	let onchainRegistration: ComplianceBundle["onchainRegistration"] = null;
	const cidRes = await tryCatch(FSFileRegistry.read.cidIdentifier([pieceCid]));
	if (cidRes.data) {
		const cidId = cidRes.data as Hex;
		const regRes = await tryCatch(
			FSFileRegistry.read.fileRegistrations([cidId]),
		);
		const reg = regRes.data as
			| {
					sender: Address;
					signersCommitment: Hex;
					viewersCommitment: Hex;
					placementCommitment: Hex;
					senderEmailCommitment: Hex;
					senderPrivySubjectCommitment: Hex;
					signersCount: number | bigint;
					signaturesCount: number | bigint;
					timestamp: bigint;
			  }
			| undefined;
		if (reg) {
			onchainRegistration = {
				cidIdentifier: cidId,
				sender: getAddress(reg.sender),
				signersCommitment: reg.signersCommitment as Hex,
				viewersCommitment: reg.viewersCommitment as Hex,
				placementCommitment: reg.placementCommitment as Hex,
				senderEmailCommitment: reg.senderEmailCommitment as Hex,
				senderPrivySubjectCommitment: reg.senderPrivySubjectCommitment as Hex,
				signersCount: Number(reg.signersCount),
				signaturesCount: Number(reg.signaturesCount),
				timestamp: reg.timestamp.toString(),
			};
		}
	}

	const sortedParticipants = [...participantRows].sort((a, b) => {
		const ro = roleOrder(a.role) - roleOrder(b.role);
		if (ro !== 0) return ro;
		return getAddress(a.wallet).localeCompare(getAddress(b.wallet));
	});

	const parties: ComplianceBundle["parties"] = sortedParticipants.map((p) => {
		const wallet = getAddress(p.wallet);
		const emailRaw = p.email?.trim();
		if (!emailRaw) {
			throw new Error(
				`Participant ${wallet} missing email for compliance export`,
			);
		}
		const email = normalizePlacementRecipientEmail(emailRaw);
		const emailCommitment = hashNormalizedSignerEmail(email);
		const privySubjectCommitment = p.privyDid?.trim()
			? hashPrivySubjectCommitment(p.privyDid.trim())
			: null;
		return {
			role: p.role,
			wallet,
			email,
			displayName: displayNameFromUser(p),
			emailCommitment,
			privySubjectCommitment,
		};
	});

	const signers: ComplianceBundle["signers"] = signerParticipants.map((p) => {
		const wallet = getAddress(p.wallet);
		const walletKey = wallet.toLowerCase();
		const displayName = displayNameFromUser(p);

		const emailNorm = p.email?.trim()
			? normalizePlacementRecipientEmail(p.email)
			: "";
		const assigned = emailNorm
			? fieldIdsForRecipientEmail(manifest, emailNorm)
			: [];
		const assignedFieldIds = assigned.map((f) => f.id);
		const reqIds = emailNorm
			? requiredFieldIdsForRecipientEmail(manifest, emailNorm)
			: [];
		const reqSet = new Set(reqIds);
		const optionalFieldIds = assignedFieldIds.filter((id) => !reqSet.has(id));

		const sig = sigByWallet.get(walletKey);
		const draftIds = draftByWallet.get(walletKey) ?? [];
		const approveSenderTxHash = latestApproveByRecipient.get(walletKey) ?? null;

		if (sig) {
			const completedFieldIds = sig.completedFieldIds;
			const merkleProofs = completionsMerkleProofsV1({
				fieldIds: completedFieldIds,
				placementCommitment: fileRecord.placementCommitment,
				pieceCid,
				signer: wallet,
			}).map((pr) => ({
				fieldId: pr.fieldId,
				leafHash: pr.leafHash,
				leafIndex: pr.leafIndex,
				siblings: pr.siblings,
			}));

			const signedAtIso = sig.createdAt.toISOString();
			return {
				wallet,
				displayName,
				email: p.email,
				signed: true,
				assignedFieldIds,
				requiredFieldIds: reqIds,
				optionalFieldIds,
				onchainTxHash: sig.onchainTxHash as `0x${string}`,
				signedAtIso,
				messageTimestampIso: signedAtIso,
				blockTimestampFromTx: null as number | null,
				approveSenderTxHash,
				completedFieldIds,
				completionsRoot: sig.completionsRoot,
				leafSchemaVersion: sig.leafSchemaVersion,
				merkleProofs,
				draftCompletedFieldIds: [] as string[],
			};
		}

		return {
			wallet,
			displayName,
			email: p.email,
			signed: false,
			assignedFieldIds,
			requiredFieldIds: reqIds,
			optionalFieldIds,
			onchainTxHash: null,
			signedAtIso: null,
			messageTimestampIso: null,
			blockTimestampFromTx: null,
			approveSenderTxHash,
			completedFieldIds: [] as string[],
			completionsRoot: null,
			leafSchemaVersion: null,
			merkleProofs: [] as ComplianceBundle["signers"][number]["merkleProofs"],
			draftCompletedFieldIds: draftIds.filter((id) =>
				assignedFieldIds.includes(id),
			),
		};
	});

	const regAddr = getAddress(FSFileRegistry.address);
	const mgrAddr = getAddress(FSManager.address);
	const chainId = config.runtimeChain.id;
	const fetchedAtIso = exportedAtIso;

	const txDrafts: TxDraft[] = [];
	txDrafts.push({
		kind: "file_registered",
		txHash: fileRecord.onchainTxHash as Hex,
		contractAddress: regAddr,
		summary:
			"registerFile — file placement and sender commitments recorded on-chain",
		relatedAddresses: [senderNorm],
	});

	for (const s of sigRows) {
		const w = getAddress(s.signer);
		txDrafts.push({
			kind: "file_signed",
			txHash: s.onchainTxHash as Hex,
			contractAddress: regAddr,
			summary: `registerFileSignature — signer ${w}`,
			relatedAddresses: [senderNorm, w],
		});
	}

	const seenApprovalTx = new Set<string>();
	for (const row of approvalRows) {
		const h = (row.txHash as string).toLowerCase();
		if (seenApprovalTx.has(h)) continue;
		seenApprovalTx.add(h);
		txDrafts.push({
			kind: row.active ? "sender_approved" : "sender_revoked",
			txHash: row.txHash as Hex,
			contractAddress: mgrAddr,
			summary: row.active
				? `approveSender — recipient ${getAddress(row.recipientWallet)} approved sender ${getAddress(row.senderWallet)}`
				: `sender relationship update (revoked) — tx ${row.txHash}`,
			relatedAddresses: [
				getAddress(row.recipientWallet),
				getAddress(row.senderWallet),
			],
		});
	}

	const uniqueHashes = [
		...new Set(txDrafts.map((t) => t.txHash.toLowerCase())),
	].map((h) => h as Hex);
	const receiptCache = new Map<
		string,
		Awaited<ReturnType<typeof receiptMeta>>
	>();
	for (const h of uniqueHashes) {
		receiptCache.set(h.toLowerCase(), await receiptMeta(h));
	}

	const transactions: ComplianceBundle["transactions"] = txDrafts.map((d) => {
		const meta = receiptCache.get(d.txHash.toLowerCase()) ?? {
			blockNumber: null,
			timestamp: null,
		};
		return {
			kind: d.kind,
			txHash: d.txHash,
			chainId,
			contractAddress: d.contractAddress,
			summary: d.summary,
			relatedAddresses: d.relatedAddresses,
			blockNumber: meta.blockNumber,
			timestamp: meta.timestamp,
			fetchedAtIso,
		};
	});

	transactions.sort((a, b) => {
		if (a.blockNumber != null && b.blockNumber != null) {
			if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
		} else if (a.blockNumber != null) return -1;
		else if (b.blockNumber != null) return 1;
		return a.txHash.localeCompare(b.txHash);
	});

	for (const s of signers) {
		if (!s.signed || !s.onchainTxHash) continue;
		const meta = receiptCache.get(s.onchainTxHash.toLowerCase());
		if (meta?.timestamp != null) {
			s.blockTimestampFromTx = meta.timestamp;
		}
	}

	const acknowledgements: ComplianceBundle["offChainEvidence"]["acknowledgements"] =
		[];
	for (const row of ackRowsRaw) {
		if (row.ack === FILE_ACK_COLD_CLAIM_SENTINEL_V1) continue;
		const w = getAddress(row.wallet);
		const emailRaw = row.email?.trim();
		if (!emailRaw) continue;
		const email = normalizePlacementRecipientEmail(emailRaw);
		const emailCommitment = hashNormalizedSignerEmail(email);
		const privySubjectCommitment = row.privyDid?.trim()
			? hashPrivySubjectCommitment(row.privyDid.trim())
			: null;
		const ackHex = row.ack as Hex;
		const ackSha256 = isHex(ackHex) ? sha256HexOfHexBytes(ackHex) : null;
		acknowledgements.push({
			wallet: w,
			createdAtIso: row.ackCreatedAt.toISOString(),
			emailCommitment,
			privySubjectCommitment,
			ackSha256,
		});
	}

	const raw: ComplianceBundle = {
		version: 2,
		pieceCid,
		chainId,
		exportedAtIso,
		executionStatus,
		placementCommitment: fileRecord.placementCommitment,
		placementManifest: manifest,
		registration: {
			sender: senderNorm,
			registrationTxHash: fileRecord.onchainTxHash,
			createdAtIso: fileRecord.createdAt.toISOString(),
		},
		parties,
		onchainRegistration,
		transactions,
		signers,
		offChainEvidence: { acknowledgements },
	};

	const bundle = zComplianceBundle.parse(raw);
	const bundleHash = sha256HexUtf8(canonicalComplianceBundleJson(bundle));

	return { bundle, bundleHash };
}

export async function insertComplianceExportLog(args: {
	db: typeof db;
	pieceCid: string;
	requestedBy: Address;
	bundle: ComplianceBundle;
	bundleHash: `0x${string}`;
	documentSha256?: string | undefined;
	requestUserAgent?: string | null;
	requestIp?: string | null;
}): Promise<{ exportId: string }> {
	const {
		db: database,
		pieceCid,
		requestedBy,
		bundle,
		bundleHash,
		documentSha256,
		requestUserAgent,
		requestIp,
	} = args;

	const signaturesSnapshotCount = bundle.signers.filter((s) => s.signed).length;

	const [row] = await database
		.insert(complianceExportLogs)
		.values({
			filePieceCid: pieceCid,
			requestedBy: getAddress(requestedBy),
			bundleVersion: bundle.version,
			bundleHash,
			bundleJson: bundle,
			executionStatus: bundle.executionStatus,
			signaturesSnapshotCount,
			documentSha256: documentSha256 ?? null,
			requestUserAgent: requestUserAgent ?? null,
			requestIp: requestIp ?? null,
		})
		.returning({ id: complianceExportLogs.id });

	const exportId = row?.id;
	if (!exportId) {
		throw new Error("Failed to persist compliance export log");
	}
	return { exportId };
}
