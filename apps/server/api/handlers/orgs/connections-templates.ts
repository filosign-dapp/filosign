import type { PlacementManifest } from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import { type ActiveOrgContext, assertOrgPermission } from "@/lib/domains/orgs";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";

const { organizationConnections, organizationTemplates } = db.schema;

const zConnectionBody = z.object({
	recipientWallet: zEvmAddress(),
	label: z.string().max(200).optional(),
});

export async function orgsConnectionsAdd(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "connections:request");
	const parsed = zConnectionBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const recipient = getAddress(parsed.data.recipientWallet);
	const anchor = getAddress(wallet);

	const [row] = await db
		.insert(organizationConnections)
		.values({
			organizationId: activeOrg.organizationId,
			recipientWallet: recipient,
			label: parsed.data.label ?? null,
			addedByWallet: anchor,
			anchorSenderWallet: anchor,
			status: "active",
		})
		.onConflictDoUpdate({
			target: [
				organizationConnections.organizationId,
				organizationConnections.recipientWallet,
			],
			set: {
				label: parsed.data.label ?? null,
				anchorSenderWallet: anchor,
				status: "active",
				updatedAt: new Date(),
			},
		})
		.returning();

	return { connection: row };
}

export async function orgsConnectionsList(
	_activeWallet: Address,
	activeOrg: ActiveOrgContext,
) {
	assertOrgPermission(activeOrg, "connections:view");
	const rows = await db
		.select()
		.from(organizationConnections)
		.where(eq(organizationConnections.organizationId, activeOrg.organizationId))
		.orderBy(desc(organizationConnections.createdAt));

	return { connections: rows };
}

const zConnectionRevokeBody = z.object({
	recipientWallet: zEvmAddress(),
});

export async function orgsConnectionsRevoke(
	_wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "connections:manage");
	const parsed = zConnectionRevokeBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}
	const recipient = getAddress(parsed.data.recipientWallet);
	const [connection] = await db
		.update(organizationConnections)
		.set({
			status: "inactive",
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(organizationConnections.organizationId, activeOrg.organizationId),
				eq(organizationConnections.recipientWallet, recipient),
			),
		)
		.returning();
	if (!connection) {
		throw new ORPCError("NOT_FOUND", { message: "Connection not found" });
	}
	return { connection };
}

const zTemplateCreate = z.object({
	name: z.string().min(1).max(120),
	s3Key: z.string().min(1),
	dekWrappedOmk: zHexString(),
	placementManifest: z.unknown(),
});

export async function orgsTemplatesCreate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "templates:write");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");
	const parsed = zTemplateCreate.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const [row] = await db
		.insert(organizationTemplates)
		.values({
			organizationId: activeOrg.organizationId,
			name: parsed.data.name.trim(),
			s3Key: parsed.data.s3Key,
			dekWrappedOmk: parsed.data.dekWrappedOmk,
			placementManifestJson: parsed.data.placementManifest,
			createdByWallet: getAddress(wallet),
		})
		.returning();

	return { template: row };
}

export async function orgsTemplatesList(
	wallet: Address,
	activeOrg: ActiveOrgContext,
) {
	assertOrgPermission(activeOrg, "templates:use");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");
	const rows = await db
		.select({
			id: organizationTemplates.id,
			name: organizationTemplates.name,
			createdAt: organizationTemplates.createdAt,
			createdByWallet: organizationTemplates.createdByWallet,
		})
		.from(organizationTemplates)
		.where(eq(organizationTemplates.organizationId, activeOrg.organizationId))
		.orderBy(desc(organizationTemplates.createdAt));

	return { templates: rows };
}

export async function orgsTemplatesGet(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	templateId: string,
) {
	assertOrgPermission(activeOrg, "templates:use");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");
	const [row] = await db
		.select()
		.from(organizationTemplates)
		.where(
			and(
				eq(organizationTemplates.id, templateId),
				eq(organizationTemplates.organizationId, activeOrg.organizationId),
			),
		)
		.limit(1);

	if (!row) throw new ORPCError("NOT_FOUND", { message: "Template not found" });
	return { template: row };
}

export async function orgsTemplatesCloneToEnvelope(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	templateId: string,
) {
	assertOrgPermission(activeOrg, "templates:use");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");

	const [row] = await db
		.select({
			id: organizationTemplates.id,
			name: organizationTemplates.name,
			s3Key: organizationTemplates.s3Key,
			placementManifestJson: organizationTemplates.placementManifestJson,
		})
		.from(organizationTemplates)
		.where(
			and(
				eq(organizationTemplates.id, templateId),
				eq(organizationTemplates.organizationId, activeOrg.organizationId),
			),
		)
		.limit(1);

	if (!row) throw new ORPCError("NOT_FOUND", { message: "Template not found" });

	const presignedUrl = bucket.presign(row.s3Key, {
		method: "GET",
		expiresIn: 300,
	});
	return {
		templateId: row.id,
		document: {
			id: row.id,
			name: row.name,
			type: "application/pdf",
			dataUrl: presignedUrl,
		},
		placementManifest: row.placementManifestJson as PlacementManifest | null,
	};
}

export async function orgsTemplatesDelete(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	templateId: string,
) {
	assertOrgPermission(activeOrg, "templates:write");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");

	const [deleted] = await db
		.delete(organizationTemplates)
		.where(
			and(
				eq(organizationTemplates.id, templateId),
				eq(organizationTemplates.organizationId, activeOrg.organizationId),
			),
		)
		.returning();

	if (!deleted)
		throw new ORPCError("NOT_FOUND", { message: "Template not found" });
	return { template: deleted };
}
