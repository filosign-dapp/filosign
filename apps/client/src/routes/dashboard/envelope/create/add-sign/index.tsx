import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AddSignaturePage } from "./-components/page";
import { useAddSignController } from "./-lib/hooks/use-controller";

function AddSignRoutePage() {
	const controller = useAddSignController();
	return <AddSignaturePage controller={controller} />;
}

export const Route = createFileRoute("/dashboard/envelope/create/add-sign/")({
	validateSearch: z.object({
		serverDraftId: z.string().trim().min(1).optional(),
	}),
	component: AddSignRoutePage,
});
