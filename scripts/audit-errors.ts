#!/usr/bin/env bun
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const rootDir = process.cwd();

const TARGET_DIRS = [
	join(rootDir, "apps/server/lib/domains"),
	join(rootDir, "apps/server/api/handlers"),
];

const ALLOWED_FILES = [
	"zodHttp.ts", // Contains the validation helper throwZodBadRequest
];

/** Background / webhook paths may use plain Error (not surfaced via oRPC). */
const THROW_NEW_ERROR_ALLOWLIST = [
	"apps/server/lib/domains/billing/utils/webhooks/",
	"apps/server/lib/domains/foc/",
	"apps/server/lib/domains/archival/jobs/",
];

function getFiles(dir: string): string[] {
	const results: string[] = [];
	try {
		const list = readdirSync(dir);
		for (const file of list) {
			const fullPath = join(dir, file);
			const stat = statSync(fullPath);
			if (stat.isDirectory()) {
				results.push(...getFiles(fullPath));
			} else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
				if (!ALLOWED_FILES.some((allowed) => fullPath.endsWith(allowed))) {
					results.push(fullPath);
				}
			}
		}
	} catch (_err) {
		console.warn(`Warning: Could not read directory ${dir}`);
	}
	return results;
}

function isCommentLine(trimmed: string): boolean {
	return (
		trimmed.startsWith("//") ||
		trimmed.startsWith("*") ||
		trimmed.startsWith("/*")
	);
}

function isThrowNewErrorAllowed(relativePath: string): boolean {
	return THROW_NEW_ERROR_ALLOWLIST.some((prefix) =>
		relativePath.startsWith(prefix),
	);
}

let errorCount = 0;

for (const dir of TARGET_DIRS) {
	const files = getFiles(dir);
	for (const file of files) {
		const content = readFileSync(file, "utf8");
		const lines = content.split("\n");
		const relativePath = relative(rootDir, file);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();
			if (isCommentLine(trimmed)) continue;

			if (trimmed.includes("new ORPCError")) {
				if (
					!trimmed.includes("error-audit-disable") &&
					!trimmed.includes("error-audit-allow")
				) {
					console.error(
						`Error: Direct 'new ORPCError' found at ${relativePath}:${i + 1}`,
					);
					console.error(`  > ${trimmed}`);
					errorCount++;
				}
			}

			if (
				trimmed.includes("throw new Error") &&
				!isThrowNewErrorAllowed(relativePath)
			) {
				console.error(
					`Error: 'throw new Error' found at ${relativePath}:${i + 1} — use throwAppError()`,
				);
				console.error(`  > ${trimmed}`);
				errorCount++;
			}

			if (
				trimmed.includes('ORPCError("INTERNAL_SERVER_ERROR"') &&
				!trimmed.includes("error-audit-allow") &&
				!trimmed.includes("error-audit-disable")
			) {
				console.error(
					`Error: Untagged INTERNAL_SERVER_ERROR at ${relativePath}:${i + 1} — use throwAppError() or add error-audit-allow`,
				);
				console.error(`  > ${trimmed}`);
				errorCount++;
			}
		}
	}
}

const isStrict = process.argv.includes("--strict");

if (errorCount > 0) {
	console.error(`\nFound ${errorCount} error catalog violation(s).`);
	if (isStrict) {
		process.exit(1);
	} else {
		console.log("Warning-only mode: Proceeding with exit code 0.");
		process.exit(0);
	}
}
