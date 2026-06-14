import type { FeedbackFeatureArea } from "@filosign/shared";

export function feedbackFeatureAreaFromPath(
	pathname: string,
): FeedbackFeatureArea {
	if (pathname.includes("/envelope")) return "send";
	if (pathname.includes("/document/sign")) return "sign";
	if (pathname.includes("/settlements") || pathname.includes("settlement")) {
		return "payouts";
	}
	if (pathname.includes("proof") || pathname.includes("/export")) {
		return "exports";
	}
	if (
		pathname.includes("/templates") ||
		pathname.includes("/settings/workspace")
	) {
		return "workspace";
	}
	return "other";
}

export function isDashboardShellRoute(pathname: string): boolean {
	if (pathname.startsWith("/dashboard/document/sign")) return false;
	if (pathname.startsWith("/dashboard/envelope/create")) return false;
	if (pathname.startsWith("/dashboard/signature/create")) return false;
	return pathname.startsWith("/dashboard/");
}
