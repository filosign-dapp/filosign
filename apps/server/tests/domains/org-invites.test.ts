import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { dbQueryResult } from "../support/db-query-result";

describe("org invites", () => {
	const token = "a".repeat(32);
	const expiresAt = new Date("2026-07-01T00:00:00.000Z");

	beforeAll(() => {
		mock.module("@/lib/platform/db", () => ({
			default: {
				schema: {
					organizationInvites: {
						email: "email",
						role: "role",
						expiresAt: "expiresAt",
						token: "token",
						status: "status",
						organizationId: "organizationId",
					},
					organizations: {
						id: "id",
						name: "name",
					},
				},
				select: () => ({
					from: () => ({
						innerJoin: () => ({
							where: () => ({
								limit: () =>
									dbQueryResult([
										{
											email: "alex@acme.com",
											role: "sender",
											expiresAt,
											orgName: "Acme Legal",
										},
									]),
							}),
						}),
					}),
				}),
			},
		}));
	});

	afterAll(() => {
		mock.restore();
	});

	test("previewOrgInvite returns locked email and org name for pending invite", async () => {
		const { previewOrgInvite } = await import("@/lib/domains/invites");

		const preview = await previewOrgInvite({ token });
		expect(preview.valid).toBe(true);
		if (!preview.valid) return;
		expect(preview.lockedEmail).toBe("alex@acme.com");
		expect(preview.orgName).toBe("Acme Legal");
		expect(preview.role).toBe("sender");
	});

	test("previewOrgInvite rejects short tokens", async () => {
		const { previewOrgInvite } = await import("@/lib/domains/invites");

		const preview = await previewOrgInvite({ token: "short" });
		expect(preview.valid).toBe(false);
		if (preview.valid) return;
		expect(preview.reason).toContain("Invalid");
	});
});

describe("org controller sync after membership", () => {
	const organizationId = "00000000-0000-7000-8000-000000000201";

	afterAll(() => {
		mock.restore();
	});

	test("enqueues retry when inline sync fails", async () => {
		const enqueue = mock(async () => {});
		mock.module("@/lib/domains/orgs/controllers", () => ({
			syncOrgControllersOnChain: async () => {
				throw new Error("relay timeout");
			},
		}));
		mock.module("@/lib/platform/jobs/queues", () => ({
			enqueueOrgControllerSync: enqueue,
		}));

		const { syncOrgControllersAfterMembershipChange } = await import(
			"@/lib/domains/orgs/utils/sync-controllers-after-membership"
		);

		await syncOrgControllersAfterMembershipChange(organizationId);
		expect(enqueue).toHaveBeenCalledWith(organizationId);
	});

	test("does not enqueue when inline sync succeeds", async () => {
		const enqueue = mock(async () => {});
		mock.module("@/lib/domains/orgs/controllers", () => ({
			syncOrgControllersOnChain: async () => {},
		}));
		mock.module("@/lib/platform/jobs/queues", () => ({
			enqueueOrgControllerSync: enqueue,
		}));

		const { syncOrgControllersAfterMembershipChange } = await import(
			"@/lib/domains/orgs/utils/sync-controllers-after-membership"
		);

		await syncOrgControllersAfterMembershipChange(organizationId);
		expect(enqueue).not.toHaveBeenCalled();
	});
});
