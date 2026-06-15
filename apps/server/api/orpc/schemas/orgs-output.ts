import { zTemplateSnapshot } from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { z } from "zod";
import { zDateWire } from "./rpc-wire";

const zOrgMemberRole = z.enum(["owner", "admin", "sender", "viewer"]);
const zOrgMemberStatus = z.enum(["invited", "active", "removed"]);
const zOrgSigningMode = z.enum(["acting_member", "org_safe"]);
export const rpcOrgRowSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
	encryptionPublicKey: zHexString(),
	createdByWallet: zEvmAddress(),
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
	encryptionPublicKey: zHexString(),
	orgWalletAddress: zEvmAddress().nullable(),
	role: zOrgMemberRole,
	status: zOrgMemberStatus,
});

export const rpcOrgsLinkWalletOutputSchema = z.object({
	orgWalletAddress: z.string(),
	orgWalletLinkedAt: zDateWire,
});

export const rpcOrgsUnlinkWalletOutputSchema = z.object({
	orgWalletAddress: z.null(),
	orgWalletLinkedAt: z.null(),
});

export const rpcOrgMemberSchema = z.object({
	walletAddress: zEvmAddress(),
	role: zOrgMemberRole,
	status: zOrgMemberStatus,
	hasKeyWrap: z.boolean(),
	firstName: z.string().nullable().optional(),
	lastName: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
});

export const rpcOrgTemplateSummarySchema = z.object({
	id: z.uuid(),
	name: z.string(),
	createdAt: zDateWire,
	updatedAt: zDateWire,
	createdByWallet: z.string(),
	roleCount: z.number().int().nonnegative(),
	fieldCount: z.number().int().nonnegative(),
	docCount: z.number().int().nonnegative(),
});

export const rpcOrgTemplateDocumentSchema = z.object({
	docId: z.string(),
	name: z.string(),
	size: z.number().int().positive(),
	mimeType: z.string(),
	s3Key: z.string().optional(),
	downloadUrl: z.url().optional(),
	uploadUrl: z.url().optional(),
});

/** Full template row as returned from DB. */
export const rpcOrgTemplateWireSchema = z.object({
	id: z.uuid(),
	organizationId: z.uuid(),
	name: z.string(),
	createdByWallet: z.string(),
	createdAt: zDateWire,
	updatedAt: zDateWire,
	headDekWrappedOmk: zHexString(),
	headOmkKemCiphertext: zHexString(),
	snapshotJson: zTemplateSnapshot,
	roleCount: z.number().int().nonnegative(),
	fieldCount: z.number().int().nonnegative(),
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
	requiresPaidPlanToCreate: z.boolean(),
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

export const rpcOrgsTemplatesListOutputSchema = z.object({
	templates: z.array(rpcOrgTemplateSummarySchema),
});

export const rpcOrgsTemplateOutputSchema = z.object({
	template: rpcOrgTemplateWireSchema,
});

export const rpcOrgsTemplateGetOutputSchema = z.object({
	template: rpcOrgTemplateWireSchema,
	documents: z.array(rpcOrgTemplateDocumentSchema),
});

export const rpcOrgsTemplatePrepareOutputSchema = z.object({
	templateId: z.uuid(),
	documents: z.array(
		z.object({
			docId: z.string(),
			s3Key: z.string(),
			uploadUrl: z.url(),
		}),
	),
});

export const rpcOrgsTemplatesCloneOutputSchema = z.object({
	templateId: z.uuid(),
	name: z.string(),
	headDekWrappedOmk: zHexString(),
	headOmkKemCiphertext: zHexString(),
	snapshotJson: zTemplateSnapshot,
	documents: z.array(
		z.object({
			docId: z.string(),
			name: z.string(),
			mimeType: z.string(),
			size: z.number().int().positive(),
			downloadUrl: z.url(),
		}),
	),
});
