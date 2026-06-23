import { useCallback } from "react";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import type { PlacementFieldType } from "@/src/lib/domains/files/field-box";
import type { ActiveAssignee } from "@/src/lib/domains/placement/utils/active-assignees";
import type { PlacementFieldSize } from "@/src/lib/domains/placement/utils/placement-field-presets";

export function usePlacementFields(
	commitFields: (fields: SignatureField[], recordHistory?: boolean) => void,
	signatureFields: SignatureField[],
	resolveFieldSize: (type: PlacementFieldType) => PlacementFieldSize,
) {
	const handleSignatureFieldsChange = useCallback(
		(fields: SignatureField[], recordHistory = true) => {
			commitFields(fields, recordHistory);
		},
		[commitFields],
	);

	const placeField = useCallback(
		(args: {
			type: SignatureField["type"];
			x: number;
			y: number;
			documentId: string;
			page: number;
			assignee: ActiveAssignee;
		}) => {
			const size = resolveFieldSize(args.type);
			const newField: SignatureField = {
				id: crypto.randomUUID(),
				type: args.type,
				x: args.x,
				y: args.y,
				width: size.width,
				height: size.height,
				page: args.page,
				documentId: args.documentId,
				assignedSignerWallet: args.assignee.walletAddress,
				assignedSignerName: args.assignee.name,
				assignedSignerEmail: args.assignee.email,
				required: args.assignee.required,
			};
			handleSignatureFieldsChange([...signatureFields, newField]);
			return newField.id;
		},
		[handleSignatureFieldsChange, signatureFields, resolveFieldSize],
	);

	const handleFieldUpdate = useCallback(
		(fieldId: string, updates: Partial<SignatureField>) => {
			handleSignatureFieldsChange(
				signatureFields.map((field) =>
					field.id === fieldId ? { ...field, ...updates } : field,
				),
			);
		},
		[handleSignatureFieldsChange, signatureFields],
	);

	const handleBulkFieldUpdate = useCallback(
		(
			fieldIds: Iterable<string>,
			updates: Partial<SignatureField>,
			recordHistory = true,
		) => {
			const ids = new Set(fieldIds);
			handleSignatureFieldsChange(
				signatureFields.map((field) =>
					ids.has(field.id) ? { ...field, ...updates } : field,
				),
				recordHistory,
			);
		},
		[handleSignatureFieldsChange, signatureFields],
	);

	const handleFieldRemove = useCallback(
		(fieldId: string) => {
			handleSignatureFieldsChange(
				signatureFields.filter((field) => field.id !== fieldId),
			);
		},
		[handleSignatureFieldsChange, signatureFields],
	);

	const handleBulkFieldRemove = useCallback(
		(fieldIds: Iterable<string>) => {
			const ids = new Set(fieldIds);
			handleSignatureFieldsChange(
				signatureFields.filter((field) => !ids.has(field.id)),
			);
		},
		[handleSignatureFieldsChange, signatureFields],
	);

	const handleFieldDuplicate = useCallback(
		(fieldId: string) => {
			const source = signatureFields.find((f) => f.id === fieldId);
			if (!source) return;
			const copy: SignatureField = {
				...source,
				id: crypto.randomUUID(),
				x: source.x + 12,
				y: source.y + 12,
			};
			handleSignatureFieldsChange([...signatureFields, copy]);
		},
		[handleSignatureFieldsChange, signatureFields],
	);

	const applyFieldPatches = useCallback(
		(patches: Map<string, Partial<SignatureField>>) => {
			handleSignatureFieldsChange(
				signatureFields.map((field) => {
					const patch = patches.get(field.id);
					return patch ? { ...field, ...patch } : field;
				}),
			);
		},
		[handleSignatureFieldsChange, signatureFields],
	);

	const importSignatureFields = useCallback(
		(newFields: SignatureField[]) => {
			if (newFields.length === 0) return;
			handleSignatureFieldsChange([...signatureFields, ...newFields]);
		},
		[handleSignatureFieldsChange, signatureFields],
	);

	return {
		placeField,
		handleFieldUpdate,
		handleBulkFieldUpdate,
		applyFieldPatches,
		handleFieldRemove,
		handleBulkFieldRemove,
		handleFieldDuplicate,
		importSignatureFields,
	};
}
