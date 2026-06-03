import type { ComplianceBundle } from "@filosign/shared";
import {
	COMPLIANCE_CHAIN_TX_KINDS,
	LEAF_SCHEMA_VERSION_V1,
} from "@filosign/shared";

type ChainTxKind = (typeof COMPLIANCE_CHAIN_TX_KINDS)[number];

export type ComplianceCopyTextStyle =
	| "body"
	| "lead"
	| "subheading"
	| "listHeading"
	| "emphasis"
	| "smallMuted";

export type ComplianceGlossaryEntry = { term: string; detail: string };

export type ComplianceCopyLine = {
	text: string;
	linkUri?: string | null;
	display?: "hex-dump";
	textStyle?: ComplianceCopyTextStyle;
	pageBreakBefore?: boolean;
	glossaryEntry?: ComplianceGlossaryEntry;
};

/** Glossary / field-map row: bold `term`, then `: ` and wrapped `detail` (PDF). */
export function appendixGlossaryLine(
	term: string,
	detail: string,
): ComplianceCopyLine {
	return {
		text: `${term}: ${detail}`,
		glossaryEntry: { term, detail },
		textStyle: "body",
	};
}

export function buildAboutThisRecordLines(
	bundle: ComplianceBundle,
	explorerNote: string,
	execPlain: string,
): ComplianceCopyLine[] {
	const scope =
		bundle.executionStatus === "fully_executed"
			? "This PDF is an export of a Filosign compliance bundle. It describes who participated, what was committed on-chain at export time, and the transactions Filosign associates with this file. The export reflects a single moment in time; it is not a live dashboard."
			: "This PDF is an export of a Filosign compliance bundle. It describes who participated, what was committed on-chain at export time, and the transactions Filosign associates with this file. Execution was not complete when the bundle was generated: at least one required signer had not yet recorded an on-chain signature. Treat status as historical, not current.";

	return [
		{ text: scope, textStyle: "lead" },
		{ text: "" },
		{ text: "How to use this record", textStyle: "listHeading" },
		{
			text: "1. Bundle hash: Treat the bundle hash (in the key identifiers table) as the fingerprint of the canonical JSON snapshot. Any change to the JSON changes the hash.",
			textStyle: "body",
		},
		{
			text: "2. Transactions: Use the transaction index to locate each transaction hash on a block explorer for this chain. Compare block numbers, timestamps, and contract addresses to your own records.",
			textStyle: "body",
		},
		{
			text: "3. Registration snapshot: When present, the on-chain registration snapshot was read from FSEnvelopeRegistry at export time. You may reconcile those fields against the registration transaction and the same registry view on an archive node or explorer.",
			textStyle: "body",
		},
		{
			text: "4. Placements and Merkle data: Field placements and the placement manifest JSON underpin the placement commitment. The Merkle section lists per-signer completion roots and inclusion proofs so an independent party can recompute leaf hashes (see @filosign/shared) and verify roots.",
			textStyle: "body",
		},
		{ text: "" },
		{ text: explorerNote, textStyle: "emphasis" },
		{ text: "" },
		{ text: execPlain, textStyle: "lead" },
	];
}

export function buildTimestampExplainerLines(): ComplianceCopyLine[] {
	return [
		{
			text: "Timestamps in this record: Registration time on-chain follows the signed registration message. The block timestamp on a signature transaction reflects when that transaction was included. “Signed at” in the signer matrix matches the EIP-712 message time stored when the signature was submitted; it may differ slightly from block time.",
			textStyle: "emphasis",
		},
	];
}

const TX_KIND_GLOSSARY: Record<ChainTxKind, string> = {
	file_registered:
		"Initial registration of the file’s commitments (placements, signers, viewers, sender bindings) on FSEnvelopeRegistry.",
	file_signed:
		"A signer’s signature recorded on-chain for this file (registry `registerEnvelopeSignature`).",
	signer_amended:
		"Sender replaced a signer email commitment before signing (`amendSigner` on FSEnvelopeRegistry).",
	envelope_revoked_before_complete:
		"Sender or workspace controller voided the envelope on-chain before completion (`recallEnvelope` on FSEnvelopeRegistry). Partial signatures may remain in the audit trail.",
	payout_executed:
		"FSPaymentValidator `executePayout`: USDC transferFrom sender to recipient when release conditions were met.",
};

