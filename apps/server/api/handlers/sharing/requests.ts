import { zEvmAddress } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import db from "@/lib/platform/db";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const REQUEST_SPAM_BASE_HOURS = 3;

const { shareApprovals, shareRequests } = db.schema;

export async function sharingReceivedRequests(wallet: Address) {
	const result = await tryCatch(
		db
			.select({
				id: shareRequests.id,
				senderWallet: shareRequests.senderWallet,
				recipientWallet: shareRequests.recipientWallet,
				message: shareRequests.message,
				status: shareRequests.status,
				createdAt: shareRequests.createdAt,
				updatedAt: shareRequests.updatedAt,
			})
			.from(shareRequests)
			.where(eq(shareRequests.recipientWallet, wallet))
			.orderBy(desc(shareRequests.createdAt)),
	);

	if (result.error) {
		console.error("Error fetching received share requests", result.error);
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to retrieve received requests",
		});
	}
	return { requests: result.data };
}

export async function sharingSentRequests(wallet: Address) {
	const result = await tryCatch(
		db
			.select({
				id: shareRequests.id,
				senderWallet: shareRequests.senderWallet,
				recipientWallet: shareRequests.recipientWallet,
				message: shareRequests.message,
				status: shareRequests.status,
				createdAt: shareRequests.createdAt,
				updatedAt: shareRequests.updatedAt,
			})
			.from(shareRequests)
			.where(eq(shareRequests.senderWallet, wallet))
			.orderBy(desc(shareRequests.createdAt)),
	);

	if (result.error) {
		console.error("Error fetching sent share requests", result.error);
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to retrieve sent requests",
		});
	}
	return { requests: result.data };
}

export async function sharingCancelRequest(wallet: Address, id: string) {
	const [approval] = await db
		.select()
		.from(shareRequests)
		.where(
			and(
				eq(shareRequests.id, id),
				eq(shareRequests.senderWallet, wallet),
				eq(shareRequests.status, "PENDING"),
			),
		);
	if (!approval) {
		throw new ORPCError("NOT_FOUND", {
			message: "Approval not found or cannot cancel",
		});
	}
	await db
		.update(shareRequests)
		.set({ status: "CANCELLED" })
		.where(eq(shareRequests.id, id));
	return {};
}

export async function sharingRejectRequest(wallet: Address, id: string) {
	const [approval] = await db
		.select()
		.from(shareRequests)
		.where(
			and(
				eq(shareRequests.id, id),
				eq(shareRequests.recipientWallet, wallet),
				eq(shareRequests.status, "PENDING"),
			),
		);
	if (!approval) {
		throw new ORPCError("NOT_FOUND", {
			message: "Request not found or cannot reject",
		});
	}
	await db
		.update(shareRequests)
		.set({ status: "REJECTED" })
		.where(eq(shareRequests.id, id));
	return {};
}

export function sharingAcceptRequestDenied(): never {
	throw new ORPCError("BAD_REQUEST", {
		message:
			"Share requests are accepted on-chain only. Sign ApproveSender and POST sharing.approve (see FSManager / apps/contracts/README.md).",
	});
}

const zCreateRequestBody = z.object({
	recipientWallet: zEvmAddress(),
	recipientEmail: z.email().optional(),
	message: z.string().max(500).nullable().optional(),
});

export async function sharingCreateRequest(wallet: Address, body: unknown) {
	const parsedBody = zCreateRequestBody.safeParse(body);

	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}

	const { recipientWallet, message } = parsedBody.data;
	const recipient = getAddress(recipientWallet);
	const sender = wallet;

	if (recipient === sender) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Don't ask yourself for permission",
		});
	}

	const [existingRequest] = await db
		.select()
		.from(shareRequests)
		.where(
			and(
				eq(shareRequests.senderWallet, sender),
				eq(shareRequests.recipientWallet, recipient),
				eq(shareRequests.status, "PENDING"),
			),
		);

	if (existingRequest) {
		throw new ORPCError("CONFLICT", {
			message: "A pending request already exists",
		});
	}

	const [latestApproval] = await db
		.select()
		.from(shareApprovals)
		.where(
			and(
				eq(shareApprovals.senderWallet, sender),
				eq(shareApprovals.recipientWallet, recipient),
			),
		)
		.orderBy(desc(shareApprovals.createdAt))
		.limit(1);

	if (latestApproval?.active) {
		throw new ORPCError("CONFLICT", { message: "Already approved" });
	}

	const cancelledRequests = await db
		.select()
		.from(shareRequests)
		.where(
			and(
				eq(shareRequests.senderWallet, sender),
				eq(shareRequests.recipientWallet, recipient),
				eq(shareRequests.status, "CANCELLED"),
			),
		)
		.orderBy(desc(shareRequests.createdAt));

	if (cancelledRequests.length > 0) {
		const lastCancelled = cancelledRequests[0];
		const hoursSinceCancel =
			(Date.now() - Number(lastCancelled.createdAt)) / (1000 * 60 * 60);
		const requiredWaitHours =
			REQUEST_SPAM_BASE_HOURS ** cancelledRequests.length;

		if (hoursSinceCancel < requiredWaitHours) {
			const remainingHours = Math.ceil(requiredWaitHours - hoursSinceCancel);
			throw new ORPCError("TOO_MANY_REQUESTS", {
				message: `Please wait ${remainingHours} more hours before sending another request (spam prevention)`,
			});
		}
	}

	const [newRequest] = await db
		.insert(shareRequests)
		.values({
			senderWallet: sender,
			recipientWallet: recipient,
			message: message || null,
		})
		.returning({
			id: shareRequests.id,
			senderWallet: shareRequests.senderWallet,
			recipientWallet: shareRequests.recipientWallet,
			message: shareRequests.message,
			status: shareRequests.status,
			createdAt: shareRequests.createdAt,
		});

	return newRequest;
}
