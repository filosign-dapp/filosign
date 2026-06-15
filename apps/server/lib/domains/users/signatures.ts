import { throwAppError } from "@filosign/errors/server";
import {
	extensionForContentType,
	type UserSignatureCreateInput,
	type UserSignatureRole,
	zUserSignatureCreateInput,
} from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";
import type { Address } from "viem";
import { z } from "zod";
import {
	envelopeFieldSnapshotKey,
	userSignatureObjectKey,
} from "@/lib/domains/files/utils/signature-storage";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";
import { presignObjectPreviewGet } from "@/lib/platform/s3/presign-preview";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

const { userSignatures, users, fileFieldCompletions } = db.schema;

function rowToArtifact(
	row: typeof userSignatures.$inferSelect,
	previewUrl: string | null,
) {
	return {
		id: row.id,
		walletAddress: row.walletAddress,
		kind: row.kind,
		role: row.role,
		storageKey: row.storageKey,
		contentType: row.contentType,
		contentSha256: row.contentSha256,
		typedMeta: row.typedMeta ?? null,
		intrinsicAspectRatio: row.intrinsicAspectRatio ?? null,
		previewUrl,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

async function presignPreview(storageKey: string): Promise<string | null> {
	return presignObjectPreviewGet(storageKey);
}

function assertStorageKeyForWallet(
	wallet: Address,
	storageKey: string,
	contentSha256: string,
	contentType: string,
) {
	const ext = extensionForContentType(contentType);
	const expected = userSignatureObjectKey(wallet, contentSha256, ext);
	if (storageKey !== expected) {
		throw throwAppError("USERS.SIGNATURE_STORAGE_KEY_MISMATCH");
	}
}

export async function userSignatureCreate(wallet: Address, body: unknown) {
	const parsed = zUserSignatureCreateInput.safeParse(body);
	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}
	const input: UserSignatureCreateInput = parsed.data;

	assertStorageKeyForWallet(
		wallet,
		input.storageKey,
		input.contentSha256,
		input.contentType,
	);

	const exists = await bucket.exists(input.storageKey);
	if (!exists) {
		throw throwAppError("USERS.SIGNATURE_UPLOAD_NOT_FOUND");
	}

	const [existing] = await db
		.select()
		.from(userSignatures)
		.where(
			and(
				eq(userSignatures.walletAddress, wallet),
				eq(userSignatures.role, input.role),
				eq(userSignatures.contentSha256, input.contentSha256),
				isNull(userSignatures.deletedAt),
			),
		);

	if (existing) {
		return {
			artifact: await rowToArtifact(
				existing,
				await presignPreview(existing.storageKey),
			),
		};
	}

	const now = new Date();
	const [inserted] = await db
		.insert(userSignatures)
		.values({
			walletAddress: wallet,
			kind: input.kind,
			role: input.role,
			storageKey: input.storageKey,
			contentType: input.contentType,
			contentSha256: input.contentSha256,
			typedMeta: input.typedMeta ?? null,
			intrinsicAspectRatio: input.intrinsicAspectRatio ?? null,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	if (!inserted) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to create signature artifact",
		});
	}

	return {
		artifact: await rowToArtifact(
			inserted,
			await presignPreview(inserted.storageKey),
		),
	};
}

export async function userSignaturesList(wallet: Address) {
	const rows = await db
		.select()
		.from(userSignatures)
		.where(
			and(
				eq(userSignatures.walletAddress, wallet),
				isNull(userSignatures.deletedAt),
			),
		);

	const signatures = await Promise.all(
		rows.map(async (row) =>
			rowToArtifact(row, await presignPreview(row.storageKey)),
		),
	);

	return { signatures };
}

export async function userSignatureGetById(wallet: Address, id: string) {
	const [row] = await db
		.select()
		.from(userSignatures)
		.where(
			and(
				eq(userSignatures.id, id),
				eq(userSignatures.walletAddress, wallet),
				isNull(userSignatures.deletedAt),
			),
		);

	if (!row) {
		throw throwAppError("USERS.SIGNATURE_NOT_FOUND");
	}

	return rowToArtifact(row, await presignPreview(row.storageKey));
}

export const zUserSignatureSetDefaultBody = z.object({
	id: z.uuid(),
	role: z.enum(["signature", "initial"]),
});

