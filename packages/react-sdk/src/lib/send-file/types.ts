import type { ChainKey, FilosignContracts } from "@filosign/evm";
import type {
	PlacementManifest,
	RegisterRoutingInput,
	SettlementRuleRegistrationInput,
} from "@filosign/shared";
import type { Address, Hex } from "viem";
import type { FilosignRpcQueryUtils } from "../../context/FilosignContext";
import type { AppRouterClient } from "../../orpc/app-router-types";
import type { AttachmentPacketDraft } from "../attachment-packets";
import type { SettlementRuleDraft } from "../settlement-rules.ts";
import type { FilosignWallet } from "../wallet";
import type { SendFileProgressReporter } from "./progress";

export type SendFileSigner = {
	address: Address;
	encryptionPublicKey: Hex;
};

export type SendFileViewer = {
	address: Address;
	encryptionPublicKey: string;
};

export type SendFileDocument = {
	id: string;
	name: string;
	mimeType: string;
	bytes: Uint8Array;
};

export type SendFileWarmRecipient = {
	email: string;
	address: Address;
	encryptionPublicKey: Hex;
};

export type SendFileColdInvite = {
	email: string;
	isSigner: boolean;
};

export type SendFileArgs = {
	signers: SendFileSigner[];
	viewers: SendFileViewer[];
	documents: SendFileDocument[];
	metadata: { name: string };
	placementManifest: PlacementManifest;
	attachmentPacketDrafts?: AttachmentPacketDraft[];
	warmRecipientsByEmail?: SendFileWarmRecipient[];
	coldInvites?: SendFileColdInvite[];
	viewerEmails: string[];
	organizationId?: string;
	orgEncryptionPublicKey?: Hex;
	settlementRules?: SettlementRuleDraft[];
	settlementPayerAddress?: Address;
	payoutPayerSource?: "sender" | "org_wallet";
	/** Treasury / external payer registration when payer !== connected wallet. */
	registerSettlementRules?: (args: {
		payer: Address;
		cidIdentifier: Hex;
		rules: SettlementRuleDraft[];
		onProgress?: SendFileProgressReporter;
	}) => Promise<SettlementRuleRegistrationInput[]>;
	routing?: RegisterRoutingInput;
	isPractice?: boolean;
	/** Client-only progress callback; not sent to the server. */
	onProgress?: SendFileProgressReporter;
};

export type SendFileUser = {
	email?: string | null;
	authSubjectCommitment?: string | null;
	encryptionPublicKey: Hex;
};

export type SendFileDeps = {
	contracts: FilosignContracts;
	wallet: FilosignWallet;
	user: SendFileUser;
	rpc: AppRouterClient;
	rpcQuery: FilosignRpcQueryUtils;
	chainKey: ChainKey;
};

export type SendFileResult = {
	success: true;
	pieceCid: string;
	coldInviteShareCode?: {
		phrase: string;
		inviteToken: string;
		emails: string[];
	};
};
