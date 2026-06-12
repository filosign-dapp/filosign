import { describe, expect, it } from "bun:test";
import {
	canAttemptWalletLogin,
	type SessionGateFlags,
} from "../../src/lib/auth/session-state";

function baseFlags(
	overrides: Partial<SessionGateFlags> = {},
): SessionGateFlags {
	return {
		ready: true,
		authenticated: true,
		hasWalletClient: true,
		isRegistered: true,
		isRegisteredPending: false,
		isApiSessionActive: true,
		isApiSessionPending: false,
		isApiSessionError: false,
		isCryptoUnlocked: false,
		isCryptoUnlockedPending: false,
		hasStoredKeygenData: true,
		isKeyRegistrySnapshotPending: false,
		...overrides,
	};
}

describe("canAttemptWalletLogin", () => {
	it("is false when key registry snapshot has no stored keygen data", () => {
		expect(
			canAttemptWalletLogin(
				baseFlags({
					hasStoredKeygenData: false,
				}),
			),
		).toBe(false);
	});

	it("is false while key registry snapshot is pending", () => {
		expect(
			canAttemptWalletLogin(
				baseFlags({
					isKeyRegistrySnapshotPending: true,
				}),
			),
		).toBe(false);
	});

	it("is true when wallet session is ready and crypto is not unlocked", () => {
		expect(canAttemptWalletLogin(baseFlags())).toBe(true);
	});

	it("is false when crypto is already unlocked", () => {
		expect(
			canAttemptWalletLogin(
				baseFlags({
					isCryptoUnlocked: true,
				}),
			),
		).toBe(false);
	});
});
