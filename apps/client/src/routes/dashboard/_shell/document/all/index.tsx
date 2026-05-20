import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { DocumentsAllPage } from "./-components/page";
import { DocumentsProvider } from "./-lib/context/context";
import { useDocumentsController } from "./-lib/hooks/use-documents-controller";

function DocumentAllRoutePage() {
	const controller = useDocumentsController();
	const value = useMemo(() => controller, [controller]);
	return (
		<DocumentsProvider value={value}>
			<DocumentsAllPage />
		</DocumentsProvider>
	);
}

export const Route = createFileRoute("/dashboard/_shell/document/all/")({
	component: DocumentAllRoutePage,
});
