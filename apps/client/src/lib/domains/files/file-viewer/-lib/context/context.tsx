import { createContext, useContext } from "react";
import type { FileViewerController } from "@/src/lib/domains/files/file-viewer/-lib/hooks/use-file-viewer-controller";

const FileViewerContext = createContext<FileViewerController | null>(null);

export function FileViewerProvider({
	value,
	children,
}: {
	value: FileViewerController;
	children: React.ReactNode;
}) {
	return (
		<FileViewerContext.Provider value={value}>
			{children}
		</FileViewerContext.Provider>
	);
}

export function useFileViewer(): FileViewerController {
	const ctx = useContext(FileViewerContext);
	if (!ctx) {
		throw new Error("useFileViewer must be used within FileViewerProvider");
	}
	return ctx;
}
