import type { FieldCompletionMap } from "@filosign/shared";
import { LEAF_SCHEMA_VERSION_V1 } from "@filosign/shared";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { copyArtifactToEnvelopeSnapshot } from "@/lib/domains/users/signatures";
import { invalidateNotificationsInbox } from "@/lib/platform/cache/invalidate";
import db from "@/lib/platform/db";

const { fileFieldCompletions, fileSignatures, userSignatures } = db.schema;

export async function persistPieceSignRecords(args: {
	pieceCid: string;
	signerWallet: Address;
	signature: `0x${string}`;
	dl3Signature: `0x${string}`;
	txHash: `0x${string}`;
	completedFieldIdsStored: string[];
	completionsRoot: `0x${string}`;
	fieldCompletions: FieldCompletionMap;
	timestamp: number;
	requestIp?: string | null;
	requestUserAgent?: string | null;
}): Promise<void> {
	await db.insert(fileSignatures).values({
		filePieceCid: args.pieceCid,
		signer: args.signerWallet,
		evmSignature: args.signature,
		dl3Signature: args.dl3Signature,
		onchainTxHash: args.txHash,
		completedFieldIds: args.completedFieldIdsStored,
		completionsRoot: args.completionsRoot,
		leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
		requestIp: args.requestIp ?? null,
		requestUserAgent: args.requestUserAgent ?? null,
		createdAt: new Date(args.timestamp * 1000),
	});

	const now = new Date();
	const snapshotRows: (typeof fileFieldCompletions.$inferInsert)[] = [];

	for (const fieldId of args.completedFieldIdsStored) {
		const completion = args.fieldCompletions[fieldId];
		if (!completion) continue;

		let storageKey = completion.storageKey;
		let contentSha256 = completion.contentSha256;
		let sourceArtifactId = completion.sourceArtifactId;

		if (completion.valueKind === "visual" && completion.sourceArtifactId) {
			const [artifact] = await db
				.select()
				.from(userSignatures)
				.where(eq(userSignatures.id, completion.sourceArtifactId));

			if (artifact) {
				const snap = await copyArtifactToEnvelopeSnapshot({
					pieceCid: args.pieceCid,
					fieldId,
					artifact,
				});
				storageKey = snap.storageKey;
				contentSha256 = snap.contentSha256;
				sourceArtifactId = artifact.id;
			}
		}

		snapshotRows.push({
			filePieceCid: args.pieceCid,
			fieldId,
			signer: args.signerWallet,
			valueKind: completion.valueKind,
			sourceArtifactId,
			storageKey,
			contentSha256,
			textValue: completion.textValue,
			createdAt: now,
			updatedAt: now,
		});
	}

	if (snapshotRows.length > 0) {
		await db
			.insert(fileFieldCompletions)
			.values(snapshotRows)
			.onConflictDoNothing();
	}

	await invalidateNotificationsInbox(args.signerWallet);
}
