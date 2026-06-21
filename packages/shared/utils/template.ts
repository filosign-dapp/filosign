import { jsonStringify } from "@filosign/crypto-utils";
import { z } from "zod";
import { zHexString } from "../helpers/zod";
import type { DraftSnapshot } from "./draft";
import {
	normalizePlacementRecipientEmail,
	sortKeysDeep,
	zRectNormalized,
} from "./placement";

export const TEMPLATE_LIMITS = {
	MAX_FILE_SIZE: 30 * 1024 * 1024, // 30 MB
	MAX_TEMPLATE_DOCUMENTS: 10,
	MAX_TEMPLATE_TOTAL_BYTES: 50 * 1024 * 1024, // 50 MB
} as const;

export const zTemplateRoleKind = z.enum(["signer", "viewer"]);

export type TemplateRoleKind = z.infer<typeof zTemplateRoleKind>;

export const zTemplateRole = z.object({
	roleId: z.string().min(1),
	label: z.string().min(1).max(120),
	kind: zTemplateRoleKind,
	order: z.number().int().min(0),
});

export const zTemplateField = z.object({
	id: z.string().min(1),
	documentId: z.string().min(1),
	pageIndex: z.number().int().min(0),
	rect: zRectNormalized,
	roleId: z.string().min(1),
	required: z.boolean(),
	type: z.enum([
		"signature",
		"initial",
		"date",
		"name",
		"email",
		"text",
		"checkbox",
	]),
});

export const zTemplateDefaults = z.object({
	emailSubject: z.string(),
	emailMessage: z.string(),
	routingOrderRoleIds: z.array(z.string().min(1)).optional(),
});

/** SHA-256 of canonical signable document bytes (same format as placement manifests). */
export const zTemplatePlaintextSha256 = zHexString().refine(
	(val) => val.length === 66,
	{ error: "Invalid plaintext SHA-256 digest" },
);

export type TemplatePlaintextSha256 = z.infer<typeof zTemplatePlaintextSha256>;

export const zTemplatePrepareUpdateDocumentRow = z.object({
	docId: z.string().min(1).max(128),
	plaintextSha256: zTemplatePlaintextSha256,
	name: z.string().min(1).max(512),
	size: z.number().int().positive(),
	mimeType: z.string().min(1).max(128),
});

export type TemplatePrepareUpdateDocumentRow = z.infer<
	typeof zTemplatePrepareUpdateDocumentRow
>;

export const zContentFingerprint = z
	.string()
	.regex(/^0x[0-9a-fA-F]{64}$/, { error: "Invalid content fingerprint" });

export type ContentFingerprint = z.infer<typeof zContentFingerprint>;

export const zCatalogSource = z.object({
	systemTemplateId: z.uuid(),
	installedAtIso: z.iso.datetime(),
	systemContentFingerprint: zContentFingerprint,
	catalogVersionLabel: z.string().min(1).max(64),
});

export type CatalogSource = z.infer<typeof zCatalogSource>;

export const zTemplateSnapshot = z.object({
	version: z.literal(1),
	roles: z.array(zTemplateRole).min(1),
	fields: z.array(zTemplateField),
	defaults: zTemplateDefaults.optional(),
	catalogSource: zCatalogSource.optional(),
});

export type TemplateRole = z.infer<typeof zTemplateRole>;
export type TemplateField = z.infer<typeof zTemplateField>;
export type TemplateSnapshot = z.infer<typeof zTemplateSnapshot>;

export type TemplateRoleAssignment = {
	name: string;
	email: string;
};

export type TemplateHydratedSignatureField = {
	id: string;
	type: TemplateField["type"];
	x: number;
	y: number;
	width: number;
	height: number;
	page: number;
	documentId: string;
	assignedSignerWallet: string;
	assignedSignerName: string;
	assignedSignerEmail: string;
	required: boolean;
	label?: string;
};

export type TemplateHydratedRecipient = {
	name: string;
	email: string;
	role: "signer" | "viewer";
};

const DEFAULT_DOC_WIDTH = 612;
const DEFAULT_DOC_HEIGHT = 792;
const DEFAULT_FIELD_WIDTH = 120;
const DEFAULT_FIELD_HEIGHT = 40;

