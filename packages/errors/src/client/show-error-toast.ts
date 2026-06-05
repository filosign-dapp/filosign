import { toast } from "sonner";
import type { PresentedError } from "../types";

export type ShowErrorToastOptions = {
	/** When true, append devDetail below description */
	devMode?: boolean;
	/** In-app navigation for support URLs (e.g. dashboard SPA). Falls back to window.open. */
	onSupportClick?: (url: string) => void;
};

export function showErrorToast(
	presented: PresentedError,
	options: ShowErrorToastOptions = {},
): void {
	const lines = [presented.description];
	if (presented.steps.length > 0) {
		lines.push(presented.steps[0] ?? "");
	}
	if (options.devMode && presented.devDetail) {
		lines.push(`Details: ${presented.devDetail}`);
	}

	const description = lines.filter(Boolean).join("\n");

	toast.error(presented.title, {
		id: presented.dedupeKey,
		description,
		duration: 8000,
		action: presented.supportUrl
			? {
					label: "Help",
					onClick: () => {
						const url = presented.supportUrl;
						if (!url) return;
						if (options.onSupportClick) {
							options.onSupportClick(url);
							return;
						}
						window.open(url, "_blank", "noopener,noreferrer");
					},
				}
			: undefined,
	});
}
