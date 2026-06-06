#!/usr/bin/env bun
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();

const TARGET_DIRS = [
	join(rootDir, "apps/server/lib/domains"),
	join(rootDir, "apps/server/api/handlers"),
];

const ALLOWED_FILES = [
	"zodHttp.ts", // Contains the validation helper throwZodBadRequest
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

let errorCount = 0;

for (const dir of TARGET_DIRS) {
	const files = getFiles(dir);
	for (const file of files) {
		const content = readFileSync(file, "utf8");
		const lines = content.split("\n");
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();
			// Look for new ORPCError, excluding comments and lines with suppression comments
			if (
				trimmed.includes("new ORPCError") &&
				!trimmed.startsWith("//") &&
				!trimmed.startsWith("*") &&
				!trimmed.startsWith("/*")
			) {
				if (
					!trimmed.includes("error-audit-disable") &&
					!trimmed.includes("error-audit-allow")
				) {
					const relativePath = file.replace(`${rootDir}/`, "");
					console.error(
						`Error: Direct 'new ORPCError' found at ${relativePath}:${i + 1}`,
					);
					console.error(`  > ${trimmed}`);
					errorCount++;
				}
			}
		}
	}
}

const isStrict = process.argv.includes("--strict");

if (errorCount > 0) {
	console.error(`\nFound ${errorCount} unapproved direct ORPCError throw(s).`);
	if (isStrict) {
		process.exit(1);
	} else {
		console.log("Warning-only mode: Proceeding with exit code 0.");
		process.exit(0);
	}
}
