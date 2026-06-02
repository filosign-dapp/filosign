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
	walletAddress: z.string(),
	encryptionPublicKey: z.string(),
	keygenData: z.unknown().nullable(),
	createdAt: zDateWire,
	email: z.string(),
	username: z.string().nullable(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	avatarKey: z.string().nullable(),
	avatarUrl: z.string().nullable(),
	privySubjectCommitment: z.string(),
});

export const rpcUserProfileUpdateOutputSchema = rpcEmptyOutputSchema;

export const rpcUserProfilePrevalidateOutputSchema = z.union([
	z.object({ valid: z.literal(false) }),
	z.object({ valid: z.literal(true) }),
]);

export const rpcUserProfileLookupOutputSchema = z.object({
	walletAddress: z.string(),
	encryptionPublicKey: z.string(),
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

export const rpcUserProfileSyncPrivyEmailOutputSchema = z.union([
	z.object({ updated: z.literal(false) }),
	z.object({ updated: z.literal(true), email: z.string() }),
]);

export const rpcUserProfileSetPrimaryEmailOutputSchema = z.object({
	email: z.string(),
});

export const rpcUserSignaturesCreateOutputSchema = rpcEmptyOutputSchema;

const userSignatureRowSchema = z.object({
	id: z.string().uuid(),
	walletAddress: z.string(),
	data: z.string(),
	createdAt: zDateWire,
	updatedAt: zDateWire,
	deletedAt: zDateWire.optional().nullable(),
});

export const rpcUserSignaturesListOutputSchema = z.object({
	signatures: z.array(userSignatureRowSchema),
});

export const rpcUserSignaturesGetOutputSchema = userSignatureRowSchema;
