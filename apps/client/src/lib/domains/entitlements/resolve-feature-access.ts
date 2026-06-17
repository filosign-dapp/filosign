export type FeatureAccessState = "full" | "teaser" | "hidden";

export function resolveFeatureAccess(args: {
	enabled: boolean;
	hidden?: boolean;
}): FeatureAccessState {
	if (args.hidden) return "hidden";
	if (args.enabled) return "full";
	return "teaser";
}
