import path from "node:path";

/** Workspace package name → directory under repo root (for `bun run --cwd`). */
export const PACKAGE_DIRS: Record<string, string> = {
	"@filosign/client": "apps/client",
	"@filosign/server": "apps/server",
	"@filosign/astro": "apps/astro",
	"@filosign/contracts": "oss/packages/contracts",
	"@filosign/evm": "packages/evm",
	"@filosign/crypto-utils": "packages/crypto-utils",
	"@filosign/react": "packages/react-sdk",
	"@filosign/shared": "packages/shared",
	"@filosign/emails": "packages/emails",
	"@filosign/entitlements": "packages/entitlements",
	test: "packages/test",
};

export function packageRunCmd(
	rootDir: string,
	packageName: string,
	script: string,
): string[] {
	const rel = PACKAGE_DIRS[packageName];
	if (!rel) {
		throw new Error(`Unknown workspace package: ${packageName}`);
	}
	return ["bun", "run", "--cwd", path.join(rootDir, rel), script];
}

export function rootRunCmd(script: string): string[] {
	return ["bun", "run", script];
}
