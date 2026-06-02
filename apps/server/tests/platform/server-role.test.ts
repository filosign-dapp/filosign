import { describe, expect, mock, test } from "bun:test";
import type { ServerRole } from "@/lib/platform/server-role";
import { testEnvStub } from "@/tests/support/env-stub";

const envState = { ...testEnvStub, SERVER_ROLE: "all" as ServerRole };

mock.module("@/env", () => ({
	default: envState,
	env: envState,
}));

const { assertWorkerRole, getServerRole, runsHttpServer, runsWorkerTasks } =
	await import("@/lib/platform/server-role");

describe("server role gates", () => {
	test("default stub is all-in-one", () => {
		expect(getServerRole()).toBe("all");
		expect(runsHttpServer()).toBe(true);
		expect(runsWorkerTasks()).toBe(true);
		expect(() => assertWorkerRole()).not.toThrow();
	});

	test("api role is HTTP-only", () => {
		envState.SERVER_ROLE = "api";
		expect(runsHttpServer()).toBe(true);
		expect(runsWorkerTasks()).toBe(false);
	});

	test("worker role is background-only", () => {
		envState.SERVER_ROLE = "worker";
		expect(runsHttpServer()).toBe(false);
		expect(runsWorkerTasks()).toBe(true);
	});
});
