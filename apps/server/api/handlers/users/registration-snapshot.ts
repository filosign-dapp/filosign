import { zUserKeygenDataJson } from "@filosign/shared";
import { zEvmAddress } from "@filosign/shared/zod";
import { eq } from "drizzle-orm";
import { type Address, getAddress, type Hex } from "viem";
import { z } from "zod";
import db from "@/lib/platform/db";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

const { users } = db.schema;

export const zRegistrationSnapshotInput = z.object({
	walletAddress: zEvmAddress(),
});

export async function userRegistrationSnapshot(body: unknown) {
	const parsed = zRegistrationSnapshotInput.safeParse(body);
	if (parsed.error) {
		throw throwZodBadRequest(parsed.error);
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

	const keygen = zUserKeygenDataJson.safeParse(row.keygenDataJson);
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
