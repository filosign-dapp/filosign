import {
	DEPLOYMENTS,
	zActivationMilestoneId,
	zUserKeygenDataJson,
	zUserSignatureArtifact,
	zUserSignatureCreateInput,
	zUserSignatureRole,
} from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { z } from "zod";
import { rpcEmptyOutputSchema, zDateWire } from "./rpc-wire";

export const rpcUserRegisterOutputSchema = rpcEmptyOutputSchema;

export const rpcUserRegistrationSnapshotOutputSchema = z.object({
	isRegistered: z.boolean(),
	storedKeygenData: z
		.object({
			saltSeed: z.string(),
			saltChallenge: z.string(),
			commitmentKem: z.string(),
			commitmentSig: z.string(),
		})
		.nullable(),
});

export const rpcUserProfileMeOutputSchema = z.object({
	walletAddress: zEvmAddress(),
	encryptionPublicKey: zHexString(),
	keygenData: zUserKeygenDataJson.nullable(),
	createdAt: zDateWire,
	email: z.string(),
	username: z.string().nullable(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	avatarKey: z.string().nullable(),
	avatarUrl: z.string().nullable(),
	authSubjectCommitment: z.string(),
	defaultSignatureId: z.uuid().nullable().optional(),
	defaultInitialId: z.uuid().nullable().optional(),
	defaultSignaturePreviewUrl: z.string().nullable().optional(),
	defaultInitialPreviewUrl: z.string().nullable().optional(),
});

export const rpcUserProfileUpdateOutputSchema = rpcEmptyOutputSchema;

export const rpcUserProfilePrevalidateOutputSchema = z.union([
	z.object({ valid: z.literal(false) }),
	z.object({ valid: z.literal(true) }),
]);

export const rpcUserProfileLookupOutputSchema = z.object({
	walletAddress: zEvmAddress(),
	encryptionPublicKey: zHexString(),
	createdAt: zDateWire,
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	avatarUrl: z.string().nullable(),
	email: z.string().nullable(),
	has: z.object({
		email: z.boolean(),
		mobile: z.boolean(),
	}),
});

export const rpcUserProfileSyncThirdwebEmailOutputSchema = z.union([
	z.object({ updated: z.literal(false) }),
	z.object({ updated: z.literal(true), email: z.string() }),
]);

export const rpcUserProfileSetPrimaryEmailOutputSchema = z.object({
	email: z.string(),
});

export const rpcUserEraseAccountOutputSchema = z.object({
	ok: z.literal(true),
	erasedAt: zDateWire,
});

export const rpcUserPrivacyStateOutputSchema = z.object({
	walletAddress: z.string(),
	email: z.string(),
	lastProfileUpdateAt: zDateWire,
	latestAnalyticsConsent: z
		.object({
			choice: z.enum(["granted", "denied", "withdrawn"]),
			policyVersion: z.string(),
			createdAt: zDateWire,
			withdrawnAt: zDateWire.nullable(),
		})
		.nullable(),
	privacyRequests: z.array(
		z.object({
			id: z.uuid(),
			type: z.enum(["export", "erasure"]),
			status: z.enum([
				"submitted",
				"in_review",
				"on_hold",
				"completed",
				"rejected",
			]),
			requestedAt: zDateWire,
			dueAt: zDateWire,
			completedAt: zDateWire.nullable(),
		}),
	),
	eraseSupported: z.boolean(),
	exportSupported: z.boolean(),
});

export const rpcUserSetAnalyticsConsentOutputSchema = z.object({
	ok: z.literal(true),
	choice: z.enum(["granted", "denied", "withdrawn"]),
});

export const rpcUserPrivacyRequestSchema = z.object({
	id: z.uuid(),
	type: z.enum(["export", "erasure"]),
	status: z.enum([
		"submitted",
		"in_review",
		"on_hold",
		"completed",
		"rejected",
	]),
	requestedAt: zDateWire,
	dueAt: zDateWire,
	completedAt: zDateWire.nullable().optional(),
	closureNote: z.string().nullable().optional(),
	legalHoldReason: z.string().nullable().optional(),
});

export const rpcUserPrivacyRequestCreateOutputSchema =
	rpcUserPrivacyRequestSchema;
export const rpcUserPrivacyRequestListOutputSchema = z.object({
	requests: z.array(rpcUserPrivacyRequestSchema),
});
export const rpcUserPrivacyRequestTransitionOutputSchema =
	rpcUserPrivacyRequestSchema;

export const rpcUserExportAccountDataOutputSchema = z.object({
	exportedAt: zDateWire,
	profile: z.object({
		walletAddress: z.string(),
		email: z.string(),
		username: z.string().nullable(),
		firstName: z.string().nullable(),
		lastName: z.string().nullable(),
		avatarKey: z.string().nullable(),
		createdAt: zDateWire,
		updatedAt: zDateWire,
	}),
	drafts: z.array(
		z.object({
			id: z.uuid(),
			status: z.enum(["active", "archived", "sent"]),
			organizationId: z.uuid(),
			updatedAt: zDateWire,
		}),
	),
	invitesSent: z.array(
		z.object({
			id: z.uuid(),
			inviteeEmail: z.string(),
			status: z.enum(["pending", "claimed", "expired", "revoked"]),
			expiresAt: zDateWire,
			createdAt: zDateWire,
		}),
	),
	orgInvitesSent: z.array(
		z.object({
			id: z.uuid(),
			organizationId: z.uuid(),
			email: z.string(),
			status: z.enum(["pending", "claimed", "expired", "revoked"]),
			expiresAt: zDateWire,
			createdAt: zDateWire,
		}),
	),
	coldInvitesClaimed: z.array(
		z.object({
			id: z.uuid(),
			filePieceCid: z.string(),
			email: z.string(),
			status: z.enum(["pending", "claimed", "expired", "revoked"]),
			claimedAt: zDateWire.nullable(),
		}),
	),
	analyticsConsentReceipts: z.array(
		z.object({
			choice: z.enum(["granted", "denied", "withdrawn"]),
			policyVersion: z.string(),
			createdAt: zDateWire,
			withdrawnAt: zDateWire.nullable(),
		}),
	),
	privacyRequests: z.array(
		z.object({
			id: z.uuid(),
			type: z.enum(["export", "erasure"]),
			status: z.enum([
				"submitted",
				"in_review",
				"on_hold",
				"completed",
				"rejected",
			]),
			requestedAt: zDateWire,
			dueAt: zDateWire,
			completedAt: zDateWire.nullable(),
		}),
	),
	privacyErasureLedger: z.array(
		z.object({
			id: z.uuid(),
			action: z.string(),
			executedAt: zDateWire,
			replayRequired: z.boolean(),
		}),
	),
	platformInviteRedemptions: z.array(
		z.object({
			id: z.uuid(),
			email: z.string(),
			redeemedAt: zDateWire,
		}),
	),
	retainedRecordSummary: z.object({
		signedPiecesCount: z.number().int().nonnegative(),
		acknowledgedPiecesCount: z.number().int().nonnegative(),
		participantPiecesCount: z.number().int().nonnegative(),
		complianceExportsRequestedByUser: z.number().int().nonnegative(),
		billingWebhookEventsContainingEmail: z.number().int().nonnegative(),
		notes: z.string(),
	}),
});

export const rpcUserSignaturesCreateOutputSchema = z.object({
	artifact: zUserSignatureArtifact,
});

export const rpcUserSignaturesListOutputSchema = z.object({
	signatures: z.array(zUserSignatureArtifact),
});

export const rpcUserSignaturesGetOutputSchema = zUserSignatureArtifact;

export const rpcUserSignaturesSetDefaultOutputSchema = rpcEmptyOutputSchema;

export const rpcUserSignaturesDeleteOutputSchema = rpcEmptyOutputSchema;

export const rpcUserActivationGetOutputSchema = z.object({
	deployment: z.enum(DEPLOYMENTS),
	catalogVersion: z.number().int(),
	milestones: z.array(zActivationMilestoneId),
	practicePieceCid: z.string().nullable(),
});

export const rpcUserActivationMarkOutputSchema = rpcEmptyOutputSchema;

export { zUserSignatureCreateInput as rpcUserSignaturesCreateInputSchema };
