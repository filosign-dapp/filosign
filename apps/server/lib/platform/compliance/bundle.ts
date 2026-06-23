import {
	canonicalComplianceBundleJson,
	zComplianceBundle,
} from "@filosign/shared";
import type db from "@/lib/platform/db";
import { assembleComplianceBundle } from "./assemble";
import { sha256HexUtf8 } from "./hash";
import { loadComplianceContext } from "./load-context";
import type { ParticipantRow } from "./types";

export type { ParticipantRow } from "./types";

export async function buildComplianceBundleAndHash(args: {
	db: typeof db;
	pieceCid: string;
	participantRows: ParticipantRow[];
}): Promise<{
	bundle: import("@filosign/shared").ComplianceBundle;
	bundleHash: `0x${string}`;
	bundleCanonicalJson: string;
}> {
	const ctx = await loadComplianceContext(args);
	const raw = await assembleComplianceBundle(ctx);
	const bundle = zComplianceBundle.parse(raw);
	const bundleCanonicalJson = canonicalComplianceBundleJson(bundle);
	const bundleHash = sha256HexUtf8(bundleCanonicalJson);
	return { bundle, bundleHash, bundleCanonicalJson };
}
