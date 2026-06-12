import { describe, expect, test } from "bun:test";
import {
	billingWebhookJobId,
	indexerJobId,
	payoutJobId,
	postSignRoutingJobId,
} from "@/lib/platform/jobs";

describe("job idempotency keys", () => {
	test("stable payout and indexer job ids", () => {
		expect(payoutJobId("bafyabc")).toBe("payout__bafyabc");
		expect(postSignRoutingJobId("bafyabc")).toBe("routing__bafyabc");
		expect(indexerJobId("0xAbC")).toBe("indexer__0xabc");
		expect(billingWebhookJobId("wh_123")).toBe("billing__wh_123");
	});
});
