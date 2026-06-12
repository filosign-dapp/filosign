import { describe, expect, it, mock } from "bun:test";
import { LOGIN_RECOVERY_PHRASE_REQUIRED } from "@filosign/react/auth";
import {
	attemptWalletLoginUnlock,
	formatWalletUnlockError,
} from "../../src/lib/auth/unlock-session";

describe("attemptWalletLoginUnlock", () => {
	it("returns success when login succeeds", async () => {
		const login = {
			mutateAsync: mock(async () => undefined),
		};

		await expect(attemptWalletLoginUnlock({ login })).resolves.toBe("success");
	});

	it("returns recovery_required only for LOGIN_RECOVERY_PHRASE_REQUIRED", async () => {
		const login = {
			mutateAsync: mock(async () => {
				throw new Error(LOGIN_RECOVERY_PHRASE_REQUIRED);
			}),
		};

		await expect(attemptWalletLoginUnlock({ login })).resolves.toBe(
			"recovery_required",
		);
	});

	it("returns failed for transient errors without recovery", async () => {
		const login = {
			mutateAsync: mock(async () => {
				throw new Error("network");
			}),
		};

		const outcome = await attemptWalletLoginUnlock({ login });
		expect(outcome).toEqual({
			failed: "Network error while unlocking. Try again.",
			isCancelled: false,
		});
	});

	it("identifies user cancellation errors", async () => {
		const login = {
			mutateAsync: mock(async () => {
				throw new Error("User rejected the request");
			}),
		};

		const outcome = await attemptWalletLoginUnlock({ login });
		expect(outcome).toEqual({
			failed: "Unlock cancelled. Confirm in your wallet to continue.",
			isCancelled: true,
		});
	});
});

describe("formatWalletUnlockError", () => {
	it("maps user rejection to a friendly message", () => {
		expect(
			formatWalletUnlockError(new Error("User rejected the request")),
		).toBe("Unlock cancelled. Confirm in your wallet to continue.");
	});
});
