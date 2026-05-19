/**
 * Profile, registration, Dilithium signatures, thirdweb email sync.
 */
import { hashPrivySubjectCommitment } from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { isAddress } from "viem";
import { z } from "zod";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track";
import db from "@/lib/db";
import { materializePendingInvitesForEmail } from "@/lib/domain/sharing";
import { userAvatarWebpKey } from "@/lib/domain/storage-keys";
import { fsContracts } from "@/lib/evm";
import { processTransaction } from "@/lib/indexer/process";
import {
	verifiedLinkedEmailsForWallet,
	verifiedThirdwebEmailForWallet,
	verifyThirdwebAuthTokenWithWallet,
} from "@/lib/utils/thirdweb";
import { tryCatch } from "@/lib/utils/tryCatch";

const { users, userSignatures } = db.schema;

const { FSKeyRegistry } = fsContracts;

export async function userProfileMe(wallet: Address) {
	const [userData] = await db
		.select({
			walletAddress: users.walletAddress,
			encryptionPublicKey: users.encryptionPublicKey,
			keygenData: users.keygenDataJson,
			createdAt: users.createdAt,
			email: users.email,
			username: users.username,
			firstName: users.firstName,
			lastName: users.lastName,
			avatarKey: users.avatarKey,
			privyDid: users.privyDid,
		})
		.from(users)
		.where(eq(users.walletAddress, wallet));

	if (!userData) {
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	let avatarUrl: string | null = null;
	if (userData.avatarKey) {
		const { bucket } = await import("@/lib/s3/client");
		avatarUrl = bucket.presign(userData.avatarKey, {
			method: "GET",
			expiresIn: 60 * 60 * 24,
		});
	}

	const { privyDid, ...rest } = userData;
	const privySubjectCommitment = hashPrivySubjectCommitment(privyDid);

	return { ...rest, avatarUrl, privySubjectCommitment };
}

const zProfilePutBody = z.object({
	email: z.email({ error: "Invalid email format" }).optional(),
	username: z
		.string()
		.min(3, { error: "Username must be at least 3 characters" })
		.max(16, { error: "Username must be at most 16 characters" })
		.optional(),
	firstName: z
		.string()
		.min(1, { error: "First name must be at least 1 character" })
		.max(50, { error: "First name must be at most 50 characters" })
		.optional(),
	lastName: z
		.string()
		.min(1, { error: "Last name must be at least 1 character" })
		.max(50, { error: "Last name must be at most 50 characters" })
		.optional(),
	/** Must match {@link userAvatarWebpKey} after presigned PUT succeeds. */
	avatarKey: z.string().min(1).optional(),
});

export async function userProfileUpdate(wallet: Address, body: unknown) {
	const parsedBody = zProfilePutBody.safeParse(body);

	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}

	const {
		email: emailRaw,
		username: usernameRaw,
		firstName: firstNameRaw,
		lastName: lastNameRaw,
	} = parsedBody.data;

	const email = emailRaw?.trim();
	const username = usernameRaw?.trim();
	const firstName = firstNameRaw?.trim();
	const lastName = lastNameRaw?.trim();

	await db.updateUserFieldWithLog({
		walletAddress: wallet,
		fieldName: "email",
		newValue: email,
	});
	await db.updateUserFieldWithLog({
		walletAddress: wallet,
		fieldName: "username",
		newValue: username,
	});
	await db.updateUserFieldWithLog({
		walletAddress: wallet,
		fieldName: "firstName",
		newValue: firstName,
	});
	await db.updateUserFieldWithLog({
		walletAddress: wallet,
		fieldName: "lastName",
		newValue: lastName,
	});

	if (parsedBody.data.avatarKey !== undefined) {
		const trimmed = parsedBody.data.avatarKey.trim();
		const expectedKey = userAvatarWebpKey(wallet);
		if (trimmed !== expectedKey) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Avatar key does not match this wallet",
			});
		}
		const { bucket } = await import("@/lib/s3/client");
		const exists = await bucket.exists(expectedKey);
		if (!exists) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"Avatar upload not found — PUT the WebP to the issued URL first",
			});
		}
		await db.updateUserFieldWithLog({
			walletAddress: wallet,
			fieldName: "avatarKey",
			newValue: expectedKey,
		});
	}

	if (email?.trim()) {
		const inviteRes = await tryCatch(
			materializePendingInvitesForEmail({
				walletAddress: wallet,
				email: email,
			}),
		);
		if (inviteRes.error) {
			console.error(
				"materializePendingInvitesForEmail (profile PUT):",
				inviteRes.error,
			);
		}
	}

	return {};
}

