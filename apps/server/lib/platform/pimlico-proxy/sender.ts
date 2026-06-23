import { eq } from "drizzle-orm";
import { type Address, getAddress, isAddress } from "viem";
import db from "@/lib/platform/db";
import {
	JSON_RPC_ERROR_CODES,
	type JsonRpcId,
	makeJsonRpcError,
	PimlicoProxyError,
} from "./jsonrpc";

/** Call-time schema access so Bun `mock.module("@/lib/platform/db")` stays effective. */
function schema() {
	return db.schema;
}

export function extractUserOpSender(
	params: unknown[] | undefined,
): Address | null {
	const userOp = params?.[0];
	if (!userOp || typeof userOp !== "object") return null;
	const sender =
		"sender" in userOp && typeof userOp.sender === "string"
			? userOp.sender
			: null;
	if (!sender || !isAddress(sender)) return null;
	return getAddress(sender);
}

export async function isRegisteredSender(wallet: Address): Promise<boolean> {
	const { users } = schema();
	const [row] = await db
		.select({ walletAddress: users.walletAddress })
		.from(users)
		.where(eq(users.walletAddress, wallet))
		.limit(1);
	return Boolean(row);
}

export async function assertRegisteredSender(args: {
	sender: Address;
	requestId: JsonRpcId;
}): Promise<void> {
	const registered = await isRegisteredSender(args.sender);
	if (registered) return;

	throw new PimlicoProxyError(
		makeJsonRpcError(
			args.requestId,
			JSON_RPC_ERROR_CODES.unregisteredSender,
			"Sender wallet address is not registered on this platform",
		),
		403,
	);
}

export function assertValidUserOpSender(args: {
	params: unknown[] | undefined;
	requestId: JsonRpcId;
}): Address {
	const sender = extractUserOpSender(args.params);
	if (!sender) {
		throw new PimlicoProxyError(
			makeJsonRpcError(
				args.requestId,
				JSON_RPC_ERROR_CODES.invalidParams,
				"Invalid sender address in UserOperation",
			),
			400,
		);
	}
	return sender;
}
