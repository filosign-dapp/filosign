import { useCallback, useEffect, useRef, useState } from "react";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import {
	acroformFieldsToSignatureFields,
	type DetectedPdfFormField,
	extractPdfAcroformFields,
} from "@/src/lib/domains/files/pdf-acroform";
import type { PlacementDocument } from "@/src/lib/domains/placement/types";
import { shouldAutoOpenAcroformImport } from "@/src/lib/domains/placement/utils/acroform-import-prompt";
import type { ActiveAssignee } from "@/src/lib/domains/placement/utils/active-assignees";
import { resolveActiveAssignee } from "@/src/lib/domains/placement/utils/active-assignees";

type UsePdfAcroformImportArgs = {
	interactionMode: "edit" | "view";
	currentDocument: PlacementDocument | undefined;
	currentDocumentFieldCount: number;
	activeAssigneeId: string;
	assignees: ActiveAssignee[];
	importSignatureFields: (fields: SignatureField[]) => void;
};

export function usePdfAcroformImport(args: UsePdfAcroformImportArgs) {
	const offeredDocumentIdsRef = useRef(new Set<string>());
	const [detectedFields, setDetectedFields] = useState<DetectedPdfFormField[]>(
		[],
	);
	const [promptOpen, setPromptOpen] = useState(false);
	const [detecting, setDetecting] = useState(false);

	const dismissPrompt = useCallback(() => {
		setPromptOpen(false);
		if (args.currentDocument?.id) {
			offeredDocumentIdsRef.current.add(args.currentDocument.id);
		}
	}, [args.currentDocument?.id]);

	const openImportPrompt = useCallback(() => {
		if (detectedFields.length === 0) return;
		setPromptOpen(true);
	}, [detectedFields.length]);

	const acceptImport = useCallback(() => {
		const documentId = args.currentDocument?.id;
		if (!documentId || detectedFields.length === 0) {
			dismissPrompt();
			return;
		}

		const assignee = resolveActiveAssignee(
			args.assignees,
			args.activeAssigneeId,
		);
		if (!assignee?.placementEnabled) {
			dismissPrompt();
			return;
		}

		const imported = acroformFieldsToSignatureFields({
			detected: detectedFields,
			documentId,
			assignee,
		});
		args.importSignatureFields(imported);
		offeredDocumentIdsRef.current.add(documentId);
		setPromptOpen(false);
		setDetectedFields([]);
	}, [
		args.activeAssigneeId,
		args.assignees,
		args.currentDocument?.id,
		args.importSignatureFields,
		detectedFields,
		dismissPrompt,
	]);

	useEffect(() => {
		const documentId = args.currentDocument?.id;
		const pdfBytes = args.currentDocument?.pdfBytes;
		if (
			args.interactionMode !== "edit" ||
			!documentId ||
			!pdfBytes?.length ||
			offeredDocumentIdsRef.current.has(documentId)
		) {
			return;
		}

		let cancelled = false;
		setDetecting(true);

		void (async () => {
			try {
				const fields = await extractPdfAcroformFields(pdfBytes);
				if (cancelled || fields.length === 0) return;
				setDetectedFields(fields);
				if (
					!shouldAutoOpenAcroformImport({
						detectedCount: fields.length,
						currentDocumentFieldCount: args.currentDocumentFieldCount,
						alreadyOfferedThisSession:
							offeredDocumentIdsRef.current.has(documentId),
					})
				) {
					return;
				}
				setPromptOpen(true);
			} finally {
				if (!cancelled) setDetecting(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [
		args.currentDocument?.id,
		args.currentDocument?.pdfBytes,
		args.currentDocumentFieldCount,
		args.interactionMode,
	]);

	return {
		promptOpen,
		setPromptOpen,
		detectedCount: detectedFields.length,
		detecting,
		acceptImport,
		dismissPrompt,
		openImportPrompt,
	};
}