export const TEMPLATE_ROLE_EMAIL_DOMAIN = "template.filosign";

export function isTemplateRolePlaceholderEmail(email: string): boolean {
	return email.endsWith(`@${TEMPLATE_ROLE_EMAIL_DOMAIN}`);
}

export function templateRolePlaceholderEmail(roleId: string): string {
	return `${roleId}@${TEMPLATE_ROLE_EMAIL_DOMAIN}`;
}

export function parseRoleIdFromPlaceholderEmail(email: string): string {
	const suffix = `@${TEMPLATE_ROLE_EMAIL_DOMAIN}`;
	if (email.endsWith(suffix)) {
		return email.slice(0, -suffix.length);
	}
	return email;
}

function roleIdForEmail(email: string, kind: TemplateRole["kind"]): string {
	const normalized = normalizePlacementRecipientEmail(email);
	return `${kind}:${normalized}`;
}

function resolveRoleIdFromRecipient(
	recipient: DraftSnapshot["recipients"][number],
): string {
	if (recipient.clientRowId?.trim()) {
		return recipient.clientRowId.trim();
	}
	const normalized = normalizePlacementRecipientEmail(recipient.email ?? "");
	if (isTemplateRolePlaceholderEmail(normalized)) {
		return parseRoleIdFromPlaceholderEmail(normalized);
	}
	return roleIdForEmail(normalized, recipient.role);
}

function signerLabel(order: number): string {
	return `Signer ${order}`;
}

function normalizedRectFromSignatureField(
	field: DraftSnapshot["signatureFields"][number],
): TemplateField["rect"] {
	const width = Math.max(field.width ?? DEFAULT_FIELD_WIDTH, 1);
	const height = Math.max(field.height ?? DEFAULT_FIELD_HEIGHT, 1);
	return {
		x: field.x / DEFAULT_DOC_WIDTH,
		y: field.y / DEFAULT_DOC_HEIGHT,
		width: width / DEFAULT_DOC_WIDTH,
		height: height / DEFAULT_DOC_HEIGHT,
	};
}

function signatureFieldFromTemplateField(args: {
	field: TemplateField;
	assignment: TemplateRoleAssignment;
}): TemplateHydratedSignatureField {
	const pxWidth = args.field.rect.width * DEFAULT_DOC_WIDTH;
	const pxHeight = args.field.rect.height * DEFAULT_DOC_HEIGHT;
	return {
		id: args.field.id,
		type: args.field.type,
		x: args.field.rect.x * DEFAULT_DOC_WIDTH,
		y: args.field.rect.y * DEFAULT_DOC_HEIGHT,
		width: pxWidth,
		height: pxHeight,
		page: args.field.pageIndex + 1,
		documentId: args.field.documentId,
		assignedSignerWallet: "",
		assignedSignerName: args.assignment.name.trim() || args.assignment.email,
		assignedSignerEmail: normalizePlacementRecipientEmail(
			args.assignment.email,
		),
		required: args.field.required,
	};
}

export function draftSnapshotToTemplateSnapshot(
	draft: DraftSnapshot,
): TemplateSnapshot {
	const roles: TemplateRole[] = [];
	const emailToRoleId = new Map<string, string>();
	let signerOrder = 0;
	let viewerOrder = 0;

	for (const recipient of draft.recipients) {
		const email = recipient.email?.trim();
		if (!email) continue;
		const normalized = normalizePlacementRecipientEmail(email);
		if (emailToRoleId.has(normalized)) continue;

		const roleId = resolveRoleIdFromRecipient(recipient);

		if (recipient.role === "signer") {
			signerOrder += 1;
			const label = isTemplateRolePlaceholderEmail(normalized)
				? recipient.name.trim() || signerLabel(signerOrder)
				: signerLabel(signerOrder);
			roles.push({
				roleId,
				label,
				kind: "signer",
				order: signerOrder - 1,
			});
			emailToRoleId.set(normalized, roleId);
			continue;
		}

		viewerOrder += 1;
		const label = isTemplateRolePlaceholderEmail(normalized)
			? recipient.name.trim() || `Viewer ${viewerOrder}`
			: `Viewer ${viewerOrder}`;
		roles.push({
			roleId,
			label,
			kind: "viewer",
			order: viewerOrder - 1,
		});
		emailToRoleId.set(normalized, roleId);
	}

	const fields: TemplateField[] = [];
	for (const field of draft.signatureFields) {
		const normalizedEmail = normalizePlacementRecipientEmail(
			field.assignedSignerEmail,
		);
		const roleId = emailToRoleId.get(normalizedEmail);
		if (!roleId) continue;
		fields.push({
			id: field.id,
			documentId: field.documentId,
			pageIndex: Math.max(0, field.page - 1),
			rect: normalizedRectFromSignatureField(field),
			roleId,
			required: field.required,
			type: field.type,
		});
	}

	return zTemplateSnapshot.parse({
		version: 1,
		roles,
		fields,
		defaults: {
			emailSubject: draft.emailSubject,
			emailMessage: draft.emailMessage,
		},
	});
}

