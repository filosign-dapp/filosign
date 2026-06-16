import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";

function schema() {
	return db.schema;
}

export async function readPieceRelayerPin(
	pieceCid: string,
): Promise<Address | null> {
	const { files } = schema();
	const [row] = await db
		.select({ assignedRelayerAddress: files.assignedRelayerAddress })
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);
	return row?.assignedRelayerAddress ?? null;
}

export async function writePieceRelayerPin(
	pieceCid: string,
	address: Address,
): Promise<void> {
	const { files } = schema();
	const relayerAddress = getAddress(address);
	await db
		.update(files)
		.set({
			assignedRelayerAddress: relayerAddress,
			updatedAt: new Date(),
		})
		.where(eq(files.pieceCid, pieceCid));
}

export async function readOrgRelayerPin(
	organizationId: string,
): Promise<Address | null> {
	const { organizations } = schema();
	const [row] = await db
		.select({ assignedRelayerAddress: organizations.assignedRelayerAddress })
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);
	return row?.assignedRelayerAddress ?? null;
}

export async function writeOrgRelayerPin(
	organizationId: string,
	address: Address,
): Promise<void> {
	const { organizations } = schema();
	const relayerAddress = getAddress(address);
	await db
		.update(organizations)
		.set({
			assignedRelayerAddress: relayerAddress,
			updatedAt: new Date(),
		})
		.where(eq(organizations.id, organizationId));
}
