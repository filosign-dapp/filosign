import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { EntitlementUpgradeProvider } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import { AddSignaturePage } from "./-components/page";
import { useAddSignController } from "./-lib/hooks/use-controller";

function AddSignRoutePage() {
	const controller = useAddSignController();
	return (
		<EntitlementUpgradeProvider>
			<AddSignaturePage controller={controller} />
		</EntitlementUpgradeProvider>
	);
}

export const Route = createFileRoute("/dashboard/envelope/create/add-sign/")({
	validateSearch: z.object({
		serverDraftId: z.string().trim().min(1).optional(),
	}),
	component: AddSignRoutePage,
});
