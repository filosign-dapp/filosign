import { toHex } from "@filosign/crypto-utils";
import z from "zod";
import { latestChainTimestamp } from "../chain-time";
import { buildRegisterEnvelopeSignature } from "./build-register-signature";
import { prepareColdInvites } from "./prepare-cold-invites";
import { preparePieceCrypto } from "./prepare-piece-crypto";
import { processAttachmentPackets } from "./process-attachment-packets";
import { emitSendFileProgress } from "./progress";
import {
	registerConditionalAttachments,
	registerSettlementRulesForFile,
} from "./register-post-send";
import type { SendFileArgs, SendFileDeps, SendFileResult } from "./types";
import {
	assertSendFileConnected,
	validateSendFileInput,
} from "./validate-send-file";

async function uploadEncryptedPiece(args: {
	rpcQuery: SendFileDeps["rpcQuery"];
	pieceCid: string;
	encryptedData: Uint8Array;
	isPractice?: boolean;
}): Promise<void> {
	const uploadStartRaw = await args.rpcQuery.files.uploadStart.call({
		pieceCid: args.pieceCid,
		...(args.isPractice ? { isPractice: true } : {}),
	});
	const uploadStartResponse = z
		.object({ uploadUrl: z.string() })
		.parse(uploadStartRaw);

	const uploadBody = new Uint8Array(args.encryptedData);

	const uploadResponse = await fetch(uploadStartResponse.uploadUrl, {
		method: "PUT",
		headers: {
			"Content-Type": "application/octet-stream",
		},
		body: uploadBody,
	});

	if (!uploadResponse.ok) {
		throw new Error(`Upload failed: ${uploadResponse.statusText}`);
	}
}

export async function sendFile(
	deps: SendFileDeps,
	args: SendFileArgs,
): Promise<SendFileResult> {
	assertSendFileConnected(deps);

	const {
		signers,
		viewers,
		documents,
		metadata,
		placementManifest,
		attachmentPacketDrafts = [],
		warmRecipientsByEmail = [],
		coldInvites,
		viewerEmails,
		organizationId,
		orgEncryptionPublicKey,
		settlementRules = [],
		routing,
		isPractice,
		onProgress,
	} = args;

	const emit = (event: Parameters<typeof emitSendFileProgress>[1]) =>
		emitSendFileProgress(onProgress, event);

	const validated = validateSendFileInput({
		user: deps.user,
		documents,
		placementManifest,
	});

	const timestamp = await latestChainTimestamp(deps.contracts);

	emit({ phase: "encrypting", status: "start" });
	const piece = await preparePieceCrypto({
		deps,
		timestamp,
		documents,
		metadata,
		placementManifest,
		signers,
		viewers,
		organizationId,
		orgEncryptionPublicKey,
	});
	emit({ phase: "encrypting", status: "done" });

	emit({ phase: "uploading", status: "start" });
	await uploadEncryptedPiece({
		rpcQuery: deps.rpcQuery,
		pieceCid: piece.pieceCid.toString(),
		encryptedData: piece.encryptedData,
		isPractice,
	});
	emit({ phase: "uploading", status: "done" });

	emit({ phase: "wallet_sign_register", status: "wallet_prompt" });
	const { signature, placementCommitment, cidIdentifier } =
		await buildRegisterEnvelopeSignature({
			contracts: deps.contracts,
			wallet: deps.wallet,
			pieceCid: piece.pieceCid.toString(),
			placementManifest,
			viewerEmails,
			routing,
			documentSha256: piece.documentSha256,
			senderEmailCommitment: validated.senderEmailCommitment,
			senderAuthSubjectCommitment: validated.senderAuthSubjectCommitment,
			organizationId,
			timestamp,
		});
	emit({ phase: "wallet_sign_register", status: "done" });

	const coldInvitesPrepared = await prepareColdInvites({
		coldInvites,
		encryptionKey: piece.encryptionKey,
		pieceCid: piece.pieceCid,
	});

	const attachmentPackets = await processAttachmentPackets({
		rpc: deps.rpc,
		attachmentPacketDrafts,
		warmRecipientsByEmail,
		coldInvites,
		coldPhrase: coldInvitesPrepared.phrase,
		sender: deps.user.email
			? {
					email: deps.user.email,
					encryptionPublicKey: deps.user.encryptionPublicKey,
				}
			: null,
		organizationId,
		orgEncryptionPublicKey,
	});

	if (
		!organizationId ||
		!piece.orgKemCiphertext ||
		!piece.orgEncryptedEncryptionKey
	) {
		throw new Error(
			"Active workspace required to register an envelope (org DEK wrap missing)",
		);
	}

	emit({ phase: "registering_envelope", status: "start" });
	await deps.rpcQuery.files.register.call({
		pieceCid: piece.pieceCid.toString(),
		participants: piece.participants,
		signature,
		senderEncryptedEncryptionKey: toHex(piece.selfEncryptedEncryptionKey),
		senderKemCiphertext: toHex(piece.selfKemCiphertext),
		timestamp,
		documentSha256: piece.documentSha256,
		placementCommitment,
		placementManifest,
		organizationId,
		orgKemCiphertext: piece.orgKemCiphertext,
		orgEncryptedEncryptionKey: piece.orgEncryptedEncryptionKey,
		...(coldInvitesPrepared.rows.length > 0
			? { coldInvites: coldInvitesPrepared.rows }
			: {}),
		...(routing ? { routing } : {}),
		...(attachmentPackets.length > 0 ? { attachmentPackets } : {}),
		displayName: metadata.name,
		mimeType: "application/pdf",
		ciphertextByteLength: piece.encryptedData.byteLength,
		...(isPractice ? { isPractice: true } : {}),
	});
	emit({ phase: "registering_envelope", status: "done" });

	await registerConditionalAttachments({
		deps,
		pieceCid: piece.pieceCid.toString(),
		attachmentPacketDrafts,
		attachmentPackets,
		onProgress,
	});

	await registerSettlementRulesForFile({
		deps,
		pieceCid: piece.pieceCid.toString(),
		cidIdentifier,
		settlementRules,
		organizationId,
		onProgress,
	});

	return {
		success: true as const,
		pieceCid: piece.pieceCid.toString(),
		...(coldInvitesPrepared.shareCode
			? { coldInviteShareCode: coldInvitesPrepared.shareCode }
			: {}),
	};
}
