import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
	useAddSignDnd,
	useAddSignPlacement,
} from "@/src/lib/domains/placement/context";
import { usePdfAcroformImport } from "@/src/lib/domains/placement/use-pdf-acroform-import";
import { PdfAcroformImportDialog } from "@/src/routes/dashboard/envelope/create/add-sign/-components/pdf-acroform-import-dialog";

type PdfAcroformImportContextValue = {
	canImportAcroform: boolean;
	detectedCount: number;
	detecting: boolean;
	openImportPrompt: () => void;
};

const PdfAcroformImportContext =
	createContext<PdfAcroformImportContextValue | null>(null);

export function PdfAcroformImportProvider({
	children,
}: {
	children: ReactNode;
}) {
	const { interactionMode, importSignatureFields } = useAddSignDnd();
	const {
		currentDocument,
		currentDocumentFields,
		activeAssigneeId,
		assignees,
	} = useAddSignPlacement();

	const acroformImport = usePdfAcroformImport({
		interactionMode,
		currentDocument,
		currentDocumentFieldCount: currentDocumentFields.length,
		activeAssigneeId,
		assignees,
		importSignatureFields,
	});

	const value = useMemo(
		(): PdfAcroformImportContextValue => ({
			canImportAcroform: acroformImport.detectedCount > 0,
			detectedCount: acroformImport.detectedCount,
			detecting: acroformImport.detecting,
			openImportPrompt: acroformImport.openImportPrompt,
		}),
		[
			acroformImport.detectedCount,
			acroformImport.detecting,
			acroformImport.openImportPrompt,
		],
	);

	return (
		<PdfAcroformImportContext.Provider value={value}>
			{children}
			<PdfAcroformImportDialog
				open={acroformImport.promptOpen}
				fieldCount={acroformImport.detectedCount}
				onOpenChange={(open) => {
					if (!open) acroformImport.dismissPrompt();
					else acroformImport.setPromptOpen(open);
				}}
				onConfirm={acroformImport.acceptImport}
			/>
		</PdfAcroformImportContext.Provider>
	);
}

export function usePdfAcroformImportUi() {
	const value = useContext(PdfAcroformImportContext);
	if (!value) {
		throw new Error(
			"usePdfAcroformImportUi must be used within PdfAcroformImportProvider",
		);
	}
	return value;
}
