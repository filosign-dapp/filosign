import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DocumentsAllPage } from "./-components/page";
import { DocumentsProvider } from "./-lib/context/context";
import { useDocumentsController } from "./-lib/hooks/use-documents-controller";

const billingSearchSchema = z.object({
	upgrade: z.string().optional(),
	interval: z.string().optional(),
});

function DocumentAllRoutePage() {
	const controller = useDocumentsController();
	return (
		<DocumentsProvider value={controller}>
			<DocumentsAllPage />
		</DocumentsProvider>
	);
}

export const Route = createFileRoute("/dashboard/_shell/document/all/")({
	validateSearch: billingSearchSchema,
	component: DocumentAllRoutePage,
});