export async function userSignatureSetDefault(wallet: Address, body: unknown) {
	const parsed = zUserSignatureSetDefaultBody.safeParse(body);
	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}

	const [row] = await db
		.select({ id: userSignatures.id, role: userSignatures.role })
		.from(userSignatures)
		.where(
			and(
				eq(userSignatures.id, parsed.data.id),
				eq(userSignatures.walletAddress, wallet),
				isNull(userSignatures.deletedAt),
			),
		);

	if (!row) {
		throw throwAppError("USERS.SIGNATURE_NOT_FOUND");
	}
	if (row.role !== parsed.data.role) {
		throw throwAppError("USERS.SIGNATURE_ROLE_MISMATCH");
	}

	const column =
		parsed.data.role === "signature"
			? "defaultSignatureId"
			: "defaultInitialId";

	await db
		.update(users)
		.set({ [column]: parsed.data.id, updatedAt: new Date() })
		.where(eq(users.walletAddress, wallet));

	return {};
}

export async function userSignatureDelete(wallet: Address, id: string) {
	const [row] = await db
		.select()
		.from(userSignatures)
		.where(
			and(
				eq(userSignatures.id, id),
				eq(userSignatures.walletAddress, wallet),
				isNull(userSignatures.deletedAt),
			),
		);

	if (!row) {
		throw throwAppError("USERS.SIGNATURE_NOT_FOUND");
	}

	const [referenced] = await db
		.select({ fieldId: fileFieldCompletions.fieldId })
		.from(fileFieldCompletions)
		.where(eq(fileFieldCompletions.sourceArtifactId, id))
		.limit(1);

	if (referenced) {
		throw throwAppError("USERS.SIGNATURE_IN_USE");
	}

	const now = new Date();
	await db
		.update(userSignatures)
		.set({ deletedAt: now, updatedAt: now })
		.where(eq(userSignatures.id, id));

	const [userRow] = await db
		.select({
			defaultSignatureId: users.defaultSignatureId,
			defaultInitialId: users.defaultInitialId,
		})
		.from(users)
		.where(eq(users.walletAddress, wallet));

	if (userRow?.defaultSignatureId === id) {
		await db
			.update(users)
			.set({ defaultSignatureId: null, updatedAt: now })
			.where(eq(users.walletAddress, wallet));
	}
	if (userRow?.defaultInitialId === id) {
		await db
			.update(users)
			.set({ defaultInitialId: null, updatedAt: now })
			.where(eq(users.walletAddress, wallet));
	}

	return {};
}

export async function defaultSignatureArtifactsForWallet(wallet: Address) {
	const [userRow] = await db
		.select({
			defaultSignatureId: users.defaultSignatureId,
			defaultInitialId: users.defaultInitialId,
		})
		.from(users)
		.where(eq(users.walletAddress, wallet));

	const ids = [userRow?.defaultSignatureId, userRow?.defaultInitialId].filter(
		(id): id is string => Boolean(id),
	);
	if (ids.length === 0) {
		return { signature: null, initial: null };
	}

	const rows = await db
		.select()
		.from(userSignatures)
		.where(
			and(
				eq(userSignatures.walletAddress, wallet),
				isNull(userSignatures.deletedAt),
			),
		);

	const byId = new Map(rows.map((r) => [r.id, r]));
	const signatureRow = userRow?.defaultSignatureId
		? byId.get(userRow.defaultSignatureId)
		: undefined;
	const initialRow = userRow?.defaultInitialId
		? byId.get(userRow.defaultInitialId)
		: undefined;

	return {
		signature: signatureRow
			? await rowToArtifact(
					signatureRow,
					await presignPreview(signatureRow.storageKey),
				)
			: null,
		initial: initialRow
			? await rowToArtifact(
					initialRow,
					await presignPreview(initialRow.storageKey),
				)
			: null,
	};
}

export async function copyArtifactToEnvelopeSnapshot(args: {
	pieceCid: string;
	fieldId: string;
	artifact: typeof userSignatures.$inferSelect;
}): Promise<{
	storageKey: string;
	contentSha256: string;
	contentType: string;
}> {
	const ext = extensionForContentType(args.artifact.contentType);
	const destKey = envelopeFieldSnapshotKey(
		args.pieceCid,
		args.fieldId,
		args.artifact.contentSha256,
		ext,
	);

	if (args.artifact.storageKey === destKey) {
		return {
			storageKey: destKey,
			contentSha256: args.artifact.contentSha256,
			contentType: args.artifact.contentType,
		};
	}

	const exists = await bucket.exists(destKey);
	if (!exists) {
		const bytes = new Uint8Array(
			await bucket.file(args.artifact.storageKey).arrayBuffer(),
		);
		await bucket.write(destKey, bytes, { type: args.artifact.contentType });
	}

	return {
		storageKey: destKey,
		contentSha256: args.artifact.contentSha256,
		contentType: args.artifact.contentType,
	};
}

export type UserSignatureRoleType = UserSignatureRole;
