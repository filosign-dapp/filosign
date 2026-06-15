import type { DraftSnapshot } from "./draft";
import {
	type TemplateRole,
	type TemplateRoleKind,
	type TemplateSnapshot,
	templateRolePlaceholderEmail,
} from "./template";

export type TemplateEditorRecipient = DraftSnapshot["recipients"][number];

export type TemplateEditorField = DraftSnapshot["signatureFields"][number];

export type TemplateEditorState = {
	recipients: TemplateEditorRecipient[];
	signatureFields: TemplateEditorField[];
	documents: DraftSnapshot["documents"];
};

export function createTemplateRoleId(): string {
	return `role_${crypto.randomUUID()}`;
}

export function nextSignerLabel(roles: TemplateRole[]): string {
	const signerCount = roles.filter((role) => role.kind === "signer").length;
	return `Signer ${signerCount + 1}`;
}

export function nextViewerLabel(roles: TemplateRole[]): string {
	const viewerCount = roles.filter((role) => role.kind === "viewer").length;
	return `Viewer ${viewerCount + 1}`;
}

function recipientsToRoles(
	recipients: TemplateEditorRecipient[],
): TemplateRole[] {
	const signers = recipients.filter((row) => row.role === "signer");
	const viewers = recipients.filter((row) => row.role === "viewer");
	const roles: TemplateRole[] = [];
	let order = 0;
	for (const row of signers) {
		roles.push({
			roleId: row.clientRowId ?? row.email,
			label: row.name.trim() || nextSignerLabel(roles),
			kind: "signer",
			order: order++,
		});
	}
	for (const row of viewers) {
		roles.push({
			roleId: row.clientRowId ?? row.email,
			label: row.name.trim() || nextViewerLabel(roles),
			kind: "viewer",
			order: order++,
		});
	}
	return roles;
}

export function addTemplateRole(args: {
	state: TemplateEditorState;
	kind?: TemplateRoleKind;
	label?: string;
}): TemplateEditorState {
	const roles = recipientsToRoles(args.state.recipients);
	const roleId = createTemplateRoleId();
	const kind = args.kind ?? "signer";
	const label =
		args.label?.trim() ||
		(kind === "signer" ? nextSignerLabel(roles) : nextViewerLabel(roles));

	return {
		...args.state,
		recipients: [
			...args.state.recipients,
			{
				clientRowId: roleId,
				name: label,
				email: templateRolePlaceholderEmail(roleId),
				role: kind,
			},
		],
	};
}

export function updateTemplateRole(args: {
	state: TemplateEditorState;
	roleId: string;
	label?: string;
	kind?: TemplateRoleKind;
}): TemplateEditorState {
	const nextRecipients = args.state.recipients.map((row) => {
		const id = row.clientRowId ?? row.email;
		if (id !== args.roleId) return row;
		return {
			...row,
			name: args.label?.trim() || row.name,
			role: args.kind ?? row.role,
		};
	});

	let nextFields = args.state.signatureFields;
	if (args.kind === "viewer") {
		const email = templateRolePlaceholderEmail(args.roleId);
		nextFields = args.state.signatureFields.filter(
			(field) => field.assignedSignerEmail !== email,
		);
	}

	return {
		...args.state,
		recipients: nextRecipients,
		signatureFields: nextFields,
	};
}

export function removeTemplateRole(args: {
	state: TemplateEditorState;
	roleId: string;
}): TemplateEditorState {
	const roles = recipientsToRoles(args.state.recipients);
	const target = roles.find((role) => role.roleId === args.roleId);
	if (!target) return args.state;

	const signerCount = roles.filter((role) => role.kind === "signer").length;
	if (target.kind === "signer" && signerCount <= 1) {
		throw new Error("At least one signer role is required.");
	}

	const email = templateRolePlaceholderEmail(args.roleId);
	return {
		...args.state,
		recipients: args.state.recipients.filter((row) => {
			const id = row.clientRowId ?? row.email;
			return id !== args.roleId;
		}),
		signatureFields: args.state.signatureFields.filter(
			(field) => field.assignedSignerEmail !== email,
		),
	};
}

export function reorderTemplateRoles(args: {
	state: TemplateEditorState;
	orderedRoleIds: string[];
}): TemplateEditorState {
	const byId = new Map(
		args.state.recipients.map((row) => [row.clientRowId ?? row.email, row]),
	);
	const ordered: TemplateEditorRecipient[] = [];
	for (const roleId of args.orderedRoleIds) {
		const row = byId.get(roleId);
		if (row) ordered.push(row);
	}
	for (const row of args.state.recipients) {
		const id = row.clientRowId ?? row.email;
		if (!args.orderedRoleIds.includes(id)) ordered.push(row);
	}
	return { ...args.state, recipients: ordered };
}

export function removeTemplateDocument(args: {
	state: TemplateEditorState;
	documentId: string;
}): TemplateEditorState {
	return {
		...args.state,
		documents: args.state.documents.filter((doc) => doc.id !== args.documentId),
		signatureFields: args.state.signatureFields.filter(
			(field) => field.documentId !== args.documentId,
		),
	};
}

export function countFieldsForRole(args: {
	state: TemplateEditorState;
	roleId: string;
}): number {
	const email = templateRolePlaceholderEmail(args.roleId);
	return args.state.signatureFields.filter(
		(field) => field.assignedSignerEmail === email,
	).length;
}

export function countFieldsForDocument(args: {
	state: TemplateEditorState;
	documentId: string;
}): number {
	return args.state.signatureFields.filter(
		(field) => field.documentId === args.documentId,
	).length;
}

export function templateRoleRowsFromState(
	state: TemplateEditorState,
): TemplateRole[] {
	return recipientsToRoles(state.recipients);
}

export type { TemplateSnapshot };
