import { jsonStringify } from "@filosign/crypto-utils";
import { type Hex, keccak256, stringToBytes } from "viem";
import { type DraftSnapshot, zDraftSnapshot } from "./draft-snapshot";

function sortKeysDeep(value: unknown): unknown {
	if (value === null || typeof value !== "object") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(sortKeysDeep);
	}
	const obj = value as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(obj).sort()) {
		sorted[key] = sortKeysDeep(obj[key]);
	}
	return sorted;
}

/** Canonical JSON for draft snapshot hashing — stable key order. */
export function canonicalDraftSnapshotJson(snapshot: DraftSnapshot): string {
	const parsed = zDraftSnapshot.parse(snapshot);
	return jsonStringify(sortKeysDeep(parsed) as DraftSnapshot);
}

export function digestDraftSnapshot(snapshot: DraftSnapshot): Hex {
	return keccak256(stringToBytes(canonicalDraftSnapshotJson(snapshot)));
}
