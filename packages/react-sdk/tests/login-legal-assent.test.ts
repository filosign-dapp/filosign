import { describe, expect, test } from "bun:test";
import type { FilosignContracts } from "@filosign/evm";
import { activeLegalAssent } from "@filosign/shared";
import type { QueryClient } from "@tanstack/react-query";
import { type LoginDeps, performLogin } from "../src/lib/login/login";

const walletAddress = "0x1111111111111111111111111111111111111111" as const;

function makeDeps(overrides: Partial<LoginDeps> = {}): LoginDeps {
	return {
		contracts: {} as FilosignContracts,
		wallet: {
			account: { address: walletAddress },
		} as unknown as LoginDeps["wallet"],
		wasm: { dilithium: {} as LoginDeps["wasm"]["dilithium"] },
		rpcQuery: {
			users: {
				register: { call: async () => ({}) },
			},
		} as unknown as LoginDeps["rpcQuery"],
		queryClient: {} as QueryClient,
		isRegistered: false,
		isCryptoUnlocked: false,
		storedKeygenData: undefined,
		invalidateAuthQueries: async () => {},
		invalidateSessionQueries: async () => {},
		invalidateUserProfile: () => {},
		...overrides,
	};
}

describe("performLogin legal assent", () => {
	test("rejects registration without explicit legal assent", async () => {
		const deps = makeDeps();
		await expect(performLogin(deps, { idToken: "token" })).rejects.toThrow(
			"Terms acceptance required before registration",
		);
	});

	test("rejects stale legal assent before registration crypto work", async () => {
		const deps = makeDeps();
		const assent = activeLegalAssent();
		await expect(
			performLogin(deps, {
				idToken: "token",
				legalAssent: {
					...assent,
					termsVersion: "2020-01-01",
				},
			}),
		).rejects.toThrow("Terms acceptance required before registration");
	});
});
