import { useEntitlements } from "@filosign/react/billing";

export function EntitlementPlanHint() {
	const { data } = useEntitlements();
	if (!data) return null;

	const docs = data.limits["documents.sent.monthly"];
	const recipients = data.limits["envelope.recipients.max"];

	return (
		<p className="text-muted-foreground text-sm">
			Plan: <span className="font-medium text-foreground">{data.planId}</span>
			{" · "}
			Documents this month: {docs.used ?? 0}
			{typeof docs.limit === "number" ? ` / ${docs.limit}` : ""}
			{" · "}
			Max recipients per send:{" "}
			{typeof recipients.limit === "number" ? recipients.limit : "—"}
		</p>
	);
}
