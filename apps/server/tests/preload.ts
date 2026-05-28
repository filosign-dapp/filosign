/**
 * Runs before any test file (see `bunfig.toml`). Prevents real `@/env` validation
 * when production modules are pulled in transitively (e.g. draft-save-log → pino).
 */
import { mock } from "bun:test";
import { testEnvStub } from "./support/env-stub";

mock.module("@/env", () => ({
	default: testEnvStub,
}));
