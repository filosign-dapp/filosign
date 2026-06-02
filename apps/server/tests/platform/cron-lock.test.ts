import { afterAll, describe, expect, mock, test } from "bun:test";
import {
	cronBucketForSchedule,
	cronLockKey,
	formatDayBucket,
	formatHourBucket,
	resolveScheduledFireMs,
	withCronLock,
} from "@/lib/platform/cron";
import { createMockRedis, mockSessionCacheRedis } from "../support/mock-redis";

const { client, store } = createMockRedis();
mockSessionCacheRedis(client);

afterAll(() => {
	mock.restore();
});

describe("cron bucket", () => {
	test("resolveScheduledFireMs aligns to last fire in the hour", () => {
		const now = new Date("2026-06-02T14:20:00Z").getTime();
		expect(
			new Date(resolveScheduledFireMs("15 * * * *", now)).toISOString(),
		).toBe("2026-06-02T14:15:00.000Z");
	});

	test("hour and day bucket formats", () => {
		const d = new Date("2026-06-02T14:15:00Z");
		expect(formatHourBucket(d)).toBe("2026-06-02-14");
		expect(formatDayBucket(d)).toBe("2026-06-02");
		expect(cronBucketForSchedule("0 0 * * *", "day", d.getTime())).toBe(
			"2026-06-02",
		);
	});
});

describe("withCronLock", () => {
	test("only one worker acquires the same bucket", async () => {
		store.clear();
		const bucket = `test-${Date.now()}`;
		let runs = 0;
		const first = await withCronLock({
			jobName: "expire-invites",
			bucket,
			ttlSec: 60,
			run: async () => {
				runs += 1;
			},
		});
		const second = await withCronLock({
			jobName: "expire-invites",
			bucket,
			ttlSec: 60,
			run: async () => {
				runs += 1;
			},
		});
		expect(first).toBe(true);
		expect(second).toBe(false);
		expect(runs).toBe(1);
		expect(cronLockKey("expire-invites", bucket)).toBe(
			`fs:lock:cron:expire-invites:${bucket}`,
		);
	});
});