export async function userProfilePrevalidate(query: {
	email?: string | undefined;
	username?: string | undefined;
}) {
	const { email, username } = query;

	if (email) {
		const [existingByEmail] = await db
			.select()
			.from(users)
			.where(eq(users.email, email));
		if (existingByEmail) {
			return { valid: false as const };
		}
	}

	if (username) {
		const [existingByUsername] = await db
			.select()
			.from(users)
			.where(eq(users.username, username));
		if (existingByUsername) {
			return { valid: false as const };
		}
	}

	return { valid: true as const };
}

export async function userProfileLookup(_wallet: Address, q: string) {
	const returns = {
		walletAddress: users.walletAddress,
		encryptionPublicKey: users.encryptionPublicKey,
		lastActiveAt: users.lastActiveAt,
		createdAt: users.createdAt,
		firstName: users.firstName,
		lastName: users.lastName,
		avatarKey: users.avatarKey,
		email: users.email,
		mobile: users.mobile,
	};

	let [userData] = await db
		.select(returns)
		.from(users)
		.where(eq(users.email, q));
	if (!userData && isAddress(q)) {
		[userData] = await db
			.select(returns)
			.from(users)
			.where(eq(users.walletAddress, q));
	}
	if (!userData) {
		[userData] = await db
			.select(returns)
			.from(users)
			.where(eq(users.username, q));
	}

	if (!userData) {
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	let avatarUrl: string | null = null;
	if (userData.avatarKey) {
		const { bucket } = await import("@/lib/s3/client");
		avatarUrl = bucket.presign(userData.avatarKey as string, {
			method: "GET",
			expiresIn: 60 * 60 * 24,
		});
	}

	return {
		walletAddress: userData.walletAddress,
		encryptionPublicKey: userData.encryptionPublicKey,
		lastActiveAt: userData.lastActiveAt,
		createdAt: userData.createdAt,
		firstName: userData.firstName,
		lastName: userData.lastName,
		avatarUrl,
		email: userData.email ?? null,
		has: {
			email: !!userData.email,
			mobile: !!userData.mobile,
		},
	};
}

const zSyncPrivyBody = z.object({
	identityToken: z.string().min(1),
});

export async function userProfileSyncPrivyEmail(
	wallet: Address,
	body: unknown,
) {
	const parsedBody = zSyncPrivyBody.safeParse(body);

	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}

	const emailResult = await tryCatch(
		verifiedThirdwebEmailForWallet(parsedBody.data.identityToken, wallet),
	);

	if (emailResult.error) {
		throw new ORPCError("UNAUTHORIZED", {
			message: `Wallet auth verification failed: ${emailResult.error.message}`,
		});
	}

	const email = emailResult.data;
	if (!email) {
		return { updated: false as const };
	}

	await db.updateUserFieldWithLog({
		walletAddress: wallet,
		fieldName: "email",
		newValue: email,
	});

	if (email?.trim()) {
		const inviteRes = await tryCatch(
			materializePendingInvitesForEmail({
				walletAddress: wallet,
				email: email,
			}),
		);
		if (inviteRes.error) {
			console.error(
				"materializePendingInvitesForEmail (sync-privy-email):",
				inviteRes.error,
			);
		}
	}

	return { updated: true as const, email };
}

const zSetPrimaryEmailBody = z.object({
	identityToken: z.string().min(1),
	email: z.email(),
});

export async function userProfileSetPrimaryEmail(
	wallet: Address,
	body: unknown,
) {
	const parsedBody = zSetPrimaryEmailBody.safeParse(body);

	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}

	const { identityToken, email: requestedRaw } = parsedBody.data;
	const linkedResult = await tryCatch(
		verifiedLinkedEmailsForWallet(identityToken, wallet),
	);

	if (linkedResult.error) {
		throw new ORPCError("UNAUTHORIZED", {
			message: `Wallet auth verification failed: ${linkedResult.error.message}`,
		});
	}

	const linked = linkedResult.data;
	const normalizedRequested = requestedRaw.trim().toLowerCase();
	const canonical = linked.find((e) => e.toLowerCase() === normalizedRequested);

	if (!canonical) {
		throw new ORPCError("BAD_REQUEST", {
			message: "This email is not linked to your sign-in account.",
		});
	}

	await db.updateUserFieldWithLog({
		walletAddress: wallet,
		fieldName: "email",
		newValue: canonical,
	});

	const inviteRes = await tryCatch(
		materializePendingInvitesForEmail({
			walletAddress: wallet,
			email: canonical,
		}),
	);
	if (inviteRes.error) {
		console.error(
			"materializePendingInvitesForEmail (set-primary-email):",
			inviteRes.error,
		);
	}

	return { email: canonical };
}

