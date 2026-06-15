import {
	addTemplateRole,
	applyRoleAssignments,
	type DraftSnapshot,
	draftSnapshotToTemplateSnapshot,
	isTemplateRolePlaceholderEmail,
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
	normalizeCreateForm,
	pruneSignatureFields,
	recipientFingerprint,
} from "@/src/lib/domains/drafts/envelope-local-draft";
import type {
	CreateForm,
	Recipient,
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
	const recipients: Recipient[] = args.snapshot.roles
		.sort((a, b) => a.order - b.order)
		.map((role) => ({
			clientRowId: role.roleId,
			name: "",
			templateRoleLabel: role.label,
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
		recipients: recipients as DraftSnapshot["recipients"],
		signatureFields,
		emailSubject: args.snapshot.defaults?.emailSubject ?? "",
		emailMessage: args.snapshot.defaults?.emailMessage ?? "",
	};
}

export function recipientComposeEmailDisplay(email: string): string {
	return isTemplateRolePlaceholderEmail(email) ? "" : email;
}

export async function hydrateCreateFormFromTemplateForCompose(args: {
	templateId: string;
	snapshot: TemplateSnapshot;
	documents: Array<{
		id: string;
		name: string;
		type: string;
		bytes: Uint8Array;
	}>;
}): Promise<CreateForm> {
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
			recipients: composer.recipients as Recipient[],
			emailMessage: composer.emailMessage,
			emailSubject: composer.emailSubject,
			settlementDrafts: [],
		},
		null,
	);

	return {
		...draft,
		signatureFields: composer.signatureFields,
		templateUse: {
			templateId: args.templateId,
			snapshotJson: args.snapshot,
		},
	};
}

export async function finalizeTemplateUseAtComposeContinue(args: {
	prev: CreateForm;
	formRecipients: Recipient[];
	emailSubject: string;
	emailMessage: string;
	settlementDrafts: CreateForm["settlementDrafts"];
}): Promise<CreateForm> {
	const templateUse = args.prev.templateUse;
	if (!templateUse) {
		throw new Error(
			"finalizeTemplateUseAtComposeContinue requires templateUse",
		);
	}

	const snapshot = templateUse.snapshotJson;
	const sortedRoles = [...snapshot.roles].sort((a, b) => a.order - b.order);
	const roleIds = new Set(sortedRoles.map((role) => role.roleId));

	const assignments: Record<string, { name: string; email: string }> = {};
	const presentRoleIds = new Set<string>();
	for (const recipient of args.formRecipients) {
		const roleId = recipient.clientRowId;
		if (!roleId || !roleIds.has(roleId)) continue;
		presentRoleIds.add(roleId);
		assignments[roleId] = {
			name: recipient.name.trim() || recipient.email.trim(),
			email: recipient.email.trim(),
		};
	}

	const activeSnapshot: TemplateSnapshot = {
		...snapshot,
		roles: sortedRoles.filter((role) => presentRoleIds.has(role.roleId)),
		fields: snapshot.fields.filter((field) => presentRoleIds.has(field.roleId)),
	};

	const hydrated = applyRoleAssignments({
		snapshot: activeSnapshot,
		assignments,
		documents: args.prev.documents.map((doc) => ({
			id: doc.id,
			name: doc.name,
			sha256Plaintext: doc.plaintextSha256 ?? (`0x${"00".repeat(32)}` as const),
			pageCount: doc.pageCount ?? 1,
		})),
	});

	const templateRecipients: Recipient[] = [];
	let hydratedIndex = 0;
	for (const role of sortedRoles) {
		const formRow = args.formRecipients.find(
			(recipient) => recipient.clientRowId === role.roleId,
		);
		if (!formRow) continue;
		const mapped = hydrated.recipients[hydratedIndex];
		hydratedIndex += 1;
		if (!mapped) continue;
		templateRecipients.push({
			clientRowId: role.roleId,
			name: mapped.name,
			email: mapped.email,
			role: mapped.role,
			walletAddress: formRow.walletAddress,
			templateRoleLabel: formRow.templateRoleLabel ?? role.label,
		});
	}

	const extraRecipients = args.formRecipients.filter(
		(recipient) =>
			!recipient.clientRowId || !roleIds.has(recipient.clientRowId),
	);

	const recipients = [...templateRecipients, ...extraRecipients];
	const signatureFields = pruneSignatureFields(
		hydrated.signatureFields,
		recipients,
	);

	const envelopeForm = await createFormToEnvelopeForm({
		...args.prev,
		recipients,
		signatureFields,
		emailSubject: args.emailSubject,
		emailMessage: args.emailMessage,
		settlementDrafts: args.settlementDrafts ?? [],
	});

	const draft = await buildCreateForm(envelopeForm, {
		...args.prev,
		templateUse: undefined,
	});

	return normalizeCreateForm({
		...draft,
		recipients,
		signatureFields,
		recipientFingerprint: recipientFingerprint(recipients),
	});
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
		signatureFields: pruneSignatureFields(
			hydrated.signatureFields,
			hydrated.recipients.map((recipient) => ({
				clientRowId: recipient.email,
				name: recipient.name,
				email: recipient.email,
				role: recipient.role,
			})),
		),
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
