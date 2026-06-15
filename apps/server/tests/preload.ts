/**
 * Runs before any test file (see `bunfig.toml`). Prevents real `@/env` validation
 * when production modules are pulled in transitively (e.g. draft-save-log → pino).
 * Per-test `mock.module` patterns: see repo TESTING.md.
 */
import { mock } from "bun:test";
import { testEnvStub } from "./support/env-stub";
import { posthogCaptures } from "./support/posthog-capture";

mock.module("@/env", () => ({
	default: testEnvStub,
}));

mock.module("posthog-node", () => ({
	PostHog: class {
		capture(payload: Record<string, unknown>) {
			posthogCaptures.push(payload);
		}
		async shutdown() {}
	},
}));