export function applyRoleAssignments(args: {
	snapshot: TemplateSnapshot;
	assignments: Record<string, TemplateRoleAssignment>;
	documents: Array<{
		id: string;
		name: string;
		sha256Plaintext: `0x${string}`;
		pageCount: number;
	}>;
}): {
	recipients: TemplateHydratedRecipient[];
	signatureFields: TemplateHydratedSignatureField[];
	placementManifest: {
		version: 1;
		documents: typeof args.documents;
		fields: Array<{
			id: string;
			documentId: string;
			pageIndex: number;
			rect: TemplateField["rect"];
			assignedRecipientEmail: string;
			required: boolean;
			type: TemplateField["type"];
		}>;
	};
	emailSubject: string;
	emailMessage: string;
} {
	const parsedSnapshot = zTemplateSnapshot.parse(args.snapshot);
	const recipients: TemplateHydratedRecipient[] = [];
	const signatureFields: TemplateHydratedSignatureField[] = [];
	const placementFields: Array<{
		id: string;
		documentId: string;
		pageIndex: number;
		rect: TemplateField["rect"];
		assignedRecipientEmail: string;
		required: boolean;
		type: TemplateField["type"];
	}> = [];

	for (const role of parsedSnapshot.roles.sort((a, b) => a.order - b.order)) {
		const assignment = args.assignments[role.roleId];
		if (!assignment?.email?.trim()) {
			if (role.kind === "signer") {
				throw new Error(`Missing assignment for ${role.label}`);
			}
			continue;
		}
		recipients.push({
			name: assignment.name.trim() || assignment.email.trim(),
			email: normalizePlacementRecipientEmail(assignment.email),
			role: role.kind,
		});
	}

	for (const field of parsedSnapshot.fields) {
		const assignment = args.assignments[field.roleId];
		if (!assignment?.email?.trim()) continue;
		const hydrated = signatureFieldFromTemplateField({ field, assignment });
		signatureFields.push(hydrated);
		placementFields.push({
			id: field.id,
			documentId: field.documentId,
			pageIndex: field.pageIndex,
			rect: field.rect,
			assignedRecipientEmail: hydrated.assignedSignerEmail,
			required: field.required,
			type: field.type,
		});
	}

	return {
		recipients,
		signatureFields,
		placementManifest: {
			version: 1,
			documents: args.documents,
			fields: placementFields,
		},
		emailSubject: parsedSnapshot.defaults?.emailSubject ?? "",
		emailMessage: parsedSnapshot.defaults?.emailMessage ?? "",
	};
}

export function canonicalTemplateSnapshotJson(
	snapshot: TemplateSnapshot,
): string {
	const parsed = zTemplateSnapshot.parse(snapshot);
	return jsonStringify(sortKeysDeep(parsed) as TemplateSnapshot);
}

export function templateStoragePrefix(args: {
	organizationId: string;
	templateId: string;
}): string {
	return `orgs/${args.organizationId}/templates/${args.templateId}`;
}

export function templateDocumentStorageKey(args: {
	organizationId: string;
	templateId: string;
	docId: string;
}): string {
	return `${templateStoragePrefix(args)}/${args.docId}.bin`;
}

export function templateSnapshotCounts(snapshot: TemplateSnapshot): {
	roleCount: number;
	fieldCount: number;
} {
	const parsed = zTemplateSnapshot.parse(snapshot);
	return {
		roleCount: parsed.roles.length,
		fieldCount: parsed.fields.length,
	};
}
