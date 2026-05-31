import {
	LEAF_SCHEMA_VERSION_V1,
	settlementReleaseTypeLabel,
	settlementStatusLabel,
} from "@filosign/shared";
import { formatUnits } from "viem";
import { SUPPORTED_TOKENS } from "@/src/constants";
import type {
	CompliancePdfBundleOptions,
	CompliancePdfLine,
	CompliancePdfSummary,
} from "../compliance-pdf-types";
import {
	buildAboutThisRecordLines,
	buildAppendixLines,
	buildTimestampExplainerLines,
} from "./copy";
import {
	fieldPlacementStatusFromSignerRow,
	signersByNormalizedRecipientEmail,
} from "./placement";

/** Section title for appendix; must match the appendix entry in this module. */
export const COMPLIANCE_PDF_APPENDIX_SECTION_TITLE =
	"Appendix: glossary and JSON field map" as const;

function explorerTxUrl(explorerBase: string, txHash: string): string {
	const base = explorerBase.replace(/\/$/, "");
	return `${base}/tx/${txHash}`;
}

export function buildCompliancePdfSummaryFromBundle(
	options: CompliancePdfBundleOptions,
): CompliancePdfSummary {
	const {
		bundle,
		bundleHash,
		exportId,
		chainName,
		explorerBaseUrl,
		documentSha256,
		decryptedDocumentMeta,
	} = options;

	const signersByRecipient = signersByNormalizedRecipientEmail(bundle.signers);

	const regTxLink =
		explorerBaseUrl && bundle.registration.registrationTxHash
			? explorerTxUrl(explorerBaseUrl, bundle.registration.registrationTxHash)
			: null;

	const execPlain =
		bundle.executionStatus === "fully_executed"
			? "Fully executed - every required signer has an on-chain signature recorded as of this export."
			: "Partially executed - at least one signer has not yet recorded an on-chain signature. This record reflects status at export time only.";

	const fields: CompliancePdfSummary["fields"] = [
		{ label: "Export ID", value: exportId },
		{ label: "Bundle hash (SHA-256)", value: bundleHash },
		{ label: "Generated (UTC)", value: bundle.exportedAtIso },
		{ label: "Chain ID", value: String(bundle.chainId) },
		{ label: "Chain", value: chainName },
		{ label: "Piece CID", value: bundle.pieceCid },
		{ label: "Execution (system)", value: bundle.executionStatus },
		{ label: "Placement commitment", value: bundle.placementCommitment },
		{ label: "Sender", value: bundle.registration.sender },
		{ label: "Registered", value: bundle.registration.createdAtIso },
		{
			label: "Registration tx",
			value: bundle.registration.registrationTxHash,
		},
	];

	if (documentSha256) {
		fields.push({
			label: "Document SHA-256",
			value: documentSha256,
		});
	}

	if (regTxLink) {
		fields.push({
			label: "Registration explorer link",
			value: regTxLink,
			linkUri: regTxLink,
		});
	}

	const hasExplorerLinks = Boolean(explorerBaseUrl);
	const explorerNote = hasExplorerLinks
		? "Registration, signature, and settlement transaction links appear in the transaction index below."
		: "No blockchain explorer configured for this network - verify transactions manually using the chain ID and transaction hashes provided.";

	const aboutLines: CompliancePdfLine[] = [
		...buildAboutThisRecordLines(bundle, explorerNote, execPlain),
		{ text: "" },
		...buildTimestampExplainerLines(),
	];

	const partiesLines: CompliancePdfLine[] = [
		{
			text: "Each row is a participant on this file. Wallet addresses are checksummed. Commitments are one-way fingerprints of email or login subject (see appendix); they allow Filosign to correlate events without storing raw identifiers in the bundle.",
			textStyle: "lead",
		},
		{ text: "" },
		{
			text: "Parties on this file (sender, signers, viewers):",
			textStyle: "listHeading",
		},
		{ text: "" },
	];
	for (let i = 0; i < bundle.parties.length; i++) {
		const p = bundle.parties[i];
		const name = p.displayName?.trim() || "(no display name)";
		partiesLines.push({
			text: `${i + 1}. [${p.role}] ${name} / ${p.email} / ${p.wallet}`,
		});
		partiesLines.push({
			text: `   emailCommitment: ${p.emailCommitment}`,
		});
		if (p.privySubjectCommitment) {
			partiesLines.push({
				text: `   privySubjectCommitment: ${p.privySubjectCommitment}`,
			});
		}
		if (i < bundle.parties.length - 1) partiesLines.push({ text: "" });
	}

	const onchainLines: CompliancePdfLine[] = [];
	if (bundle.onchainRegistration) {
		const o = bundle.onchainRegistration;
		onchainLines.push(
			{
				text: "These fields were read from FSFileRegistry.fileRegistrations for this content id at export time. Compare them to an archive node, indexer, or explorer contract view from the same block height when you need a strict chain match.",
				textStyle: "lead",
			},
			{ text: "" },
			{
				text: "Snapshot of FSFileRegistry.fileRegistrations(cid) at export time:",
				textStyle: "listHeading",
			},
			{ text: "" },
			{ text: `cidIdentifier: ${o.cidIdentifier}` },
			{ text: `sender: ${o.sender}` },
			{ text: `placementCommitment: ${o.placementCommitment}` },
			{ text: `signersCommitment: ${o.signersCommitment}` },
			{ text: `viewersCommitment: ${o.viewersCommitment}` },
			{ text: `senderEmailCommitment: ${o.senderEmailCommitment}` },
			{
				text: `senderPrivySubjectCommitment: ${o.senderPrivySubjectCommitment}`,
			},
			{
				text: `signersCount: ${o.signersCount} / signaturesCount: ${o.signaturesCount}`,
			},
			{ text: `registration timestamp (uint256): ${o.timestamp}` },
		);
	} else {
		onchainLines.push({
			text: "On-chain registration snapshot was unavailable (RPC); verify via explorer using registration tx and piece CID.",
			textStyle: "emphasis",
		});
	}

	const txIndexLines: CompliancePdfLine[] = [
		{
			text: "Each line is a transaction Filosign associates with this file on the stated chain. Follow explorer links to inspect input data, events, and status. Summaries are descriptive; authoritative identifiers are the hashes and contract addresses printed here.",
			textStyle: "lead",
		},
		{ text: "" },
		{
			text: "Transaction index (file lifecycle on this chain):",
			textStyle: "listHeading",
		},
		{ text: "" },
	];
	for (let i = 0; i < bundle.transactions.length; i++) {
		const t = bundle.transactions[i];
		const head = `${i + 1}. [${t.kind}] ${t.txHash}`;
		txIndexLines.push({ text: head });
		txIndexLines.push({ text: `   Contract: ${t.contractAddress}` });
		txIndexLines.push({ text: `   ${t.summary}` });
		if (t.blockNumber != null) {
			txIndexLines.push({
				text: `   block: ${t.blockNumber}${t.timestamp != null ? ` / blockTime(utc approx): ${new Date(t.timestamp * 1000).toISOString()}` : ""}`,
			});
		}
		if (explorerBaseUrl) {
			const link = explorerTxUrl(explorerBaseUrl, t.txHash);
			txIndexLines.push({ text: `   Link: ${link}`, linkUri: link });
		}
		if (i < bundle.transactions.length - 1) txIndexLines.push({ text: "" });
	}

	const signerMatrix: CompliancePdfLine[] = [
		{
			text: "Human-oriented view of each signer row: identity, signature status, message times, and links to on-chain transactions when present. Cross-reference the transaction index for full contract context.",
			textStyle: "lead",
		},
		{ text: "" },
		{
			text: "Each required participant and their on-chain status:",
			textStyle: "listHeading",
		},
		{ text: "" },
	];

	for (let i = 0; i < bundle.signers.length; i++) {
		const s = bundle.signers[i];

		const parts: string[] = [];
		if (s.displayName) parts.push(s.displayName);
		if (s.email) parts.push(s.email);
		parts.push(s.wallet);

		const identityLine = parts.join(" / ");

		const statusLabel = s.signed ? "SIGNED" : "NOT SIGNED";

		signerMatrix.push({ text: `${i + 1}. ${identityLine}` });

		if (s.signed) {
			signerMatrix.push({ text: `   Status: ${statusLabel}` });
			if (s.signedAtIso) {
				signerMatrix.push({
					text: `   Signed at (EIP-712 message time, UTC): ${s.signedAtIso}`,
				});
			}
			if (s.blockTimestampFromTx != null) {
				signerMatrix.push({
					text: `   Block time from sign tx receipt (UTC): ${new Date(s.blockTimestampFromTx * 1000).toISOString()}`,
				});
			}
			if (s.completionsRoot) {
				signerMatrix.push({
					text: `   Root: ${s.completionsRoot}`,
				});
			}
			if (s.onchainTxHash) {
				signerMatrix.push({ text: `   Tx: ${s.onchainTxHash}` });
				if (explorerBaseUrl) {
					const txLink = explorerTxUrl(explorerBaseUrl, s.onchainTxHash);
					signerMatrix.push({ text: `   Link: ${txLink}`, linkUri: txLink });
				}
			}
		} else {
			signerMatrix.push({ text: `   Status: ${statusLabel}` });
			if (s.draftCompletedFieldIds.length > 0) {
				signerMatrix.push({
					text: `   Draft fields: ${s.draftCompletedFieldIds.join(", ")}`,
				});
			}
		}

		if (i < bundle.signers.length - 1) {
			signerMatrix.push({ text: "" });
		}
	}

	const docMetaLines: CompliancePdfLine[] = decryptedDocumentMeta
		? [
				{
					text: "Optional file facts from the session that produced this export. They do not replace the document hash when one is present.",
					textStyle: "lead",
				},
				{ text: "" },
				{
					text: "Decrypted document snapshot (this export only):",
					textStyle: "listHeading",
				},
				{ text: "" },
				{
					text: `Name: ${decryptedDocumentMeta.name ?? "(unnamed)"} / ${decryptedDocumentMeta.mimeType ?? "-"} / ${String(decryptedDocumentMeta.sizeBytes)} bytes`,
				},
				{
					text: "Note: Raw bytes are not embedded; document hash binds the viewed content.",
					textStyle: "emphasis",
				},
			]
		: [
				{
					text: "Document bytes were not available in this session. The bundle still reflects on-chain placement and signatures.",
					textStyle: "emphasis",
				},
			];

	const placementRef: CompliancePdfLine[] = [
		{
			text: "Normalized coordinates (0–1) locate each field on the PDF page; page numbers are 1-based. Status reflects signer progress against the manifest at export time.",
			textStyle: "lead",
		},
		{ text: "" },
		{
			text: "Field placements (coordinates normalized 0-1; page numbers are 1-based):",
			textStyle: "listHeading",
		},
		{ text: "" },
	];

	for (let i = 0; i < bundle.placementManifest.fields.length; i++) {
		const f = bundle.placementManifest.fields[i];
		const recipientKey = f.assignedRecipientEmail.trim().toLowerCase();
		const signerRow = signersByRecipient.get(recipientKey);
		const st = fieldPlacementStatusFromSignerRow(signerRow, f.id);

		const name = signerRow?.displayName?.trim();
		const email = signerRow?.email?.trim();

		const statusLabel =
			st === "signed" ? "SIGNED" : st === "draft" ? "DRAFT" : "PENDING";
		const reqLabel = f.required ? "required" : "optional";

		placementRef.push({
			text: `${i + 1}. ${f.id} (${f.type}, ${reqLabel}, ${statusLabel})`,
		});
		placementRef.push({
			text: `   Page ${f.pageIndex + 1} / Rect [x:${f.rect.x.toFixed(3)} y:${f.rect.y.toFixed(3)} w:${f.rect.width.toFixed(3)} h:${f.rect.height.toFixed(3)}]`,
		});

		const signerParts: string[] = [];
		if (name) signerParts.push(name);
		if (email) signerParts.push(email);
		signerParts.push(f.assignedRecipientEmail);
		placementRef.push({ text: `   -> ${signerParts.join(" | ")}` });

		if (i < bundle.placementManifest.fields.length - 1) {
			placementRef.push({ text: "" });
		}
	}

	const manifestJson = JSON.stringify(bundle.placementManifest, null, 2);
	const manifestLines: CompliancePdfLine[] = [
		{
			text: "Canonical JSON for the placement commitment. Independent verification recomputes the commitment from this exact serialization (see @filosign/shared).",
			textStyle: "lead",
		},
		{ text: "" },
		{
			text: "Full placement manifest JSON (canonical for placement commitment):",
			textStyle: "listHeading",
		},
		{ text: "" },
	];
	for (const line of manifestJson.split("\n")) {
		manifestLines.push({ text: line || " ", textStyle: "smallMuted" });
	}

	const cryptoDetail: CompliancePdfLine[] = [
		{
			text: "Cryptographic evidence that each completed field contributes to the signer’s completions root. A reviewer with the manifest, piece CID, placement commitment, and signer address can recompute leaves and verify proofs against the root printed above.",
			textStyle: "lead",
		},
		{ text: "" },
		{
			text: `Merkle completion leaves (v1): keccak256(abi.encode(uint8 leafSchemaVersion=${LEAF_SCHEMA_VERSION_V1}, bytes32 fieldKey, bytes32 placementCommitment, bytes32 pieceCidDigest, address signer)) where fieldKey = keccak256(utf8 bytes of the manifest field id string) and pieceCidDigest = keccak256(utf8 bytes of the piece CID). Implementation: @filosign/shared computeLeafHashV1.`,
			textStyle: "emphasis",
		},
		{ text: "" },
	];

	for (let signerIdx = 0; signerIdx < bundle.signers.length; signerIdx++) {
		const s = bundle.signers[signerIdx];
		const signerNum = signerIdx + 1;

		const statusBadge = s.signed ? "SIGNED" : "NOT SIGNED";
		cryptoDetail.push({ text: `+-- Signer ${signerNum} ${statusBadge}` });
		cryptoDetail.push({ text: `| Wallet: ${s.wallet}` });

		if (s.completionsRoot) {
			cryptoDetail.push({
				text: `| Root:   ${s.completionsRoot}`,
			});
		}

		if (s.completedFieldIds.length > 0) {
			cryptoDetail.push({
				text: `| Fields: ${s.completedFieldIds.join(", ")}`,
			});
		}

		if (s.merkleProofs.length > 0) {
			cryptoDetail.push({ text: "|" });
			cryptoDetail.push({ text: "| Proofs:" });

			for (let pIdx = 0; pIdx < s.merkleProofs.length; pIdx++) {
				const pr = s.merkleProofs[pIdx];
				const isLastProof = pIdx === s.merkleProofs.length - 1;
				const proofPrefix = isLastProof ? "`--" : "|--";
				const childPrefix = isLastProof ? "    " : "|   ";

				cryptoDetail.push({
					text: `| ${proofPrefix} [${pr.fieldId}] leaf ${pr.leafIndex}: ${pr.leafHash}`,
				});

				if (pr.siblings.length === 0) {
					cryptoDetail.push({
						text: `| ${childPrefix}\`-- (no siblings - single leaf)`,
					});
				} else if (pr.siblings.length === 1) {
					cryptoDetail.push({
						text: `| ${childPrefix}\`-- ${pr.siblings[0]}`,
					});
				} else {
					cryptoDetail.push({
						text: `| ${childPrefix}\`-- ${pr.siblings.length} siblings:`,
					});
					for (let sIdx = 0; sIdx < pr.siblings.length; sIdx++) {
						const isLastSib = sIdx === pr.siblings.length - 1;
						const sibPrefix = isLastSib ? "`--" : "|--";
						cryptoDetail.push({
							text: `| ${childPrefix}   ${sibPrefix} ${pr.siblings[sIdx]}`,
						});
					}
				}
			}
		}

		cryptoDetail.push({ text: "+------------------------------" });

		if (signerIdx < bundle.signers.length - 1) {
			cryptoDetail.push({ text: "" });
		}
	}

	const ackLines: CompliancePdfLine[] = [];
	if (bundle.offChainEvidence.acknowledgements.length > 0) {
		ackLines.push(
			{
				text: "These entries were signed with EIP-712 off-chain; they are not implied by a transaction hash alone. Verify signatures against the wallets and commitments shown.",
				textStyle: "lead",
			},
			{ text: "" },
			{
				text: "Off-chain acknowledgements (EIP-712 validated; no chain tx):",
				textStyle: "listHeading",
			},
			{ text: "" },
		);
		for (let i = 0; i < bundle.offChainEvidence.acknowledgements.length; i++) {
			const a = bundle.offChainEvidence.acknowledgements[i];
			ackLines.push({
				text: `${i + 1}. Wallet ${a.wallet} acknowledged at ${a.acknowledgedAtIso}`,
			});
			ackLines.push({ text: `   intentVersion: ${a.intentVersion}` });
			ackLines.push({ text: `   emailCommitment: ${a.emailCommitment}` });
			if (a.privySubjectCommitment) {
				ackLines.push({
					text: `   privySubjectCommitment: ${a.privySubjectCommitment}`,
				});
			}
			if (a.ackSha256) {
				ackLines.push({ text: `   ackSha256: ${a.ackSha256}` });
			}
			if (i < bundle.offChainEvidence.acknowledgements.length - 1) {
				ackLines.push({ text: "" });
			}
		}
	}

	const settlementLines: CompliancePdfLine[] = [];
	if (bundle.settlements.length > 0) {
		const decimals = SUPPORTED_TOKENS[0]?.decimals ?? 6;
		settlementLines.push(
			{
				text: "USDC payout rules registered on FSPaymentValidator. Status reflects Filosign records at export; verify payout txs in the transaction index.",
				textStyle: "lead",
			},
			{ text: "" },
		);
		for (let i = 0; i < bundle.settlements.length; i++) {
			const p = bundle.settlements[i];
			const legSummary = p.legs
				.map(
					(leg) =>
						`${leg.recipientWallet}: ${formatUnits(BigInt(leg.amount), decimals)} USDC`,
				)
				.join("; ");
			settlementLines.push({
				text: `${i + 1}. ${legSummary}`,
			});
			settlementLines.push({
				text: `   Release: ${settlementReleaseTypeLabel(p.releaseType)} · Status: ${settlementStatusLabel(p.status)}`,
			});
			settlementLines.push({ text: `   Rule id: ${p.onChainRuleId}` });
			settlementLines.push({
				text: `   registerRule: ${p.registerRuleTxHash}`,
			});
			settlementLines.push({ text: `   approve: ${p.approveTxHash}` });
			if (p.payoutTxHash) {
				settlementLines.push({ text: `   payout: ${p.payoutTxHash}` });
				if (explorerBaseUrl) {
					const link = explorerTxUrl(explorerBaseUrl, p.payoutTxHash);
					settlementLines.push({ text: `   Link: ${link}`, linkUri: link });
				}
			}
			if (p.lastError) {
				settlementLines.push({ text: `   Error: ${p.lastError}` });
			}
			if (i < bundle.settlements.length - 1) settlementLines.push({ text: "" });
		}
	}

	const viewLines: CompliancePdfLine[] = [];
	if (bundle.offChainEvidence.documentViews.length > 0) {
		viewLines.push(
			{
				text: "Server-recorded document open events (decrypt/view), distinct from acknowledgement.",
				textStyle: "lead",
			},
			{ text: "" },
		);
		for (let i = 0; i < bundle.offChainEvidence.documentViews.length; i++) {
			const v = bundle.offChainEvidence.documentViews[i];
			viewLines.push({
				text: `${i + 1}. Wallet ${v.wallet} first opened ${v.firstViewedAtIso} (${v.source}, ${v.viewCount} view(s))`,
			});
			if (i < bundle.offChainEvidence.documentViews.length - 1) {
				viewLines.push({ text: "" });
			}
		}
	}

	const appendixLines: CompliancePdfLine[] = buildAppendixLines();

	return {
		explorerBaseUrl,
		fields,
		sections: [
			{ title: "About this record", lines: aboutLines },
			{ title: "Parties", lines: partiesLines },
			{ title: "On-chain registration snapshot", lines: onchainLines },
			{ title: "On-chain transactions (index)", lines: txIndexLines },
			{ title: "Signer matrix", lines: signerMatrix },
			...(settlementLines.length > 0
				? [{ title: "Attached settlements", lines: settlementLines }]
				: []),
			{ title: "Document content metadata", lines: docMetaLines },
			{ title: "Field placements", lines: placementRef },
			{ title: "Placement manifest (JSON)", lines: manifestLines },
			{
				title: "Cryptographic completion proofs (Merkle trees)",
				lines: cryptoDetail,
			},
			...(ackLines.length > 0
				? [{ title: "Off-chain acknowledgements", lines: ackLines }]
				: []),
			...(viewLines.length > 0
				? [{ title: "Document view events", lines: viewLines }]
				: []),
			{
				title: COMPLIANCE_PDF_APPENDIX_SECTION_TITLE,
				lines: appendixLines,
			},
		],
	};
}
