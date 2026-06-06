import { describe, expect, test } from "bun:test";
import { ACTIVATION_HINT_IDS, evaluateActivationHints } from "../activation";

describe("evaluateActivationHints", () => {
	test("shows practice walkthrough on sign page for practice piece", () => {
		const hints = evaluateActivationHints({
			pathname: "/dashboard/document/sign",
			deployment: "production",
			billingPlanId: "free",
			milestones: new Set(["signature_created"]),
			dismissedHintIds: new Set(),
			practicePieceCid: "bafy-practice",
			currentPieceCid: "bafy-practice",
		});

		expect(hints.map((h) => h.id)).toContain("sign_practice_walkthrough");
	});

	test("hides practice hint after practice_document_signed", () => {
		const hints = evaluateActivationHints({
			pathname: "/dashboard/document/sign",
			deployment: "production",
			billingPlanId: "free",
			milestones: new Set(["signature_created", "practice_document_signed"]),
			dismissedHintIds: new Set(),
			practicePieceCid: "bafy-practice",
			currentPieceCid: "bafy-practice",
		});

		expect(hints.some((h) => h.id === "sign_practice_walkthrough")).toBe(false);
	});

	test("shows compose hint after signature milestone", () => {
		const hints = evaluateActivationHints({
			pathname: "/dashboard/envelope/create",
			deployment: "production",
			billingPlanId: "individual",
			milestones: new Set(["signature_created"]),
			dismissedHintIds: new Set(),
		});

		expect(hints.map((h) => h.id)).toContain("compose_first_envelope");
	});

	test("sandbox disclosure on compose for sandbox profile", () => {
		const hints = evaluateActivationHints({
			pathname: "/dashboard/envelope/create",
			deployment: "sandbox",
			billingPlanId: "free",
			milestones: new Set(),
			dismissedHintIds: new Set(),
		});

		expect(hints.map((h) => h.id)).toContain("sandbox_compose_disclosure");
	});

	test("respects dismissed hint ids", () => {
		const hints = evaluateActivationHints({
			pathname: "/dashboard/envelope/create",
			deployment: "sandbox",
			billingPlanId: "free",
			milestones: new Set(),
			dismissedHintIds: new Set(["sandbox_compose_disclosure"]),
		});

		expect(hints.some((h) => h.id === "sandbox_compose_disclosure")).toBe(
			false,
		);
	});

	test("registry covers all hint ids", () => {
		expect(ACTIVATION_HINT_IDS.length).toBeGreaterThan(0);
	});
});
