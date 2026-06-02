/** Profile and thirdweb email sync. */

import { hashAuthSubjectCommitment } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { desc, eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
import { isAddress } from "viem";
import { z } from "zod";
import { writeAuditEvent } from "@/lib/domains/audit";
import { userAvatarWebpKey } from "@/lib/domains/files";
import { materializePendingInvitesForEmail } from "@/lib/domains/sharing";
import { getRedis } from "@/lib/platform/cache/session";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";
import {
	verifiedLinkedEmailsForWallet,
	verifiedThirdwebEmailForWallet,
} from "@/lib/platform/utils/thirdweb";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const {
	users,
	userHistory,
	userInvites,
	organizationInvites,
	envelopeDrafts,
	envelopeDraftDocuments,
	platformInviteRedemptions,
	analyticsConsentReceipts,
	fileParticipants,
	fileSignatures,
	fileAcknowledgements,
	complianceExportLogs,
	fileColdInvites,
	billingWebhookEvents,
	accessRequests,
	privacyRequests,
	privacyErasureLedger,
} = db.schema;

const PRIVACY_REQUEST_TTL_DAYS = 30;

function defaultPrivacyRequestDueAt(requestedAt: Date): Date {
	return new Date(
		requestedAt.getTime() + PRIVACY_REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000,
	);
}

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
			authProviderId: users.authProviderId,
		})
		.from(users)
		.where(eq(users.walletAddress, wallet));

	if (!userData) {
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	let avatarUrl: string | null = null;
	if (userData.avatarKey) {
		const { bucket } = await import("@/lib/platform/s3/client");
		avatarUrl = bucket.presign(userData.avatarKey, {
			method: "GET",
			expiresIn: 60 * 60 * 24,
		});
	}

	const { authProviderId, ...rest } = userData;
	const authSubjectCommitment = hashAuthSubjectCommitment(authProviderId);

	return { ...rest, avatarUrl, authSubjectCommitment };
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
		const { bucket } = await import("@/lib/platform/s3/client");
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

const PROFILE_LOOKUP_CACHE_SEC = 30 * 60;

export async function userProfileLookup(_wallet: Address, q: string) {
	const query = q.trim().toLowerCase();
	const cacheKey = `filosign:profile:lookup:${query}`;
	const cached = await getRedis()
		.get(cacheKey)
		.catch(() => null);
	if (cached) return JSON.parse(cached);

	const returns = {
		walletAddress: users.walletAddress,
		encryptionPublicKey: users.encryptionPublicKey,
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
		.where(eq(users.email, query));
	if (!userData && isAddress(query)) {
		[userData] = await db
			.select(returns)
			.from(users)
			.where(eq(users.walletAddress, query));
	}
	if (!userData) {
		[userData] = await db
			.select(returns)
			.from(users)
			.where(eq(users.username, query));
	}

	if (!userData) {
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	let avatarUrl: string | null = null;
	if (userData.avatarKey) {
		const { bucket } = await import("@/lib/platform/s3/client");
		avatarUrl = bucket.presign(userData.avatarKey as string, {
			method: "GET",
			expiresIn: 60 * 60 * 24,
		});
	}

	const result = {
		walletAddress: userData.walletAddress,
		encryptionPublicKey: userData.encryptionPublicKey,
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

	void getRedis()
		.setex(cacheKey, PROFILE_LOOKUP_CACHE_SEC, JSON.stringify(result))
		.catch(() => {});

	return result;
}

const zSyncThirdwebBody = z.object({
	identityToken: z.string().min(1),
});

export async function userProfileSyncThirdwebEmail(
	wallet: Address,
	body: unknown,
) {
	const parsedBody = zSyncThirdwebBody.safeParse(body);

	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}

	const [existing] = await db
		.select({ email: users.email })
		.from(users)
		.where(eq(users.walletAddress, wallet));

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

	const normalizedNew = email.trim().toLowerCase();
	const normalizedCurrent = existing?.email?.trim().toLowerCase() ?? "";
	if (normalizedCurrent === normalizedNew) {
		return { updated: false as const, email };
	}

	await db.updateUserFieldWithLog({
		walletAddress: wallet,
		fieldName: "email",
		newValue: email,
	});

	const inviteRes = await tryCatch(
		materializePendingInvitesForEmail({
			walletAddress: wallet,
			email,
		}),
	);
	if (inviteRes.error) {
		console.error(
			"materializePendingInvitesForEmail (sync-thirdweb-email):",
			inviteRes.error,
		);
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

async function revokeCachedSessionsForWallet(wallet: Address): Promise<number> {
	const redis = getRedis();
	let cursor = "0";
	let removed = 0;
	do {
		const scan = await redis.send("SCAN", [
			cursor,
			"MATCH",
			"fs:session:*",
			"COUNT",
			"200",
		]);
		const tuple = Array.isArray(scan) ? scan : [];
		cursor = String(tuple[0] ?? "0");
		const keys = Array.isArray(tuple[1]) ? tuple[1].map(String) : [];
		for (const key of keys) {
			const raw = await redis.get(key);
			if (!raw) continue;
			try {
				const parsed = JSON.parse(raw) as { wallet?: string };
				if (parsed.wallet?.toLowerCase() === wallet.toLowerCase()) {
					await redis.del(key);
					removed += 1;
				}
			} catch {
				// ignore malformed cache entries
			}
		}
	} while (cursor !== "0");
	return removed;
}

export async function userEraseAccount(wallet: Address) {
	const normalizedWallet = wallet.toLowerCase();
	const now = new Date();
	const anonymizedEmail = `deleted+${normalizedWallet}@deleted.filosign.local`;
	const anonymizedAuthProvider = `deleted:${normalizedWallet}`;

	const [user] = await db
		.select({
			walletAddress: users.walletAddress,
			avatarKey: users.avatarKey,
			email: users.email,
		})
		.from(users)
		.where(eq(users.walletAddress, wallet))
		.limit(1);

	if (!user) {
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	const drafts = await db
		.select({
			id: envelopeDrafts.id,
			headSnapshotS3Key: envelopeDrafts.headSnapshotS3Key,
		})
		.from(envelopeDrafts)
		.where(eq(envelopeDrafts.createdByWallet, wallet));
	const draftIds = drafts.map((d) => d.id);
	const draftDocs =
		draftIds.length > 0
			? await db
					.select({ s3Key: envelopeDraftDocuments.s3Key })
					.from(envelopeDraftDocuments)
					.where(inArray(envelopeDraftDocuments.draftId, draftIds))
			: [];

	const objectKeys = new Set<string>();
	if (user.avatarKey) objectKeys.add(user.avatarKey);
	for (const draft of drafts) {
		if (draft.headSnapshotS3Key) objectKeys.add(draft.headSnapshotS3Key);
	}
	for (const doc of draftDocs) {
		if (doc.s3Key) objectKeys.add(doc.s3Key);
	}
	for (const key of objectKeys) {
		await tryCatch(bucket.delete(key));
	}

	const emailCandidates = new Set<string>();
	if (user.email) emailCandidates.add(user.email.trim());
	const historyEmailRows = await db
		.select({
			fieldName: userHistory.fieldName,
			oldValue: userHistory.oldValue,
			newValue: userHistory.newValue,
		})
		.from(userHistory)
		.where(eq(userHistory.walletAddress, wallet));
	for (const row of historyEmailRows) {
		if (row.fieldName !== "email") continue;
		if (row.oldValue) emailCandidates.add(row.oldValue.trim());
		if (row.newValue) emailCandidates.add(row.newValue.trim());
	}
	const matchedEmails = [...emailCandidates];

	await db.transaction(async (tx) => {
		const [existingRequest] = await tx
			.select({ id: privacyRequests.id })
			.from(privacyRequests)
			.where(eq(privacyRequests.subjectWalletAddress, wallet))
			.orderBy(privacyRequests.createdAt)
			.limit(1);
		if (!existingRequest) {
			await tx.insert(privacyRequests).values({
				subjectWalletAddress: wallet,
				type: "erasure",
				status: "completed",
				requestedAt: now,
				dueAt: defaultPrivacyRequestDueAt(now),
				completedAt: now,
				closureNote:
					"Erasure completed via self-service account erase endpoint.",
			});
		}

		if (draftIds.length > 0) {
			await tx
				.delete(envelopeDrafts)
				.where(eq(envelopeDrafts.createdByWallet, wallet));
		}

		await tx.delete(userHistory).where(eq(userHistory.walletAddress, wallet));

		const redemptionDelete = await tryCatch(
			tx
				.delete(platformInviteRedemptions)
				.where(eq(platformInviteRedemptions.walletAddress, wallet)),
		);
		if (redemptionDelete.error) {
			console.warn(
				"userEraseAccount: failed deleting platform invite redemptions; redacting email fallback",
				{
					wallet,
					error: redemptionDelete.error,
				},
			);
			await tx
				.update(platformInviteRedemptions)
				.set({ email: anonymizedEmail })
				.where(eq(platformInviteRedemptions.walletAddress, wallet));
		}

		if (matchedEmails.length > 0) {
			await tx
				.update(accessRequests)
				.set({
					email: anonymizedEmail,
					name: null,
					company: null,
					message: null,
					updatedAt: now,
				})
				.where(inArray(accessRequests.email, matchedEmails));
		}

		await tx
			.update(users)
			.set({
				email: anonymizedEmail,
				username: null,
				firstName: null,
				lastName: null,
				mobile: null,
				avatarKey: null,
				authProviderId: anonymizedAuthProvider,
				updatedAt: now,
			})
			.where(eq(users.walletAddress, wallet));

		await tx.insert(privacyErasureLedger).values({
			subjectWalletAddress: wallet,
			action: "account.erase",
			executedAt: now,
			replayRequired: true,
			contextJson: {
				purgedDrafts: draftIds.length,
				redactedAccessRequestEmails: matchedEmails.length,
				objectKeysPurged: objectKeys.size,
			},
		});
	});

	const revokedSessions = await tryCatch(revokeCachedSessionsForWallet(wallet));

	await writeAuditEvent({
		actorWallet: wallet,
		action: "account.erased",
		resourceType: "user",
		resourceId: wallet,
		metadata: {
			revokedSessions: revokedSessions.error ? 0 : revokedSessions.data,
			purgedDrafts: draftIds.length,
		},
	});

	return { ok: true as const, erasedAt: now };
}

export async function userPrivacyState(wallet: Address) {
	const [user] = await db
		.select({
			walletAddress: users.walletAddress,
			email: users.email,
			updatedAt: users.updatedAt,
		})
		.from(users)
		.where(eq(users.walletAddress, wallet))
		.limit(1);

	if (!user) {
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	const [latestConsent] = await db
		.select({
			choice: analyticsConsentReceipts.choice,
			policyVersion: analyticsConsentReceipts.policyVersion,
			createdAt: analyticsConsentReceipts.createdAt,
			withdrawnAt: analyticsConsentReceipts.withdrawnAt,
		})
		.from(analyticsConsentReceipts)
		.where(eq(analyticsConsentReceipts.walletAddress, wallet))
		.orderBy(desc(analyticsConsentReceipts.createdAt))
		.limit(1);

	const latestPrivacyRequests = await db
		.select({
			id: privacyRequests.id,
			type: privacyRequests.type,
			status: privacyRequests.status,
			requestedAt: privacyRequests.requestedAt,
			dueAt: privacyRequests.dueAt,
			completedAt: privacyRequests.completedAt,
		})
		.from(privacyRequests)
		.where(eq(privacyRequests.subjectWalletAddress, wallet))
		.orderBy(desc(privacyRequests.createdAt))
		.limit(10);

	return {
		walletAddress: user.walletAddress,
		email: user.email,
		lastProfileUpdateAt: user.updatedAt,
		latestAnalyticsConsent: latestConsent ?? null,
		privacyRequests: latestPrivacyRequests,
		eraseSupported: true,
		exportSupported: true,
	};
}

export async function userSetAnalyticsConsent(
	wallet: Address,
	body: unknown,
): Promise<{
	ok: true;
	choice: "granted" | "denied" | "withdrawn";
}> {
	const parsed = z
		.object({
			choice: z.enum(["granted", "denied", "withdrawn"]),
			policyVersion: z.string().min(1).max(64),
		})
		.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	await db.insert(analyticsConsentReceipts).values({
		walletAddress: wallet,
		choice: parsed.data.choice,
		policyVersion: parsed.data.policyVersion,
		withdrawnAt: parsed.data.choice === "withdrawn" ? new Date() : null,
		source: "client",
	});

	return { ok: true as const, choice: parsed.data.choice };
}

export async function userPrivacyRequestCreate(wallet: Address, body: unknown) {
	const parsed = z
		.object({
			type: z.enum(["export", "erasure"]),
			note: z.string().max(2000).optional(),
		})
		.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const now = new Date();
	const [created] = await db
		.insert(privacyRequests)
		.values({
			subjectWalletAddress: wallet,
			type: parsed.data.type,
			status: "submitted",
			requestedAt: now,
			dueAt: defaultPrivacyRequestDueAt(now),
			internalNotes: parsed.data.note ?? null,
		})
		.returning({
			id: privacyRequests.id,
			type: privacyRequests.type,
			status: privacyRequests.status,
			requestedAt: privacyRequests.requestedAt,
			dueAt: privacyRequests.dueAt,
		});
	return created;
}

export async function userPrivacyRequestList(wallet: Address) {
	const requests = await db
		.select({
			id: privacyRequests.id,
			type: privacyRequests.type,
			status: privacyRequests.status,
			requestedAt: privacyRequests.requestedAt,
			dueAt: privacyRequests.dueAt,
			completedAt: privacyRequests.completedAt,
			closureNote: privacyRequests.closureNote,
			legalHoldReason: privacyRequests.legalHoldReason,
		})
		.from(privacyRequests)
		.where(eq(privacyRequests.subjectWalletAddress, wallet))
		.orderBy(desc(privacyRequests.createdAt));
	return { requests };
}

export async function userPrivacyRequestTransition(
	wallet: Address,
	body: unknown,
) {
	const parsed = z
		.object({
			requestId: z.string().uuid(),
			status: z.enum([
				"submitted",
				"in_review",
				"on_hold",
				"completed",
				"rejected",
			]),
			closureNote: z.string().max(2000).optional(),
			legalHoldReason: z.string().max(2000).optional(),
		})
		.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}
	const now = new Date();
	const [updated] = await db
		.update(privacyRequests)
		.set({
			status: parsed.data.status,
			completedAt: parsed.data.status === "completed" ? now : null,
			closureNote: parsed.data.closureNote ?? null,
			legalHoldReason: parsed.data.legalHoldReason ?? null,
			updatedAt: now,
		})
		.where(eq(privacyRequests.id, parsed.data.requestId))
		.returning({
			id: privacyRequests.id,
			type: privacyRequests.type,
			status: privacyRequests.status,
			requestedAt: privacyRequests.requestedAt,
			dueAt: privacyRequests.dueAt,
			completedAt: privacyRequests.completedAt,
			closureNote: privacyRequests.closureNote,
			legalHoldReason: privacyRequests.legalHoldReason,
		});
	if (!updated) {
		throw new ORPCError("NOT_FOUND", { message: "Privacy request not found" });
	}
	if (updated.status === "completed" && updated.type === "erasure") {
		await db.insert(privacyErasureLedger).values({
			subjectWalletAddress: wallet,
			action: "privacy_request.completed",
			executedAt: now,
			replayRequired: true,
			contextJson: { requestId: updated.id, type: updated.type },
		});
	}
	return updated;
}

export async function userExportAccountData(wallet: Address) {
	const [user] = await db
		.select({
			walletAddress: users.walletAddress,
			email: users.email,
			username: users.username,
			firstName: users.firstName,
			lastName: users.lastName,
			avatarKey: users.avatarKey,
			createdAt: users.createdAt,
			updatedAt: users.updatedAt,
		})
		.from(users)
		.where(eq(users.walletAddress, wallet))
		.limit(1);

	if (!user) {
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	const [
		drafts,
		invitesSent,
		orgInvites,
		coldInvitesClaimed,
		consentReceipts,
		platformRedemptions,
		signatures,
		acks,
		participants,
		privacyRequestRows,
		erasureLedgerRows,
	] = await Promise.all([
		db
			.select({
				id: envelopeDrafts.id,
				status: envelopeDrafts.status,
				organizationId: envelopeDrafts.organizationId,
				updatedAt: envelopeDrafts.updatedAt,
			})
			.from(envelopeDrafts)
			.where(eq(envelopeDrafts.createdByWallet, wallet)),
		db
			.select({
				id: userInvites.id,
				inviteeEmail: userInvites.inviteeEmail,
				status: userInvites.status,
				expiresAt: userInvites.expiresAt,
				createdAt: userInvites.createdAt,
			})
			.from(userInvites)
			.where(eq(userInvites.sender, wallet)),
		db
			.select({
				id: organizationInvites.id,
				organizationId: organizationInvites.organizationId,
				email: organizationInvites.email,
				status: organizationInvites.status,
				expiresAt: organizationInvites.expiresAt,
				createdAt: organizationInvites.createdAt,
			})
			.from(organizationInvites)
			.where(eq(organizationInvites.invitedBy, wallet)),
		db
			.select({
				id: fileColdInvites.id,
				filePieceCid: fileColdInvites.filePieceCid,
				email: fileColdInvites.email,
				status: fileColdInvites.status,
				claimedAt: fileColdInvites.claimedAt,
			})
			.from(fileColdInvites)
			.where(eq(fileColdInvites.claimedByWallet, wallet)),
		db
			.select({
				choice: analyticsConsentReceipts.choice,
				policyVersion: analyticsConsentReceipts.policyVersion,
				createdAt: analyticsConsentReceipts.createdAt,
				withdrawnAt: analyticsConsentReceipts.withdrawnAt,
			})
			.from(analyticsConsentReceipts)
			.where(eq(analyticsConsentReceipts.walletAddress, wallet)),
		db
			.select({
				id: platformInviteRedemptions.id,
				email: platformInviteRedemptions.email,
				redeemedAt: platformInviteRedemptions.redeemedAt,
			})
			.from(platformInviteRedemptions)
			.where(eq(platformInviteRedemptions.walletAddress, wallet)),
		db
			.select({
				id: fileSignatures.filePieceCid,
				signedAt: fileSignatures.createdAt,
			})
			.from(fileSignatures)
			.where(eq(fileSignatures.signer, wallet)),
		db
			.select({
				pieceCid: fileAcknowledgements.filePieceCid,
				acknowledgedAt: fileAcknowledgements.acknowledgedAt,
				createdAt: fileAcknowledgements.createdAt,
			})
			.from(fileAcknowledgements)
			.where(eq(fileAcknowledgements.wallet, wallet)),
		db
			.select({
				pieceCid: fileParticipants.filePieceCid,
				role: fileParticipants.role,
				createdAt: fileParticipants.createdAt,
			})
			.from(fileParticipants)
			.where(eq(fileParticipants.wallet, wallet)),
		db
			.select({
				id: privacyRequests.id,
				type: privacyRequests.type,
				status: privacyRequests.status,
				requestedAt: privacyRequests.requestedAt,
				dueAt: privacyRequests.dueAt,
				completedAt: privacyRequests.completedAt,
			})
			.from(privacyRequests)
			.where(eq(privacyRequests.subjectWalletAddress, wallet)),
		db
			.select({
				id: privacyErasureLedger.id,
				action: privacyErasureLedger.action,
				executedAt: privacyErasureLedger.executedAt,
				replayRequired: privacyErasureLedger.replayRequired,
			})
			.from(privacyErasureLedger)
			.where(eq(privacyErasureLedger.subjectWalletAddress, wallet)),
	]);

	const retainedRecordSummary = {
		signedPiecesCount: signatures.length,
		acknowledgedPiecesCount: acks.length,
		participantPiecesCount: participants.length,
		complianceExportsRequestedByUser: (
			await db
				.select({ id: complianceExportLogs.id })
				.from(complianceExportLogs)
				.where(eq(complianceExportLogs.requestedBy, wallet))
		).length,
		billingWebhookEventsContainingEmail: (
			await db
				.select({ id: billingWebhookEvents.id })
				.from(billingWebhookEvents)
				.where(
					eq(billingWebhookEvents.eventType, "customer.subscription.created"),
				)
		).length,
		notes:
			"Signed legal evidence and mandatory billing/security records may be retained under legal obligations.",
	};

	return {
		exportedAt: new Date(),
		profile: user,
		drafts,
		invitesSent,
		orgInvitesSent: orgInvites,
		coldInvitesClaimed,
		analyticsConsentReceipts: consentReceipts,
		privacyRequests: privacyRequestRows,
		privacyErasureLedger: erasureLedgerRows,
		platformInviteRedemptions: platformRedemptions,
		retainedRecordSummary,
	};
}
