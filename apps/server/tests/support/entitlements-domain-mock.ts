import { mock } from "bun:test";
import {
	check,
	type EntitlementContext,
	type FeatureKey,
} from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import type * as EntitlementsDomain from "@/lib/domains/entitlements";
import { loadImplementation } from "./load-implementation";

/** Spread real domain exports; override only test-controlled entrypoints. */
export function mockEntitlementsDomain(overrides: {
	resolveEntitlementContext: (
		wallet: `0x${string}`,
		organizationId: string,
	) => Promise<EntitlementContext>;
}) {
	const entitlementExports = loadImplementation<typeof EntitlementsDomain>(
		"../../lib/domains/entitlements/entitlements.ts",
	);

	mock.module("@/lib/domains/entitlements", () => ({
		...entitlementExports,
		resolveEntitlementContext: overrides.resolveEntitlementContext,
		assertEntitlement: (ctx: EntitlementContext, key: FeatureKey) => {
			const decision = check(ctx, key);
			if (decision.allowed) return;
			throw throwAppError("ENTITLEMENT.FEATURE_DISABLED");
		},
	}));
}
