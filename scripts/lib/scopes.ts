/** Workspace package short names for Turbo `--filter`. */

export const PACKAGE_SCOPES = {
	client: "@filosign/client",
	server: "@filosign/server",
	astro: "@filosign/astro",
	shared: "@filosign/shared",
	"crypto-utils": "@filosign/crypto-utils",
	crypto: "@filosign/crypto-utils",
	react: "@filosign/react",
	"react-sdk": "@filosign/react",
	contracts: "@filosign/contracts",
	emails: "@filosign/emails",
	entitlements: "@filosign/entitlements",
	errors: "@filosign/errors",
} as const;

export type PackageScopeName = keyof typeof PACKAGE_SCOPES;

export const ALL_PACKAGES_FILTER = "@filosign/*";

export function resolvePackageScope(name: string): string | undefined {
	if (name in PACKAGE_SCOPES) return PACKAGE_SCOPES[name as PackageScopeName];
	return undefined;
}

/** One package filter, or all. Supports `--server` and positional `server`. */
export function parsePackageFilter(
	argv: string[],
	die: (message: string) => never,
): string {
	let pkg: string | undefined;

	for (const arg of argv) {
		if (arg.startsWith("--")) {
			const key = arg.slice(2);
			if (key === "help" || key === "h") continue;
			const resolved = resolvePackageScope(key);
			if (!resolved) continue;
			if (pkg) die("Pass only one package scope");
			pkg = resolved;
			continue;
		}

		const resolved = resolvePackageScope(arg);
		if (resolved) {
			if (pkg) die("Pass only one package scope");
			pkg = resolved;
		}
	}

	return pkg ?? ALL_PACKAGES_FILTER;
}
