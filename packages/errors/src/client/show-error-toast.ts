import { toast } from "sonner";
import type { PresentedError } from "../types";

const MAX_HINT_CHARS = 90;

export type ShowErrorToastOptions = {
	/** When true, append devDetail below description */
	devMode?: boolean;
	/** In-app navigation for support URLs (e.g. dashboard SPA). Falls back to window.open. */
	onSupportClick?: (url: string) => void;
};

function toastHint(
	presented: PresentedError,
	devMode: boolean | undefined,
): string | undefined {
	const hint = presented.description?.trim();
	const devDetail =
		devMode && presented.devDetail?.trim()
			? `Details: ${presented.devDetail.trim()}`
			: undefined;

	if (hint && devDetail) {
		return `${hint.slice(0, MAX_HINT_CHARS)}${hint.length > MAX_HINT_CHARS ? "…" : ""}\n${devDetail}`;
	}
	if (devDetail) return devDetail;
	if (!hint) return undefined;
	if (hint.length <= MAX_HINT_CHARS) return hint;
	return `${hint.slice(0, MAX_HINT_CHARS)}…`;
}

export function showErrorToast(
	presented: PresentedError,
	options: ShowErrorToastOptions = {},
): void {
	const description = toastHint(presented, options.devMode);

	toast.error(presented.title, {
		id: presented.dedupeKey,
		...(description ? { description } : {}),
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
