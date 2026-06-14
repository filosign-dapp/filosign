import { beforeEach, describe, expect, mock, test } from "bun:test";
import { ORPCError } from "@orpc/server";
import type { Address } from "viem";
import type { listProductFeedbackForAdmin as listProductFeedbackForAdminFn } from "@/lib/domains/feedback/list";

type FeedbackAdminListResult = Awaited<
	ReturnType<typeof listProductFeedbackForAdminFn>
>;

const adminWallet = "0x1111111111111111111111111111111111111111" as Address;

const countSelect = mock(async () => [{ total: 2 }]);
const listSelect = mock(async () => [
	{
		id: "00000000-0000-4000-8000-000000000002",
		walletAddress: adminWallet,
		userEmail: "newer@example.com",
		featureArea: "sign",
		kind: "feedback" as const,
		route: "/dashboard/document/sign",
		message: "Newer note",
		promptType: "global",
		trigger: null,
		createdAt: new Date("2026-06-13T12:00:00.000Z"),
	},
	{
		id: "00000000-0000-4000-8000-000000000001",
		walletAddress: adminWallet,
		userEmail: "older@example.com",
		featureArea: "send",
		kind: "feedback" as const,
		route: "/dashboard",
		message: "Older note",
		promptType: "global",
		trigger: null,
		createdAt: new Date("2026-06-12T12:00:00.000Z"),
	},
]);

mock.module("@/lib/platform/db", () => ({
	default: {
		select: (fields?: { total?: unknown }) => {
			if (fields && "total" in fields) {
				return {
					from: () => ({
						where: countSelect,
					}),
				};
			}

			return {
				from: () => ({
					leftJoin: () => ({
						where: () => ({
							orderBy: () => ({
								limit: () => ({
									offset: listSelect,
								}),
							}),
						}),
					}),
				}),
			};
		},
	},
}));

const assertPlatformAdmin = mock(async () => {});
const listProductFeedbackForAdminMock = mock(
	async (): Promise<FeedbackAdminListResult> => ({
		items: [],
		page: 1,
		pageSize: 10,
		totalCount: 0,
		totalPages: 0,
	}),
);

mock.module("@/lib/platform/admin", () => ({
	assertPlatformAdmin,
}));

mock.module("@/lib/domains/feedback", () => ({
	listProductFeedbackForAdmin: listProductFeedbackForAdminMock,
	submitProductFeedback: mock(async () => ({
		ok: true as const,
		submittedAt: new Date().toISOString(),
	})),
	notifyFeedbackSubmitted: mock(async () => {}),
}));

const { listProductFeedbackForAdmin } = await import(
	"@/lib/domains/feedback/list"
);
const { platformAdminFeedbackList } = await import(
	"@/api/handlers/feedback-handlers"
);

describe("listProductFeedbackForAdmin", () => {
	beforeEach(() => {
		countSelect.mockClear();
		listSelect.mockClear();
	});

	test("paginates newest feedback first", async () => {
		const result = await listProductFeedbackForAdmin(1);

		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalCount).toBe(2);
		expect(result.totalPages).toBe(1);
		expect(result.items[0]?.message).toBe("Newer note");
		expect(result.items[1]?.message).toBe("Older note");
	});
});

describe("platformAdminFeedbackList", () => {
	beforeEach(() => {
		assertPlatformAdmin.mockClear();
		listProductFeedbackForAdminMock.mockClear();
		listProductFeedbackForAdminMock.mockResolvedValue({
			items: Array.from({ length: 10 }, (_, index) => ({
				id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
				walletAddress: adminWallet,
				userEmail: "user@example.com",
				featureArea: "send" as const,
				kind: "feedback" as const,
				route: "/dashboard/envelope/create",
				message: `Note ${index}`,
				promptType: "global" as const,
				trigger: null,
				createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
			})),
			page: 1,
			pageSize: 10,
			totalCount: 25,
			totalPages: 3,
		});
	});

	test("returns paginated feedback for platform admin", async () => {
		const result = await platformAdminFeedbackList(adminWallet, { page: 1 });

		expect(assertPlatformAdmin).toHaveBeenCalledWith(adminWallet);
		expect(listProductFeedbackForAdminMock).toHaveBeenCalledWith(1);
		expect(result.items).toHaveLength(10);
		expect(result.totalCount).toBe(25);
		expect(result.totalPages).toBe(3);
	});

	test("rejects non-admin callers", async () => {
		assertPlatformAdmin.mockRejectedValueOnce(
			new ORPCError("FORBIDDEN", { message: "Platform admin required" }),
		);

		await expect(
			platformAdminFeedbackList(adminWallet, { page: 1 }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});
