import { createHash } from "node:crypto";
import { zAbiJson } from "../../../definitions/schema.js";
import { abiStorePath } from "./paths.js";

export function normalizeAbiJson(abi: unknown): string {
	return JSON.stringify(abi);
}

export function abiRefFromAbi(abi: unknown): string {
	const normalized = normalizeAbiJson(abi);
	return createHash("sha256").update(normalized).digest("hex");
}

export async function writeAbiToStore(abi: unknown): Promise<string> {
	const parsed = zAbiJson.safeParse(abi);
	if (!parsed.success) {
		throw new Error("ABI must be a JSON array");
	}
	const abiRef = abiRefFromAbi(parsed.data);
	const path = abiStorePath(abiRef);
	const file = Bun.file(path);
	if (!(await file.exists())) {
		await Bun.write(path, `${JSON.stringify(parsed.data, null, 2)}\n`);
	}
	return abiRef;
}

export async function readAbiFromStore(abiRef: string): Promise<unknown> {
	const path = abiStorePath(abiRef);
	const file = Bun.file(path);
	if (!(await file.exists())) {
		throw new Error(`ABI store miss: ${abiRef}`);
	}
	const abi = await file.json();
	const parsed = zAbiJson.safeParse(abi);
	if (!parsed.success) {
		throw new Error(`Corrupt ABI store file: ${abiRef}`);
	}
	const expected = abiRefFromAbi(parsed.data);
	if (expected !== abiRef.toLowerCase()) {
		throw new Error(`ABI store hash mismatch for ${abiRef}`);
	}
	return parsed.data;
}
