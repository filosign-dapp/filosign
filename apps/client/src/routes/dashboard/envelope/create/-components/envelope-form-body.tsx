import { ActivationRouteHints } from "@/src/lib/domains/activation/route-hints";
import { useActivationEnvelopeStartedOnMount } from "@/src/lib/domains/activation/use-mark-first-envelope-started";
import { EntitlementPlanHint } from "@/src/lib/domains/entitlements/entitlement-plan-hint";
import {
	ComposeDocumentsField,
	ComposeRecipientsField,
} from "@/src/routes/dashboard/envelope/create/-components/compose-form-fields";
import { ComposeRoutingField } from "@/src/routes/dashboard/envelope/create/-components/compose-routing-field";
import { ComposeSupplementaryFilesSection } from "@/src/routes/dashboard/envelope/create/-components/compose-supplementary-files-section";

export function EnvelopeFormBody() {
	useActivationEnvelopeStartedOnMount();

	return (
		<main className="p-8 mx-auto space-y-8 max-w-4xl">
			<EntitlementPlanHint />
			<ActivationRouteHints />
			<ComposeDocumentsField />
			<ComposeRecipientsField />
			<ComposeRoutingField />
			<ComposeSupplementaryFilesSection />
		</main>
	);
}
