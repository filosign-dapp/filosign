import { describe, expect, test } from "bun:test";
import {
	deriveSettlementAllowanceChangeStep,
	settlementAllowanceChangeSummary,
} from "@/src/lib/domains/settlements/utils/allowance";
import {
	buildSettlementCancelProgressPlan,
	buildSettlementUpdateProgressPlan,
	createInitialSettlementChangeProgressState,
	markSettlementChangeProgressSuccess,
	reduceSettlementChangeProgress,
} from "@/src/lib/domains/settlements/utils/change-progress";

describe("settlement change progress plans", () => {
	test("update plan includes approve steps when allowance increases", () => {
		const steps = buildSettlementUpdateProgressPlan("increase");
		expect(steps.map((step) => step.id)).toEqual([
			"approve",
			"approve_confirm",
			"update",
			"update_confirm",
		]);
	});

	test("update plan includes trim sync when allowance decreases", () => {
		const steps = buildSettlementUpdateProgressPlan("trim");
		expect(steps.map((step) => step.id)).toEqual([
			"update",
			"update_confirm",
			"sync_approval",
			"sync_approval_confirm",
		]);
	});

	test("cancel plan always syncs approval after removal", () => {
		const steps = buildSettlementCancelProgressPlan();
		expect(steps.map((step) => step.id)).toEqual([
			"cancel",
			"cancel_confirm",
			"sync_approval",
			"sync_approval_confirm",
		]);
	});
});

describe("settlement change progress reducer", () => {
	test("advances through approve and update phases", () => {
		const plan = buildSettlementUpdateProgressPlan("increase");
		let state = createInitialSettlementChangeProgressState(plan);

		state = reduceSettlementChangeProgress(state, {
			phase: "approve",
			status: "start",
		});
		expect(state.activeStepId).toBe("approve");

		state = reduceSettlementChangeProgress(state, {
			phase: "approve",
			status: "confirming",
		});
		expect(state.activeStepId).toBe("approve_confirm");

		state = reduceSettlementChangeProgress(state, {
			phase: "approve",
			status: "done",
		});
		expect(state.completedStepIds).toContain("approve");

		state = reduceSettlementChangeProgress(state, {
			phase: "update",
			status: "start",
		});
		expect(state.activeStepId).toBe("update");

		state = markSettlementChangeProgressSuccess(state);
		expect(state.status).toBe("success");
	});
});

describe("settlement allowance change step", () => {
	test("deriveSettlementAllowanceChangeStep classifies increase, trim, and none", () => {
		expect(deriveSettlementAllowanceChangeStep(null, 100n)).toBe("unknown");
		expect(deriveSettlementAllowanceChangeStep(50n, 100n)).toBe("increase");
		expect(deriveSettlementAllowanceChangeStep(150n, 100n)).toBe("trim");
		expect(deriveSettlementAllowanceChangeStep(100n, 100n)).toBe("none");
	});

	test("settlementAllowanceChangeSummary matches change step", () => {
		expect(settlementAllowanceChangeSummary("increase")).toContain("approve");
		expect(settlementAllowanceChangeSummary("trim")).toContain("lower");
		expect(settlementAllowanceChangeSummary("none")).toContain("update");
	});
});
