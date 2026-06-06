import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/src/env";
import { SupportCenterPanel } from "./-components/support-center-panel";

export const Route = createFileRoute("/dashboard/_shell/support/")({
	component: SupportCenterPage,
});

function SupportCenterPage() {
	const docsBase = env.VITE_ASTRO_URL.replace(/\/$/, "");

	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-10">
			<SupportCenterPanel docsCrossLinkUrl={`${docsBase}/docs`} />
		</div>
	);
}
