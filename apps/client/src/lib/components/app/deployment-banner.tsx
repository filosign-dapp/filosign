import { deploymentBannerText } from "@/src/lib/deployment";

export function DeploymentBanner() {
	const message = deploymentBannerText();
	if (!message) return null;

	return (
		<div
			role="status"
			className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100"
		>
			{message}
		</div>
	);
}
