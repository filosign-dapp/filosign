import { EntitlementPlanHint } from "@/src/lib/domains/entitlements/entitlement-plan-hint";
import {
	ComposeDocumentsField,
	ComposeRecipientsField,
} from "@/src/routes/dashboard/envelope/create/-components/compose-form-fields";

export function EnvelopeFormBody() {
	return (
		<main className="p-8 mx-auto space-y-8 max-w-4xl">
			<EntitlementPlanHint />
			<ComposeDocumentsField />
			<ComposeRecipientsField />
		</main>
	);
}