export function buildAppendixLines(): ComplianceCopyLine[] {
	const lines: ComplianceCopyLine[] = [
		{
			text: "Appendix A - Glossary (terms and verification)",
			textStyle: "subheading",
		},
		{ text: "" },
		{
			text: "Each entry states what the term means in Filosign and how a reviewer can use it. Technical values in the body of this PDF are authoritative; this appendix explains them.",
			textStyle: "lead",
		},
		{ text: "" },
		appendixGlossaryLine(
			"Export ID",
			"Stable identifier for this export in Filosign systems. Verify: correlate with your internal export or audit log entry.",
		),
		appendixGlossaryLine(
			"Bundle hash (SHA-256)",
			"Cryptographic digest of the canonical JSON bundle. Verify: recompute SHA-256 over the canonical JSON (sorted keys as emitted by Filosign) and compare.",
		),
		appendixGlossaryLine(
			"Piece CID",
			"Content identifier for the encrypted document payload Filosign stores. Verify: match to your storage or IPFS gateway records for the file.",
		),
		appendixGlossaryLine(
			"Placement commitment",
			"`bytes32` commitment to the canonical placement manifest (field ids, types, positions, recipients). Verify: recompute from the manifest JSON printed in this PDF and compare to the commitment field.",
		),
		appendixGlossaryLine(
			"Placement manifest",
			"JSON description of fields and normalized coordinates. Verify: canonical serialization must match the placement commitment algorithm in @filosign/shared.",
		),
		appendixGlossaryLine(
			"Registration transaction",
			"Submitted by the sender to anchor the file on FSEnvelopeRegistry. Verify: open the tx on an explorer; check logs and state for the piece CID and commitments.",
		),
		appendixGlossaryLine(
			"Signers commitment / viewers commitment",
			"Commitments to the ordered sets of signers and viewers. Verify: recompute from the party list and compare to on-chain registration fields when the snapshot is present.",
		),
		appendixGlossaryLine(
			"Sender email commitment / sender Auth subject commitment",
			"Hides the sender’s email and login subject while binding them to the registration. Verify: compare to the sender row under Parties.",
		),
		appendixGlossaryLine(
			"emailCommitment (party or acknowledgement)",
			"Hides a participant email while allowing Filosign to bind the same email across events. Verify: recomputed only with the preimage (Filosign internal); auditors typically check consistency across rows and txs.",
		),
		appendixGlossaryLine(
			"authSubjectCommitment",
			"Hides the authentication subject identifier (not shown in raw form in the bundle). Verify: consistency across party rows and acknowledgements where present.",
		),
		appendixGlossaryLine(
			"cidIdentifier (on-chain)",
			"Registry’s internal bytes32 key derived from the piece CID for lookups. Verify: compare to `cidIdentifier` RPC output for the same piece CID.",
		),
		appendixGlossaryLine(
			"requiredSignersCount / requiredSignaturesCount / signaturesCount",
			"Counts from `envelopeRegistrations` for required signers vs recorded signatures. Verify: compare to explorer contract state at the same block height when possible.",
		),
		appendixGlossaryLine(
			"registration timestamp (uint256)",
			"Contract-stored registration time field as a decimal string from the bundle. Verify: read the same field from the registry view.",
		),
		appendixGlossaryLine(
			"Execution status",
			"`fully_executed` or `partially_executed` from Filosign’s view of required fields vs on-chain signatures at export. Verify: cross-check the signer matrix against your business rules.",
		),
		appendixGlossaryLine(
			"Merkle completions root",
			`Root over per-field completion leaves (schema v${LEAF_SCHEMA_VERSION_V1}). Verify: recompute leaves with computeLeafHashV1 and Merkle combine per @filosign/shared; compare to the root printed for each signer.`,
		),
		appendixGlossaryLine(
			"Merkle siblings / leaf index",
			"Standard Merkle inclusion proof material. Verify: walk the sibling list with the leaf hash to reproduce the root.",
		),
		appendixGlossaryLine(
			"Off-chain acknowledgement",
			"EIP-712 acknowledgement captured without a chain transaction. Verify: validate the typed-data signature out-of-band against the wallet and commitments shown.",
		),
		{ text: "" },
		{
			text: "Transaction kinds (index section)",
			textStyle: "listHeading",
		},
		{ text: "" },
	];

	for (const kind of COMPLIANCE_CHAIN_TX_KINDS) {
		lines.push(appendixGlossaryLine(kind, TX_KIND_GLOSSARY[kind]));
	}

	lines.push(
		{ text: "" },
		{
			text: "Appendix B - JSON field map (bundle version 4)",
			textStyle: "subheading",
		},
		{ text: "" },
		{
			text: "Each path is relative to the root compliance bundle object. Values are reproduced in the body of this PDF.",
			textStyle: "lead",
		},
		{ text: "" },
	);

	const rows: Array<[string, string]> = [
		["version", "Schema version; must be 4 for this layout."],
		["pieceCid", "Content id for the encrypted document payload."],
		["chainId", "EVM chain id for all on-chain references in the bundle."],
		["exportedAtIso", "UTC timestamp when Filosign finalized this bundle."],
		[
			"executionStatus",
			"Whether all required signers had on-chain signatures at export.",
		],
		["placementCommitment", "Commitment to the canonical placement manifest."],
		[
			"placementManifest",
			"Full manifest object (fields, geometry, recipients).",
		],
		["registration.sender", "Sender wallet recorded at registration."],
		[
			"registration.registrationTxHash",
			"Hash of the registry registration tx.",
		],
		["registration.createdAtIso", "Registration message time (UTC)."],
		[
			"parties[ ]",
			"Sender, signers, and viewers with wallets and commitments.",
		],
		["parties[ ].role", "sender | signer | viewer."],
		["parties[ ].wallet", "Checksummed participant address."],
		["parties[ ].email", "Plain email for human review (not commitment)."],
		["parties[ ].displayName", "Human-readable name when available."],
		["parties[ ].emailCommitment", "Commitment to normalized email."],
		[
			"parties[ ].authSubjectCommitment",
			"Commitment to auth subject when set.",
		],
		[
			"onchainRegistration",
			"Nullable ABI-shaped snapshot from FSEnvelopeRegistry at export.",
		],
		["onchainRegistration.cidIdentifier", "Registry key for the piece CID."],
		["onchainRegistration.sender", "On-chain sender address for the cid."],
		[
			"onchainRegistration.placementCommitment",
			"On-chain placement commitment.",
		],
		[
			"onchainRegistration.signersCommitment",
			"On-chain signers set commitment.",
		],
		[
			"onchainRegistration.viewersCommitment",
			"On-chain viewers set commitment.",
		],
		["onchainRegistration.senderEmailCommitment", "Sender email commitment."],
		[
			"onchainRegistration.senderAuthSubjectCommitment",
			"Sender auth-subject commitment.",
		],
		[
			"onchainRegistration.requiredSignersCount",
			"Required signer count from registry.",
		],
		[
			"onchainRegistration.signaturesCount",
			"Recorded signature count from registry.",
		],
		[
			"onchainRegistration.timestamp",
			"Registration timestamp field (uint256).",
		],
		["transactions[ ]", "Ordered list of related chain transactions."],
		["transactions[ ].kind", "Lifecycle label (see Appendix A tx kinds)."],
		["transactions[ ].txHash", "Transaction hash on this chain."],
		["transactions[ ].chainId", "Chain id (redundant with root chainId)."],
		["transactions[ ].contractAddress", "To-address of the call."],
		["transactions[ ].summary", "Human-readable one-line description."],
		["transactions[ ].relatedAddresses", "Addresses Filosign tags for the tx."],
		["transactions[ ].blockNumber", "Block number when known."],
		["transactions[ ].timestamp", "Block timestamp (unix seconds) when known."],
		["transactions[ ].fetchedAtIso", "When Filosign fetched receipt metadata."],
		["signers[ ]", "Per-signer compliance row aligned to the manifest."],
		["signers[ ].wallet", "Signer address."],
		["signers[ ].displayName", "Display name when known."],
		["signers[ ].email", "Signer email when known."],
		["signers[ ].signed", "Whether an on-chain signature exists."],
		["signers[ ].assignedFieldIds", "Fields assigned to this signer."],
		["signers[ ].requiredFieldIds", "Required fields for this signer."],
		["signers[ ].optionalFieldIds", "Optional fields for this signer."],
		["signers[ ].onchainTxHash", "Signature transaction hash when signed."],
		["signers[ ].signedAtIso", "EIP-712 message time when signed."],
		["signers[ ].completedFieldIds", "Fields completed when signing."],
		[
			"signers[ ].completionsRoot",
			"Merkle root of completion leaves when set.",
		],
		["signers[ ].leafSchemaVersion", "Leaf hash schema version when set."],
		["signers[ ].merkleProofs", "Inclusion proofs for completed fields."],
		[
			"signers[ ].draftCompletedFieldIds",
			"Draft-only completions if unsigned.",
		],
		[
			"signers[ ].messageTimestampIso",
			"Message timestamp from signing payload.",
		],
		[
			"signers[ ].blockTimestampFromTx",
			"Block time from the sign tx receipt when fetched.",
		],
		["settlements[ ]", "USDC payout rules attached at send time."],
		["settlements[ ].onChainRuleId", "FSPaymentValidator rule id."],
		["settlements[ ].recipientWallet", "Recipient address for the payout."],
		["settlements[ ].tokenAddress", "ERC-20 token (USDC)."],
		["settlements[ ].amount", "Token amount in base units."],
		["settlements[ ].releaseType", "When the payout may execute."],
		["settlements[ ].status", "Filosign-tracked payout status at export."],
		["settlements[ ].registerRuleTxHash", "On-chain registerRule transaction."],
		["settlements[ ].approveTxHash", "Sender USDC approve transaction."],
		["settlements[ ].payoutTxHash", "executePayout transaction when paid."],
		["settlements[ ].executedAtIso", "UTC time payout completed when known."],
		["settlements[ ].lastError", "Last relay or chain error when failed."],
		[
			"offChainEvidence.payoutRecipientAcknowledgements",
			"Signer payout disclosures logged when a payout was attached.",
		],
		[
			"offChainEvidence.payoutRecipientAcknowledgements[ ].signerWallet",
			"Wallet that accepted the disclosure.",
		],
		[
			"offChainEvidence.payoutRecipientAcknowledgements[ ].termsVersion",
			"Disclosure text version accepted at sign.",
		],
		[
			"offChainEvidence.payoutRecipientAcknowledgements[ ].acknowledgedAtIso",
			"UTC time of recipient disclosure.",
		],
		[
			"offChainEvidence.acknowledgements",
			"Typed acknowledgements without txs.",
		],
		[
			"offChainEvidence.acknowledgements[ ].wallet",
			"Signer wallet for the ack.",
		],
		[
			"offChainEvidence.acknowledgements[ ].createdAtIso",
			"Acknowledgement time.",
		],
		[
			"offChainEvidence.acknowledgements[ ].emailCommitment",
			"Email commitment inside the ack.",
		],
		[
			"offChainEvidence.acknowledgements[ ].authSubjectCommitment",
			"Subject commitment when present.",
		],
		[
			"offChainEvidence.acknowledgements[ ].ackSha256",
			"Digest of ack payload.",
		],
	];

	for (const [path, meaning] of rows) {
		lines.push(appendixGlossaryLine(path, meaning));
	}

	return lines;
}
