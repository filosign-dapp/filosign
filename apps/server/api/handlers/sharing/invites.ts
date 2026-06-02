import { ORPCError } from "@orpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import z from "zod";
import {
	inviteExpiresAt,
	pendingUserInviteFilter,
} from "@/lib/domains/invites";
import {
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { userInvites, users } = db.schema;

export async function sharingEmailInvites(wallet: Address) {
	const result = await tryCatch(
		db
			.select({
				id: userInvites.id,
				inviteeEmail: userInvites.inviteeEmail,
				message: userInvites.message,
				accepted: sql<boolean>`${userInvites.status} = 'claimed'`,
				createdAt: userInvites.createdAt,
			})
			.from(userInvites)
			.where(eq(userInvites.sender, wallet))
			.orderBy(desc(userInvites.createdAt)),
	);

	if (result.error) {
		console.error("Error fetching email invites", result.error);
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to retrieve email invites",
		});
	}
	return { invites: result.data };
}

export async function sharingInviteById(id: string) {
	if (!id) {
		throw new ORPCError("BAD_REQUEST", { message: "Invite ID is required" });
	}

	const result = await tryCatch(
		(async () => {
			const [invite] = await db
				.select({
					id: userInvites.id,
					inviteeEmail: userInvites.inviteeEmail,
					message: userInvites.message,
					createdAt: userInvites.createdAt,
					sender: userInvites.sender,
				})
				.from(userInvites)
				.where(and(eq(userInvites.id, id), pendingUserInviteFilter()));

			if (!invite) {
				return { notFound: true as const };
			}

			const [sender] = await db
				.select({
					firstName: users.firstName,
					lastName: users.lastName,
					walletAddress: users.walletAddress,
				})
				.from(users)
				.where(eq(users.walletAddress, invite.sender));

			return {
				notFound: false as const,
				invite,
				sender,
			};
		})(),
	);

	if (result.error) {
		console.error("Error fetching invite:", result.error);
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to retrieve invite",
		});
	}

	const data = result.data;
	if (data.notFound) {
		throw new ORPCError("NOT_FOUND", {
			message: "Invite not found or expired",
		});
	}

	const { invite, sender } = data;
	return {
		id: invite.id,
		inviteeEmail: invite.inviteeEmail,
		message: invite.message,
		createdAt: invite.createdAt,
		senderName: sender
			? `${sender.firstName || ""} ${sender.lastName || ""}`.trim() ||
				`${sender.walletAddress.slice(0, 6)}...${sender.walletAddress.slice(-4)}`
			: `${invite.sender.slice(0, 6)}...${invite.sender.slice(-4)}`,
	};
}

export async function sharingInviteClaim(wallet: Address, id: string) {
	if (!id) {
		throw new ORPCError("BAD_REQUEST", { message: "Invite ID is required" });
	}

	const result = await tryCatch(
		db.transaction(async (tx) => {
			const [primaryInvite] = await tx
				.select()
				.from(userInvites)
				.where(and(eq(userInvites.id, id), pendingUserInviteFilter()));

			if (!primaryInvite) {
				throw new Error("Invite not found");
			}

			const allInvites = await tx
				.select()
				.from(userInvites)
				.where(
					and(
						eq(userInvites.inviteeEmail, primaryInvite.inviteeEmail),
						pendingUserInviteFilter(),
					),
				);

			for (const invite of allInvites) {
				await tx
					.update(userInvites)
					.set({
						status: "claimed",
						claimedAt: new Date(),
						claimedByWallet: wallet,
						updatedAt: new Date(),
					})
					.where(eq(userInvites.id, invite.id));
			}

			return primaryInvite;
		}),
	);

	if (result.error) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				result.error instanceof Error
					? result.error.message
					: "Invite claim failed",
		});
	}

	trackServerEvent({
		distinctId: wallet,
		event: SERVER_ANALYTICS_EVENTS.sharingInviteClaimed,
	});

	return {
		id: result.data.id,
		sender: result.data.sender,
		inviteeEmail: result.data.inviteeEmail,
		accepted: result.data.status === "claimed",
		message: result.data.message ?? null,
		createdAt: result.data.createdAt,
		updatedAt: result.data.updatedAt,
		deletedAt: null,
	};
}

async function insertUserInvite(args: {
	sender: Address;
	inviteeEmail: string;
	message: string | null | undefined;
}) {
	const [existingInvite] = await db
		.select({ id: userInvites.id })
		.from(userInvites)
		.where(
			and(
				eq(userInvites.sender, args.sender),
				eq(userInvites.inviteeEmail, args.inviteeEmail),
				pendingUserInviteFilter(),
			),
		);

	if (existingInvite) {
		return { alreadyInvited: true as const };
	}

	await db.insert(userInvites).values({
		sender: args.sender,
		inviteeEmail: args.inviteeEmail,
		status: "pending",
		expiresAt: inviteExpiresAt(),
		message: args.message ?? null,
	});

	return { alreadyInvited: false as const };
}

export async function sharingRequestInvite(wallet: Address, body: unknown) {
	const parsed = z
		.object({
			inviteeEmail: z.string(),
			message: z.string().max(500).nullable().optional(),
		})
		.safeParse(body);

	const inviteeEmail =
		parsed.success && parsed.data.inviteeEmail
			? String(parsed.data.inviteeEmail).trim()
			: "";
	const message = parsed.success ? parsed.data.message : undefined;

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!inviteeEmail || !emailRegex.test(inviteeEmail)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Please provide a valid email address",
		});
	}

	if (
		message !== undefined &&
		message !== null &&
		(typeof message !== "string" || message.length > 500)
	) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Message too long (max 500 characters)",
		});
	}

	const normalizedEmail = inviteeEmail.toLowerCase();
	const out = await insertUserInvite({
		sender: wallet,
		inviteeEmail: normalizedEmail,
		message,
	});

	if (out.alreadyInvited) {
		return { invited: true as const, alreadyInvited: true as const };
	}

	return { invited: true as const };
}
