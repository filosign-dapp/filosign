const RETURN_TO_KEY = "filosign:returnTo";

export function stashReturnTo(): void {
	if (typeof window === "undefined") return;
	const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
	if (!target.startsWith("/dashboard")) return;
	sessionStorage.setItem(RETURN_TO_KEY, target);
}

export function consumeReturnTo(): string | null {
	if (typeof window === "undefined") return null;
	const value = sessionStorage.getItem(RETURN_TO_KEY);
	if (value) sessionStorage.removeItem(RETURN_TO_KEY);
	return value;
}

type NavigateFn = (opts: {
	to: string;
	search?: Record<string, string>;
}) => void;

export function navigateToReturnTo(navigate: NavigateFn): boolean {
	const stored = consumeReturnTo();
	if (!stored?.startsWith("/dashboard")) return false;

	const hashIndex = stored.indexOf("#");
	const withoutHash = hashIndex === -1 ? stored : stored.slice(0, hashIndex);
	const hash = hashIndex === -1 ? "" : stored.slice(hashIndex + 1);

	const qIndex = withoutHash.indexOf("?");
	const pathname = qIndex === -1 ? withoutHash : withoutHash.slice(0, qIndex);
	const searchStr = qIndex === -1 ? "" : withoutHash.slice(qIndex + 1);
	const search = Object.fromEntries(new URLSearchParams(searchStr));

	navigate({ to: pathname, ...(Object.keys(search).length ? { search } : {}) });

	if (hash) {
		requestAnimationFrame(() => {
			window.location.hash = hash;
		});
	}

	return true;
}
