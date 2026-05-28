import { describe, expect, mock, test } from "bun:test";
import { createLoggerRuntime } from "../src/core";
import { createInMemoryDedupe } from "../src/dedupe";
import { isEnabledByBooleanEnv, parseBooleanEnv } from "../src/gates";
import type { LoggerEvent, LoggerTransport } from "../src/types";

const sampleEvent: LoggerEvent = {
	name: "test.event",
	severity: "error",
	message: "something failed",
};

const dedupeBaseEvent: LoggerEvent = {
	name: "server.http_500",
	severity: "critical",
	message: "HTTP request returned 5xx",
	context: { path: "/api/rpc" },
};

describe("parseBooleanEnv", () => {
	test("returns true only for literal true", () => {
		expect(parseBooleanEnv("true")).toBe(true);
		expect(parseBooleanEnv("TRUE")).toBe(true);
	});

	test("returns false for other values", () => {
		expect(parseBooleanEnv("false")).toBe(false);
		expect(parseBooleanEnv(undefined)).toBe(false);
		expect(parseBooleanEnv("")).toBe(false);
	});
});

describe("isEnabledByBooleanEnv", () => {
	test("matches parseBooleanEnv", () => {
		expect(isEnabledByBooleanEnv("true")).toBe(true);
		expect(isEnabledByBooleanEnv("false")).toBe(false);
	});
});

describe("createInMemoryDedupe", () => {
	test("allows first event and suppresses duplicate within window", () => {
		const dedupe = createInMemoryDedupe({ windowMs: 60_000 });
		expect(dedupe.shouldSend(dedupeBaseEvent)).toBe(true);
		expect(dedupe.shouldSend(dedupeBaseEvent)).toBe(false);
	});

	test("allows distinct events", () => {
		const dedupe = createInMemoryDedupe({ windowMs: 60_000 });
		expect(dedupe.shouldSend(dedupeBaseEvent)).toBe(true);
		expect(
			dedupe.shouldSend({
				...dedupeBaseEvent,
				name: "server.cron_job_failed",
			}),
		).toBe(true);
	});

	test("allows same event after window expires", () => {
		const dedupe = createInMemoryDedupe({ windowMs: 0 });
		expect(dedupe.shouldSend(dedupeBaseEvent)).toBe(true);
		expect(dedupe.shouldSend(dedupeBaseEvent)).toBe(true);
	});

	test("prunes expired entries to prevent memory leaks", () => {
		const dedupe = createInMemoryDedupe({ windowMs: 0 });
		expect(dedupe.shouldSend(dedupeBaseEvent)).toBe(true);
		expect(dedupe._getMapSize?.()).toBe(1);

		// Since windowMs is 0, any subsequent call should prune the expired entry
		expect(dedupe.shouldSend({ ...dedupeBaseEvent, message: "different" })).toBe(true);
		expect(dedupe._getMapSize?.()).toBe(1);
	});
});

describe("createLoggerRuntime", () => {
	test("fans out to all transports when shouldSend allows", async () => {
		const sends: LoggerEvent[] = [];
		const transport: LoggerTransport = {
			send(event) {
				sends.push(event);
			},
		};
		const runtime = createLoggerRuntime({ transports: [transport, transport] });
		await runtime.emit(sampleEvent);
		expect(sends).toHaveLength(2);
		expect(sends[0]).toEqual(sampleEvent);
	});

	test("skips transports when shouldSend returns false", async () => {
		const send = mock(() => {});
		const runtime = createLoggerRuntime({
			transports: [{ send }],
			shouldSend: () => false,
		});
		await runtime.emit(sampleEvent);
		expect(send).not.toHaveBeenCalled();
	});

	test("does not throw when a transport rejects", async () => {
		const runtime = createLoggerRuntime({
			transports: [
				{
					async send() {
						throw new Error("transport down");
					},
				},
				{
					send(event) {
						expect(event).toEqual(sampleEvent);
					},
				},
			],
		});
		await expect(runtime.emit(sampleEvent)).resolves.toBeUndefined();
	});
});
