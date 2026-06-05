export const SUPPORT_BASE_PATH = "/dashboard/support";

type NavigateFn = (opts: { to: string }) => void | Promise<void>;

let navigateFn: NavigateFn | null = null;

export function setSupportNavigateHandler(fn: NavigateFn | null): void {
	navigateFn = fn;
}

export function parseSupportUrl(url: string): {
	pathname: string;
	hash: string;
} {
	try {
		const parsed = new URL(url, window.location.origin);
		return {
			pathname: parsed.pathname,
			hash: parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash,
		};
	} catch {
		const hashIndex = url.indexOf("#");
		if (hashIndex === -1) {
			return { pathname: url, hash: "" };
		}
		return {
			pathname: url.slice(0, hashIndex),
			hash: url.slice(hashIndex + 1),
		};
	}
}

export function navigateToSupportUrl(url: string): void {
	const { pathname, hash } = parseSupportUrl(url);
	const isDashboardPath =
		pathname === SUPPORT_BASE_PATH ||
		pathname === `${SUPPORT_BASE_PATH}/` ||
		pathname.startsWith(`${SUPPORT_BASE_PATH}/`);

	if (navigateFn && isDashboardPath) {
		void navigateFn({ to: SUPPORT_BASE_PATH });
		if (hash) {
			requestAnimationFrame(() => {
				window.location.hash = hash;
			});
		}
		return;
	}

	if (url.startsWith("/")) {
		window.location.assign(url);
		return;
	}

	window.open(url, "_blank", "noopener,noreferrer");
}