const zRegisterBody = z.object({
	saltPin: zHexString(),
	saltSeed: zHexString(),
	saltChallenge: zHexString(),
	commitmentKem: zHexString(),
	commitmentSig: zHexString(),
	signature: zHexString(),
	encryptionPublicKey: zHexString(),
	signaturePublicKey: zHexString(),
	walletAddress: zEvmAddress(),
	idToken: z.string().min(1).optional(),
	skipToken: z.boolean().optional(),
});

export async function userRegister(body: unknown) {
	const parsedBody = zRegisterBody.safeParse(body);

	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}

	const {
		saltPin,
		saltSeed,
		saltChallenge,
		commitmentKem,
		commitmentSig,
		signature,
		encryptionPublicKey,
		signaturePublicKey,
		walletAddress,
		idToken,
		skipToken,
	} = parsedBody.data;

	let email: string;
	let privyDid: string;

	if (skipToken) {
		email = `dev-${walletAddress}@filosign.local`;
		privyDid = `did:dev:${walletAddress}`;
	} else if (idToken) {
		const authResult = await tryCatch(
			verifyThirdwebAuthTokenWithWallet(idToken, walletAddress),
		);

		if (authResult.error) {
			throw new ORPCError("UNAUTHORIZED", {
				message: `Wallet auth verification failed: ${authResult.error.message}`,
			});
		}

		email = authResult.data.email ?? "";
		privyDid = authResult.data.privyDid;
	} else {
		throw new ORPCError("BAD_REQUEST", {
			message: "idToken or skipToken required",
		});
	}

	if (!email) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Email is required for registration. Please log in with email or Google.",
		});
	}

	const valid = await tryCatch(
		FSKeyRegistry.read.validateKeygenDataRegistrationSignature([
			saltPin,
			saltSeed,
			saltChallenge,
			commitmentKem,
			commitmentSig,
			signature,
			walletAddress,
		]),
	);

	if (valid.error || !valid.data) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: `Error validating signature ${valid.error}`,
		});
	}

	const { FSManager } = fsContracts;
	const alreadyRegistered = await FSManager.read.isRegistered([walletAddress]);
	if (alreadyRegistered) {
		return {};
	}

	const txHash = await tryCatch(
		FSKeyRegistry.write.registerKeygenData([
			saltPin,
			saltSeed,
			saltChallenge,
			commitmentKem,
			commitmentSig,
			signature,
			walletAddress,
		]),
	);
	if (txHash.error || !txHash.data) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: `Error registering keygen data: ${txHash.error || "Unknown error"}`,
		});
	}

	await processTransaction(txHash.data, {
		encryptionPublicKey,
		signaturePublicKey,
		email,
		privyDid,
	});

	trackServerEvent({
		distinctId: walletAddress,
		event: SERVER_ANALYTICS_EVENTS.userRegistered,
		properties: { entry: skipToken ? "dev" : "organic" },
	});

	return {};
}

const zSignaturePostBody = z.object({
	data: z.string(),
});

export async function userSignaturesCreate(wallet: Address, body: unknown) {
	const parsedBody = zSignaturePostBody.safeParse(body);

	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}

	try {
		await db.insert(userSignatures).values({
			walletAddress: wallet,
			data: parsedBody.data.data,
		});
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: `Failed to upload signature ${error}`,
		});
	}

	return {};
}

export async function userSignaturesList(wallet: Address) {
	const dbEntries = await db
		.select()
		.from(userSignatures)
		.where(eq(userSignatures.walletAddress, wallet));

	return { signatures: dbEntries };
}

export async function userSignaturesGetById(wallet: Address, id: string) {
	const [dbEntry] = await db
		.select()
		.from(userSignatures)
		.where(
			and(eq(userSignatures.id, id), eq(userSignatures.walletAddress, wallet)),
		);

	if (!dbEntry) {
		throw new ORPCError("NOT_FOUND", { message: "Signature not found" });
	}

	return dbEntry;
}
