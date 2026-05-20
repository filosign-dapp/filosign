import { createFileRoute } from "@tanstack/react-router";
import { CreateEnvelopePage } from "./-components/page";
import { CreateEnvelopeProvider } from "./-lib/context/create-envelope-context";
import { EntitlementUpgradeProvider } from "./-lib/context/entitlement-upgrade-context";
import { useCreateEnvelopeController } from "./-lib/hooks/use-create-controller";

function CreateEnvelopeRoutePage() {
	const controller = useCreateEnvelopeController();
	return (
		<EntitlementUpgradeProvider>
			<CreateEnvelopeProvider value={controller}>
				<CreateEnvelopePage />
			</CreateEnvelopeProvider>
		</EntitlementUpgradeProvider>
	);
}

export const Route = createFileRoute("/dashboard/envelope/create/")({
	component: CreateEnvelopeRoutePage,
});
