import { zPlacementManifest } from "@filosign/shared";
import { z } from "zod";
import { zDateWire } from "./rpc-wire";

const zOrgMemberRole = z.enum(["owner", "admin", "sender", "viewer"]);
const zOrgMemberStatus = z.enum(["invited", "active", "removed"]);
const zOrgConnectionStatus = z.enum(["pending_approval", "active", "inactive"]);
const zOrgSigningMode = z.enum(["acting_member", "org_safe"]);
export const rpcOrgRowSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
	encryptionPublicKey: z.string(),
	createdByWallet: z.string(),
	signingMode: zOrgSigningMode,
	orgWalletAddress: z.string().nullable(),
	orgWalletLinkedAt: zDateWire.nullable(),
	createdAt: zDateWire,
	updatedAt: zDateWire,
});

export const rpcOrgListItemSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
	encryptionPublicKey: z.string(),
	role: zOrgMemberRole,
	status: zOrgMemberStatus,
});

export const rpcOrgMemberSchema = z.object({
	walletAddress: z.string(),
	role: zOrgMemberRole,
	status: zOrgMemberStatus,
	hasKeyWrap: z.boolean(),
});

export const rpcOrgTemplateSummarySchema = z.object({
	id: z.uuid(),
	name: z.string(),
	createdAt: zDateWire,
	createdByWallet: z.string(),
});

/** Full template row as returned from DB (may include storage fields). */
export const rpcOrgTemplateWireSchema = z
	.object({
		id: z.uuid(),
		organizationId: z.uuid(),
		name: z.string(),
		createdByWallet: z.string(),
		createdAt: zDateWire,
		updatedAt: zDateWire,
		placementManifest: zPlacementManifest.optional(),
		placementManifestJson: z.unknown().optional(),
		s3Key: z.string().optional(),
		dekWrappedOmk: z.string().optional(),
		deletedAt: zDateWire.nullable().optional(),
	})
	.loose();

export const rpcOrgConnectionSchema = z.object({
	organizationId: z.uuid(),
	recipientWallet: z.string(),
	label: z.string().nullable(),
	addedByWallet: z.string(),
	anchorSenderWallet: z.string(),
	shareApprovalId: z.uuid().nullable(),
	status: zOrgConnectionStatus,
	createdAt: zDateWire,
	updatedAt: zDateWire,
});

export const rpcOrgInviteSchema = z.object({
	id: z.uuid(),
	token: z.string().nullable(),
	expiresAt: zDateWire,
	email: z.string(),
	role: zOrgMemberRole,
});

export const rpcOrgsCreateOutputSchema = z.object({
	organization: rpcOrgRowSchema,
});

export const rpcOrgsListMineOutputSchema = z.object({
	organizations: z.array(rpcOrgListItemSchema),
});

export const rpcOrgsGetOutputSchema = z.object({
	organization: rpcOrgRowSchema,
	members: z.array(rpcOrgMemberSchema),
	templates: z.array(rpcOrgTemplateSummarySchema),
});

export const rpcOrgsUpdateOutputSchema = z.object({
	organization: rpcOrgRowSchema,
});

export const rpcOrgsMemberOutputSchema = z.object({
	member: z.object({
		organizationId: z.uuid(),
		walletAddress: z.string(),
		role: zOrgMemberRole,
		status: zOrgMemberStatus,
		invitedBy: z.string().nullable(),
		createdAt: zDateWire,
		updatedAt: zDateWire,
	}),
});

export const rpcOrgsInviteCreateOutputSchema = z.object({
	invite: rpcOrgInviteSchema,
});

export const rpcOrgsConnectionOutputSchema = z.object({
	connection: rpcOrgConnectionSchema,
});

export const rpcOrgsConnectionsListOutputSchema = z.object({
	connections: z.array(rpcOrgConnectionSchema),
});

export const rpcOrgsTemplatesListOutputSchema = z.object({
	templates: z.array(rpcOrgTemplateSummarySchema),
});

export const rpcOrgsTemplateOutputSchema = z.object({
	template: rpcOrgTemplateWireSchema,
});

export const rpcOrgsTemplatesCloneOutputSchema = z.object({
	templateId: z.uuid(),
	document: z.object({
		id: z.uuid(),
		name: z.string(),
		type: z.string(),
		dataUrl: z.string().url(),
	}),
	placementManifest: z.unknown(),
});
