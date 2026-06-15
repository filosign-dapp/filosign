import {
	addTemplateRole,
	applyRoleAssignments,
	type DraftSnapshot,
	draftSnapshotToTemplateSnapshot,
	removeTemplateDocument,
	removeTemplateRole,
	reorderTemplateRoles,
	type TemplateEditorState,
	type TemplateRoleKind,
	type TemplateSnapshot,
	templateRolePlaceholderEmail,
	templateRoleRowsFromState,
	updateTemplateRole,
} from "@filosign/shared";
import {
	buildCreateForm,
	createFormToEnvelopeForm,
	pruneSignatureFields,
} from "@/src/lib/domains/drafts/envelope-local-draft";
import type {
	CreateForm,
	SignatureField,
} from "@/src/lib/domains/files/envelope-form-types";

export function buildTemplateSnapshotFromComposer(args: {
	recipients: DraftSnapshot["recipients"];
	signatureFields: SignatureField[];
	emailSubject: string;
	emailMessage: string;
	documents: DraftSnapshot["documents"];
}): TemplateSnapshot {
	return draftSnapshotToTemplateSnapshot({
		recipients: args.recipients,
		emailSubject: args.emailSubject,
		emailMessage: args.emailMessage,
		settlementDrafts: [],
		signatureFields: args.signatureFields,
		placementManifest: { version: 1, documents: [], fields: [] },
		documents: args.documents,
	});
}

export function composerStateFromTemplateSnapshot(args: {
	snapshot: TemplateSnapshot;
}): {
	recipients: DraftSnapshot["recipients"];
	signatureFields: SignatureField[];
	emailSubject: string;
	emailMessage: string;
} {
	const roleEmailById = new Map(
		args.snapshot.roles.map((role) => [
			role.roleId,
			templateRolePlaceholderEmail(role.roleId),
		]),
	);
	const recipients = args.snapshot.roles
		.sort((a, b) => a.order - b.order)
		.map((role) => ({
			clientRowId: role.roleId,
			name: role.label,
			email:
				roleEmailById.get(role.roleId) ??
				templateRolePlaceholderEmail(role.roleId),
			role: role.kind,
		}));

	const signatureFields: SignatureField[] = args.snapshot.fields.map(
		(field) => {
			const email =
				roleEmailById.get(field.roleId) ??
				templateRolePlaceholderEmail(field.roleId);
			const role = args.snapshot.roles.find(
				(row) => row.roleId === field.roleId,
			);
			return {
				id: field.id,
				type: field.type,
				x: field.rect.x * 612,
				y: field.rect.y * 792,
				width: field.rect.width * 612,
				height: field.rect.height * 792,
				page: field.pageIndex + 1,
				documentId: field.documentId,
				assignedSignerWallet: "",
				assignedSignerName: role?.label ?? email,
				assignedSignerEmail: email,
				required: field.required,
			};
		},
	);

	return {
		recipients,
		signatureFields,
		emailSubject: args.snapshot.defaults?.emailSubject ?? "",
		emailMessage: args.snapshot.defaults?.emailMessage ?? "",
	};
}

export async function hydrateCreateFormFromTemplate(args: {
	snapshot: TemplateSnapshot;
	documents: Array<{
		id: string;
		name: string;
		type: string;
		bytes: Uint8Array;
	}>;
	assignments: Record<string, { name: string; email: string }>;
}) {
	const hydrated = applyRoleAssignments({
		snapshot: args.snapshot,
		assignments: args.assignments,
		documents: args.documents.map((doc) => ({
			id: doc.id,
			name: doc.name,
			sha256Plaintext: `0x${"00".repeat(32)}` as `0x${string}`,
			pageCount: 1,
		})),
	});

	const files = args.documents.map((doc) => {
		const file = new File([Uint8Array.from(doc.bytes)], doc.name, {
			type: doc.type,
		});
		return {
			id: doc.id,
			file,
			name: doc.name,
			size: file.size,
			type: doc.type,
		};
	});

	const draft = await buildCreateForm(
		{
			documents: files,
			recipients: hydrated.recipients.map((recipient) => ({
				name: recipient.name,
				email: recipient.email,
				role: recipient.role,
			})),
			emailMessage: hydrated.emailMessage,
			emailSubject: hydrated.emailSubject,
			settlementDrafts: [],
		},
		null,
	);
	return {
		...draft,
		signatureFields: hydrated.signatureFields,
	};
}

