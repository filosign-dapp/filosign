import { useCallback } from "react";
import { defaultPlacementFieldRect } from "@/src/lib/domains/files/field-box";
import {
	normalizedRectToPx,
	type PlacementViewport,
	pxRectToNormalized,
} from "@/src/lib/domains/files/placement-viewport";
import type { SignatureField } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import type { ActiveAssignee } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/active-assignees";

export function useAddSignFields(
	commitFields: (fields: SignatureField[], recordHistory?: boolean) => void,
	signatureFields: SignatureField[],
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
			isMobile: boolean;
		}) => {
			const defaults = defaultPlacementFieldRect(args.type, args.isMobile);
			const newField: SignatureField = {
				id: crypto.randomUUID(),
				type: args.type,
				x: args.x,
				y: args.y,
				width: defaults.width,
				height: defaults.height,
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
		[handleSignatureFieldsChange, signatureFields],
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

	const repeatFieldOnAllPages = useCallback(
		(args: {
			fieldId: string;
			numPages: number;
			sourceViewport: PlacementViewport;
			pageHeightFor: (page: number) => number;
		}) => {
			const source = signatureFields.find((f) => f.id === args.fieldId);
			if (!source || args.numPages <= 1) return;

			const normalized = pxRectToNormalized(
				{
					x: source.x,
					y: source.y,
					width: source.width,
					height: source.height,
				},
				args.sourceViewport,
			);

			const copies: SignatureField[] = [];
			for (let page = 2; page <= args.numPages; page += 1) {
				const pageHeight = args.pageHeightFor(page);
				const px = normalizedRectToPx(normalized, {
					docWidth: args.sourceViewport.docWidth,
					docHeight: pageHeight,
				});
				copies.push({
					...source,
					id: crypto.randomUUID(),
					page,
					x: px.x,
					y: px.y,
					width: px.width,
					height: px.height,
				});
			}

			if (copies.length === 0) return;
			handleSignatureFieldsChange([...signatureFields, ...copies]);
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

	return {
		signatureFields,
		handleSignatureFieldsChange,
		placeField,
		handleFieldUpdate,
		handleBulkFieldUpdate,
		applyFieldPatches,
		handleFieldRemove,
		handleBulkFieldRemove,
		handleFieldDuplicate,
		repeatFieldOnAllPages,
	};
}
