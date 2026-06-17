import { ActivationRouteHints } from "@/src/lib/domains/activation/route-hints";
import { useActivationEnvelopeStartedOnMount } from "@/src/lib/domains/activation/use-mark-first-envelope-started";
import { EntitlementPlanHint } from "@/src/lib/domains/entitlements/entitlement-plan-hint";
import { ComposeAdvancedSection } from "@/src/routes/dashboard/envelope/create/-components/compose-advanced-section";
import {
	ComposeDocumentsField,
	ComposeRecipientsField,
} from "@/src/routes/dashboard/envelope/create/-components/compose-form-fields";
import { ComposeUpgradeFeaturesHint } from "@/src/routes/dashboard/envelope/create/-components/compose-upgrade-features-hint";

export function EnvelopeFormBody() {
	useActivationEnvelopeStartedOnMount();

	return (
		<main className="p-4 sm:p-6 md:p-8 mx-auto space-y-8 max-w-4xl">
			<EntitlementPlanHint />
			<ActivationRouteHints />
			<ComposeDocumentsField />
			<ComposeRecipientsField />
			<ComposeUpgradeFeaturesHint />
			<ComposeAdvancedSection />
		</main>
	);
}
