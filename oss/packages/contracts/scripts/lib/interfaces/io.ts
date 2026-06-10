import fs from "node:fs";
import path from "node:path";
import parser from "@solidity-parser/parser";
import type { ASTNode } from "@solidity-parser/parser/dist/src/ast-types";
import { glob } from "glob";
import { generateInterfaceForContract } from "./generate";
import type { ContractDefinition, PragmaDirective } from "./types";
import { OUT_DIR, PRESERVED_INTERFACES, SRC_DIR } from "./types";

export function prepareOutDir() {
	if (fs.existsSync(OUT_DIR)) {
		const files = fs.readdirSync(OUT_DIR);
		for (const file of files) {
			if (PRESERVED_INTERFACES.has(file)) continue;
			const filePath = path.join(OUT_DIR, file);
			if (fs.statSync(filePath).isFile()) {
				fs.unlinkSync(filePath);
			}
		}
	} else {
		fs.mkdirSync(OUT_DIR, { recursive: true });
	}
}

export function extractPragmaAndVersion(fileText: string) {
	try {
		const ast = parser.parse(fileText, { tolerant: true });
		let pragma = "";
		parser.visit(ast, {
			PragmaDirective(node: PragmaDirective) {
				if (!pragma && node.name === "solidity") {
					pragma = `pragma solidity ${node.value};`;
				}
			},
		});
		return pragma;
	} catch (_) {
		return "";
	}
}

export function processFile(filePath: string) {
	const text = fs.readFileSync(filePath, "utf8");
	const pragma = extractPragmaAndVersion(text);
	let ast: ASTNode;
	try {
		ast = parser.parse(text, { tolerant: true, loc: false, range: false });
	} catch (err) {
		console.error(`Failed to parse ${filePath}:`, err);
		return;
	}

	parser.visit(ast, {
		ContractDefinition(node: ContractDefinition) {
			if (node.kind === "contract") {
				generateInterfaceForContract(node, pragma, filePath, text);
			}
		},
	});
}

export function runInterfaceGeneration() {
	prepareOutDir();
	const pattern = path.join(SRC_DIR, "**/*.sol");
	const files = glob.sync(pattern, {
		nodir: true,
		ignore: [path.join(OUT_DIR, "**/*"), path.join(SRC_DIR, "mocks/**/*")],
	});

	if (files.length === 0) {
		console.log("No solidity files found under src/");
		return;
	}

	for (const f of files) {
		processFile(f);
	}
	console.log("Done.");
}
