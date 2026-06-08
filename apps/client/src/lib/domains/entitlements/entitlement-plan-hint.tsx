import { useEntitlements } from "@filosign/react/billing";

export function EntitlementPlanHint() {
	const { data } = useEntitlements();
	if (!data) return null;

	const docs = data.limits["documents.sent.monthly"];

	const docsLabel =
		data.planId === "free" ? "Documents sent" : "Documents this month";

	return (
		<p className="text-muted-foreground text-sm text-end">
			{docsLabel}: {docs.used ?? 0}
			{typeof docs.limit === "number" ? ` / ${docs.limit}` : ""}
		</p>
	);
}
