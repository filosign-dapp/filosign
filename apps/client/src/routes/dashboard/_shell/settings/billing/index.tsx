import { createFileRoute } from "@tanstack/react-router";
import { BillingSettingsPage } from "./-components/page";

export const Route = createFileRoute("/dashboard/_shell/settings/billing/")({
	component: BillingSettingsPage,
});
