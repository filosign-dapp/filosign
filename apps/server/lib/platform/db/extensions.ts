import { eq } from "drizzle-orm";
import type { Address } from "viem";
import type dbClient from "./client";
import schema from "./schema";

type DbClient = typeof dbClient;

export function dbExtensionHelpers(db: DbClient) {
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

	return { updateUserFieldWithLog };
}
