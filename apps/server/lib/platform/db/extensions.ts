import { and, desc, eq } from "drizzle-orm";
import type { Address } from "viem";
import type dbClient from "./client";
import schema from "./schema";

type DbClient = typeof dbClient;

export function dbExtensionHelpers(db: DbClient) {
	async function canSendTo(args: { sender: Address; recipient: Address }) {
		const { sender, recipient } = args;

		const [latestApproval] = await db
			.select()
			.from(schema.shareApprovals)
			.where(
				and(
					eq(schema.shareApprovals.senderWallet, sender),
					eq(schema.shareApprovals.recipientWallet, recipient),
				),
			)
			.orderBy(desc(schema.shareApprovals.createdAt))
			.limit(1);

		return latestApproval ? latestApproval.active : false;
	}

	async function updateUserFieldWithLog(args: {
		walletAddress: Address;
		fieldName: "username" | "email" | "firstName" | "lastName" | "avatarKey";
		newValue: string | undefined | null;
	}) {
		const { walletAddress, fieldName, newValue } = args;

		const [previous] = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.walletAddress, walletAddress));

		if (!previous) {
			throw new Error("User not found");
		}

		if (
			!newValue ||
			newValue.trim() === "" ||
			newValue === previous[fieldName]
		) {
			return;
		}

		const oldValue = previous[fieldName];

		await db
			.update(schema.users)
			.set({ [fieldName]: newValue })
			.where(eq(schema.users.walletAddress, walletAddress));

		await db.insert(schema.userHistory).values({
			walletAddress,
			fieldName,
			oldValue: oldValue ?? "",
			newValue,
		});
	}

	return { canSendTo, updateUserFieldWithLog };
}
