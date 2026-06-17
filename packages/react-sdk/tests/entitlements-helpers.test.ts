import { describe, expect, it } from "bun:test";
import type { EntitlementsSnapshot } from "../src/hooks/billing/useEntitlements";
import {
	canUseDraftComments,
	canUseSharedTemplates,
	canUseTeamCollaboration,
	canUseTeamDrafts,
	canUseWorkspaceTreasury,
} from "../src/lib/entitlements";

function entitlements(
	features: Partial<Record<string, boolean>>,
): EntitlementsSnapshot {
	return {
		planId: "teams",
		features: Object.fromEntries(
			Object.entries(features).map(([key, enabled]) => [
				key,
				{ enabled: enabled ?? false },
			]),
		),
	} as unknown as EntitlementsSnapshot;
}

describe("entitlement helpers", () => {
	it("canUseDraftComments reflects catalog flag", () => {
		expect(
			canUseDraftComments(entitlements({ "features.draft_comments": true })),
		).toBe(true);
		expect(
			canUseDraftComments(entitlements({ "features.draft_comments": false })),
		).toBe(false);
		expect(canUseDraftComments(undefined)).toBe(false);
	});

	it("canUseTeamDrafts reflects catalog flag", () => {
		expect(
			canUseTeamDrafts(entitlements({ "features.team_drafts": true })),
		).toBe(true);
		expect(
			canUseTeamDrafts(entitlements({ "features.team_drafts": false })),
		).toBe(false);
		expect(canUseTeamDrafts(undefined)).toBe(false);
	});

	it("canUseSharedTemplates reflects catalog flag", () => {
		expect(
			canUseSharedTemplates(
				entitlements({ "features.shared_templates": true }),
			),
		).toBe(true);
		expect(
			canUseSharedTemplates(
				entitlements({ "features.shared_templates": false }),
			),
		).toBe(false);
	});

	it("canUseTeamCollaboration reflects team visibility flag", () => {
		expect(
			canUseTeamCollaboration(
				entitlements({ "features.envelope.team_visibility": true }),
			),
		).toBe(true);
		expect(
			canUseTeamCollaboration(
				entitlements({ "features.envelope.team_visibility": false }),
			),
		).toBe(false);
		expect(canUseTeamCollaboration(undefined)).toBe(false);
	});

	it("canUseWorkspaceTreasury reflects custom treasury flag", () => {
		expect(
			canUseWorkspaceTreasury(
				entitlements({ "features.treasury.workspace_custom": true }),
			),
		).toBe(true);
		expect(
			canUseWorkspaceTreasury(
				entitlements({ "features.treasury.workspace_custom": false }),
			),
		).toBe(false);
		expect(canUseWorkspaceTreasury(undefined)).toBe(false);
	});
});