export async function hydrateCreateFormFromTemplateEditor(args: {
	snapshot: TemplateSnapshot;
	documents: Array<{
		id: string;
		name: string;
		type: string;
		bytes: Uint8Array;
	}>;
}) {
	const composer = composerStateFromTemplateSnapshot({
		snapshot: args.snapshot,
	});
	const files = args.documents.map((doc) => {
		const file = new File([Uint8Array.from(doc.bytes)], doc.name, {
			type: doc.type,
		});
		return {
			id: doc.id,
			file,
			name: doc.name,
			size: file.size,
			type: doc.type,
		};
	});

	const draft = await buildCreateForm(
		{
			documents: files,
			recipients: composer.recipients,
			emailMessage: composer.emailMessage,
			emailSubject: composer.emailSubject,
			settlementDrafts: [],
		},
		null,
	);
	return {
		...draft,
		signatureFields: composer.signatureFields,
	};
}

export function canManageTemplates(role: string | undefined): boolean {
	return role === "owner" || role === "admin";
}

export function canUseTemplates(role: string | undefined): boolean {
	return role === "owner" || role === "admin" || role === "sender";
}

export function templateEditorStateFromCreateForm(
	createForm: CreateForm,
): TemplateEditorState {
	return {
		recipients: createForm.recipients,
		signatureFields: createForm.signatureFields ?? [],
		documents: createForm.documents,
	};
}

export function templateRolesFromCreateForm(createForm: CreateForm) {
	return templateRoleRowsFromState(
		templateEditorStateFromCreateForm(createForm),
	);
}

export type TemplateEditorMutation =
	| { type: "addRole"; kind?: TemplateRoleKind; label?: string }
	| {
			type: "updateRole";
			roleId: string;
			label?: string;
			kind?: TemplateRoleKind;
	  }
	| { type: "removeRole"; roleId: string }
	| { type: "reorderRoles"; orderedRoleIds: string[] }
	| { type: "removeDocument"; documentId: string };

export function applyTemplateEditorMutation(
	createForm: CreateForm,
	mutation: TemplateEditorMutation,
): CreateForm {
	const state = templateEditorStateFromCreateForm(createForm);
	let nextState: TemplateEditorState;

	switch (mutation.type) {
		case "addRole":
			nextState = addTemplateRole({
				state,
				kind: mutation.kind,
				label: mutation.label,
			});
			break;
		case "updateRole":
			nextState = updateTemplateRole({
				state,
				roleId: mutation.roleId,
				label: mutation.label,
				kind: mutation.kind,
			});
			break;
		case "removeRole":
			nextState = removeTemplateRole({
				state,
				roleId: mutation.roleId,
			});
			break;
		case "reorderRoles":
			nextState = reorderTemplateRoles({
				state,
				orderedRoleIds: mutation.orderedRoleIds,
			});
			break;
		case "removeDocument":
			nextState = removeTemplateDocument({
				state,
				documentId: mutation.documentId,
			});
			break;
	}

	return {
		...createForm,
		recipients: nextState.recipients,
		documents: nextState.documents,
		signatureFields: pruneSignatureFields(
			nextState.signatureFields.map((field) => ({
				...field,
				width: field.width ?? 120,
				height: field.height ?? 40,
			})),
			nextState.recipients,
		),
	};
}

export async function appendDocumentsToCreateForm(args: {
	createForm: CreateForm;
	files: File[];
}): Promise<CreateForm> {
	const uploaded = args.files.map((file) => ({
		id: crypto.randomUUID(),
		file,
		name: file.name,
		size: file.size,
		type: file.type,
	}));
	const envelopeDocs = await createFormToEnvelopeForm(args.createForm);
	return buildCreateForm(
		{
			...envelopeDocs,
			documents: [...envelopeDocs.documents, ...uploaded],
		},
		args.createForm,
	);
}
