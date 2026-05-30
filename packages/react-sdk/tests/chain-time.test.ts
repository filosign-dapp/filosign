import { describe, expect, test } from "bun:test";
import { latestChainTimestamp } from "../src/lib/chain-time";

describe("latestChainTimestamp", () => {
	test("throws when contracts client has no chain (no wall-clock fallback)", async () => {
		await expect(
			latestChainTimestamp({
				$client: { chain: undefined },
			} as never),
		).rejects.toThrow(/Chain config missing/);
	});
});
