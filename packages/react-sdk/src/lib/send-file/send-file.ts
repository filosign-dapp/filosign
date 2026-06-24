import { toHex } from "@filosign/crypto-utils";
import z from "zod";
import { latestChainTimestamp } from "../chain-time";
import { buildRegisterEnvelopeSignature } from "./build-register-signature";
import { pollRegistrationStatus } from "./poll-registration-status";
import { prepareColdInvites } from "./prepare-cold-invites";
import { preparePieceCrypto } from "./prepare-piece-crypto";
import { processAttachmentPackets } from "./process-attachment-packets";
import { emitSendFileProgress } from "./progress";
import {
	registerConditionalAttachments,
	registerSettlementRulesForFile,
} from "./register-post-send";
import type {
	SendFileArgs,
	SendFileDeps,
	SendFileIncompleteStep,
	SendFileResult,
} from "./types";
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
		resume,
		onPreparedPiece,
		onUploadCompleted,
	} = args;

	const emit = (event: Parameters<typeof emitSendFileProgress>[1]) =>
		emitSendFileProgress(onProgress, event);

	const validated = validateSendFileInput({
		user: deps.user,
		documents,
		placementManifest,
	});

	let piece: Awaited<ReturnType<typeof preparePieceCrypto>>;
	let timestamp: number;
	if (resume?.preparedPiece) {
		piece = resume.preparedPiece;
		timestamp = piece.timestamp;
		emit({ phase: "encrypting", status: "done" });
	} else {
		timestamp = await latestChainTimestamp(deps.contracts);
		emit({ phase: "encrypting", status: "start" });
		piece = await preparePieceCrypto({
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
		onPreparedPiece?.(piece);
	}

	if (resume?.uploadCompleted) {
		emit({ phase: "uploading", status: "done" });
	} else {
		emit({ phase: "uploading", status: "start" });
		await uploadEncryptedPiece({
			rpcQuery: deps.rpcQuery,
			pieceCid: piece.pieceCid.toString(),
			encryptedData: piece.encryptedData,
			isPractice,
		});
		emit({ phase: "uploading", status: "done" });
		onUploadCompleted?.();
	}

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
	const registerResult = await deps.rpcQuery.files.register.call({
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

	let registrationStatus = registerResult.registrationStatus;
	if (registrationStatus === "queued" || registrationStatus === "registering") {
		const polled = await pollRegistrationStatus({
			rpcQuery: deps.rpcQuery,
			pieceCid: piece.pieceCid.toString(),
			initialStatus: registrationStatus,
			onProgress: (snapshot) => {
				if (snapshot.registrationStatus === "failed") {
					emit({
						phase: "register_failed",
						status: "error",
						detail: snapshot.registerError ?? "Registration failed on chain.",
					});
				}
			},
		});
		registrationStatus = polled.registrationStatus;
		if (registrationStatus === "failed") {
			throw new Error(
				polled.registerError ?? "Envelope registration failed on chain.",
			);
		}
	}

	emit({
		phase: "registering_envelope",
		status: "done",
		pieceCid: piece.pieceCid.toString(),
	});

	const incompleteSteps: SendFileIncompleteStep[] = [];

	try {
		await registerConditionalAttachments({
			deps,
			pieceCid: piece.pieceCid.toString(),
			attachmentPacketDrafts,
			attachmentPackets,
			onProgress,
		});
	} catch (error) {
		incompleteSteps.push("attachment_rule");
		console.error("Attachment rule registration failed after send:", error);
	}

	try {
		await registerSettlementRulesForFile({
			deps,
			pieceCid: piece.pieceCid.toString(),
			cidIdentifier,
			settlementRules,
			settlementPayerAddress: args.settlementPayerAddress,
			payoutPayerSource: args.payoutPayerSource,
			organizationId,
			onProgress,
			registerSettlementRules: args.registerSettlementRules,
		});
	} catch (error) {
		incompleteSteps.push("payout_registration");
		console.error("Payout registration failed after send:", error);
	}

	return {
		success: true as const,
		pieceCid: piece.pieceCid.toString(),
		...(coldInvitesPrepared.shareCode
			? { coldInviteShareCode: coldInvitesPrepared.shareCode }
			: {}),
		...(incompleteSteps.length > 0 ? { incompleteSteps } : {}),
		postSendRetryPayload: {
			cidIdentifier,
			attachmentPacketDrafts: attachmentPacketDrafts ?? [],
			attachmentPackets,
			settlementRules: settlementRules ?? [],
			settlementPayerAddress: args.settlementPayerAddress,
			payoutPayerSource: args.payoutPayerSource,
			organizationId,
			registerSettlementRules: args.registerSettlementRules,
		},
	};
}
