import { randomBytes, toHex } from "@filosign/crypto-utils";
import type { InferClientInputs } from "@orpc/client";
import type { Address, Hex } from "viem";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { walletAccountAddress } from "../../utils/evm";
import {
	buildColdExternalShare,
	buildWarmExternalShare,
	decryptDraftDekFromOrgHead,
} from "../draft-crypto";
import { getCachedDraftDek } from "../draft-dek-cache";
import { draftOrganizationId } from "../resolve-draft-dek";
import type { FilosignWallet } from "../wallet";

type DraftShareExternalInput =
	InferClientInputs<AppRouterClient>["drafts"]["shareExternal"];
type DraftShareExternalPayload = DraftShareExternalInput["shares"][number];

export type ShareDraftExternalResult = {
	shares: {
		shareId: string;
		email: string;
		accessKind: "warm" | "cold";
		inviteToken: string;
		phrase?: string;
	}[];
};

export type ShareDraftExternalDeps = {
	wallet: FilosignWallet;
	fetchDraftHead: (
		draftId: string,
	) => Promise<Awaited<ReturnType<AppRouterClient["drafts"]["get"]>>>;
	wrapForMine: (organizationId: string) => Promise<{
		wrappedOmk: Hex;
		wrapKemCiphertext: Hex;
	}>;
	lookupProfile: (email: string) => Promise<{
		encryptionPublicKey?: Hex;
		walletAddress?: Address;
	}>;
	shareExternal: (
		input: DraftShareExternalInput,
	) => ReturnType<AppRouterClient["drafts"]["shareExternal"]>;
};

function isUserNotFoundLookupError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const data = (error as { data?: unknown }).data;
	if (!data || typeof data !== "object") return false;
	return (data as { appCode?: unknown }).appCode === "USERS.USER_NOT_FOUND";
}

async function resolveRecipientProfile(
	deps: ShareDraftExternalDeps,
	email: string,
): Promise<{ encryptionPublicKey?: Hex; walletAddress?: Address }> {
	try {
		return await deps.lookupProfile(email);
	} catch (lookupError) {
		if (!isUserNotFoundLookupError(lookupError)) {
			throw lookupError;
		}
		return {};
	}
}

async function buildShareForEmail(args: {
	dek: Uint8Array;
	draftId: string;
	email: string;
	recipientPk?: Hex;
	recipientWallet?: Address;
}): Promise<{
	payload: DraftShareExternalPayload;
	clientRow: ShareDraftExternalResult["shares"][number];
}> {
	const inviteToken = toHex(randomBytes(32));

	if (args.recipientPk && args.recipientWallet) {
		const warm = await buildWarmExternalShare({
			dek: args.dek,
			draftId: args.draftId,
			inviteToken,
			recipientEncryptionPublicKey: args.recipientPk,
			recipientWallet: args.recipientWallet,
		});
		return {
			payload: {
				accessKind: "warm",
				email: args.email,
				inviteToken,
				recipientWallet: args.recipientWallet,
				kemCiphertext: warm.kemCiphertext,
				encryptedDek: warm.encryptedDek,
			},
			clientRow: {
				shareId: "",
				email: args.email,
				accessKind: "warm",
				inviteToken,
			},
		};
	}

	const cold = await buildColdExternalShare({
		dek: args.dek,
		draftId: args.draftId,
		inviteToken,
	});
	return {
		payload: {
			accessKind: "cold",
			email: args.email,
			inviteToken,
			wrappedDek: cold.wrappedDek,
		},
		clientRow: {
			shareId: "",
			email: args.email,
			accessKind: "cold",
			inviteToken,
			phrase: cold.phrase,
		},
	};
}

export async function shareDraftExternal(
	deps: ShareDraftExternalDeps,
	args: { draftId: string; emails: string[] },
): Promise<ShareDraftExternalResult> {
	const walletAddress = walletAccountAddress(deps.wallet.account);
	const head = await deps.fetchDraftHead(args.draftId);
	const organizationId = draftOrganizationId(head);
	if (!head.headDekWrappedOmk || !head.headOmkKemCiphertext) {
		throw new Error("Save the draft before sharing");
	}
	const myWrap = await deps.wrapForMine(organizationId);
	const cachedDek = getCachedDraftDek(args.draftId, walletAddress);
	const dek =
		cachedDek ??
		(await decryptDraftDekFromOrgHead({
			draftId: args.draftId,
			headDekWrappedOmk: head.headDekWrappedOmk,
			headOmkKemCiphertext: head.headOmkKemCiphertext,
			wallet: walletAddress,
			myWrap,
		}));

	const shares: ShareDraftExternalResult["shares"] = [];
	const payloadShares: DraftShareExternalPayload[] = [];

	for (const rawEmail of args.emails) {
		const email = rawEmail.trim().toLowerCase();
		if (!email) continue;

		const profile = await resolveRecipientProfile(deps, email);
		const built = await buildShareForEmail({
			dek,
			draftId: args.draftId,
			email,
			recipientPk: profile.encryptionPublicKey,
			recipientWallet: profile.walletAddress,
		});
		payloadShares.push(built.payload);
		shares.push(built.clientRow);
	}

	if (payloadShares.length === 0) {
		throw new Error("No valid emails to share with");
	}

	const result = await deps.shareExternal({
		draftId: args.draftId,
		shares: payloadShares,
	});

	const phraseByInviteToken = new Map(
		shares
			.filter((row) => row.phrase)
			.map((row) => [row.inviteToken, row.phrase] as const),
	);

	return {
		shares: result.shares.map((row) => ({
			...row,
			accessKind: row.accessKind as "warm" | "cold",
			phrase: phraseByInviteToken.get(row.inviteToken),
		})),
	};
}
