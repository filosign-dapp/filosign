export type PayoutAccessRequestIntent = "open" | "admin_required";

export function payoutAccessRequestIntent(
	canManage: boolean,
): PayoutAccessRequestIntent {
	return canManage ? "open" : "admin_required";
}
