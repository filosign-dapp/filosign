import fs from "node:fs";
import path from "node:path";
import { collectReferencedInterfaceTypes } from "./collect-types";
import { processContractSubNodes } from "./process-subnodes";
import type { ContractDefinition } from "./types";
import { OUT_DIR, SPDX_HEADER } from "./types";

export function extractImmutableVariables(
	fileText: string,
): Map<string, { varName: string; type: string }> {
	const immutableVars = new Map<string, { varName: string; type: string }>();
	const lines = fileText.split("\n");

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.includes("public immutable")) {
			const match = trimmed.match(/(\w+)\s+public\s+immutable\s+(\w+);/);
			if (match) {
				const [, type, varName] = match;
				immutableVars.set(type, { varName, type });
			}
		}
	}

	return immutableVars;
}

export function generateInterfaceForContract(
	contractNode: ContractDefinition,
	pragma: string | null,
	srcFilePath: string,
	sourceText: string,
) {
	const name = contractNode.name;
	const ifaceName = `I${name}`;
	const outFilename = path.join(OUT_DIR, `I${name}.sol`);

	const immutableVars = extractImmutableVariables(sourceText);
	const referencedTypes = collectReferencedInterfaceTypes(contractNode);

	const lines: string[] = [];
	lines.push(SPDX_HEADER);
	if (pragma) lines.push(pragma);
	lines.push("");

	const rel = path.relative(process.cwd(), srcFilePath);
	lines.push(
		`// Auto-generated from ${rel} - DO NOT EDIT (regenerate with the script only)`,
	);
	lines.push("");

	for (const t of referencedTypes) {
		if (t === ifaceName) continue;
		lines.push(`import "./${t}.sol";`);
	}
	if (referencedTypes.size > 0) lines.push("");

	lines.push(`interface ${ifaceName} {`);
	lines.push(...processContractSubNodes(contractNode, immutableVars));
	lines.push("}");
	lines.push("");

	fs.writeFileSync(outFilename, lines.join("\n"), { encoding: "utf8" });
	console.log(`Wrote ${path.relative(process.cwd(), outFilename)}`);
}
