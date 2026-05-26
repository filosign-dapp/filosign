import { zEvmAddress } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { type Address, getAddress, type Hex } from "viem";
import { z } from "zod";
import db from "@/lib/platform/db";

const { users } = db.schema;

const zKeygenJson = z.object({
	saltPin: z.string(),
	saltSeed: z.string(),
	saltChallenge: z.string(),
	commitmentKem: z.string(),
	commitmentSig: z.string(),
});

export const zRegistrationSnapshotInput = z.object({
	walletAddress: zEvmAddress(),
});

export async function userRegistrationSnapshot(body: unknown) {
	const parsed = zRegistrationSnapshotInput.safeParse(body);
	if (parsed.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const wallet = getAddress(parsed.data.walletAddress) as Address;

	const [row] = await db
		.select({
			keygenDataJson: users.keygenDataJson,
		})
		.from(users)
		.where(eq(users.walletAddress, wallet));

	if (!row) {
		return { isRegistered: false, storedKeygenData: null };
	}

	const keygen = zKeygenJson.safeParse(row.keygenDataJson);
	if (!keygen.success) {
		return { isRegistered: true, storedKeygenData: null };
	}

	return {
		isRegistered: true,
		storedKeygenData: {
			saltSeed: keygen.data.saltSeed as Hex,
			saltChallenge: keygen.data.saltChallenge as Hex,
			commitmentKem: keygen.data.commitmentKem as Hex,
			commitmentSig: keygen.data.commitmentSig as Hex,
		},
	};
}
