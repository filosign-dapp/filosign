import { createContext, useContext } from "react";
import type { DocumentsController } from "@/src/routes/dashboard/_shell/document/all/-lib/hooks/use-documents-controller";

const DocumentsContext = createContext<DocumentsController | null>(null);

export function DocumentsProvider({
	value,
	children,
}: {
	value: DocumentsController;
	children: React.ReactNode;
}) {
	return (
		<DocumentsContext.Provider value={value}>
			{children}
		</DocumentsContext.Provider>
	);
}

export function useDocuments(): DocumentsController {
	const context = useContext(DocumentsContext);
	if (!context) {
		throw new Error("useDocuments must be used within DocumentsProvider");
	}
	return context;
}
