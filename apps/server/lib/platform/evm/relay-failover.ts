import { ORPCError } from "@orpc/server";
import {
	type RelayerPoolMember,
	relayerFailoverMembers,
} from "@/lib/platform/evm/relayer-pool";
import { logger } from "@/lib/platform/pino";

const RELAYER_RELAY_RETRYABLE_PATTERNS = [
	/reverted on-chain/i,
	/relayer lock unavailable/i,
	/insufficient funds/i,
	/nonce too low/i,
	/replacement transaction underpriced/i,
	/transaction receipt/i,
	/timeout/i,
	/etimedout/i,
	/econnreset/i,
	/rpc request failed/i,
	/internal server error/i,
	/filealreadyregistered/i,
] as const;

function errorMessage(err: unknown): string {
	if (err instanceof ORPCError) {
		return typeof err.message === "string" ? err.message : String(err);
	}
	if (err instanceof Error) {
		return err.message;
	}
	return String(err);
}

/** Internal signal to try the next pool relayer (not a user-facing error). */
export class RelayerRelayFailoverError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RelayerRelayFailoverError";
	}
}

export function signalRelayerRelayFailover(message: string): never {
	throw new RelayerRelayFailoverError(message);
}

/** Whether a relay failure may succeed on another pool relayer. */
export function isRelayerRelayRetryable(err: unknown): boolean {
	if (err instanceof RelayerRelayFailoverError) {
		return true;
	}
	const message = errorMessage(err);
	return RELAYER_RELAY_RETRYABLE_PATTERNS.some((pattern) =>
		pattern.test(message),
	);
}

export type RelayerPoolFailoverResult<T> = {
	result: T;
	relayer: RelayerPoolMember;
};

export async function withRelayerPoolFailover<T>(args: {
	primary: RelayerPoolMember;
	step: string;
	context?: Record<string, unknown>;
	run: (member: RelayerPoolMember) => Promise<T>;
}): Promise<RelayerPoolFailoverResult<T>> {
	const members = relayerFailoverMembers(args.primary);
	let lastError: unknown;

	for (let i = 0; i < members.length; i += 1) {
		const member = members[i];
		try {
			const result = await args.run(member);
			return { result, relayer: member };
		} catch (err) {
			lastError = err;
			const hasNext = i < members.length - 1;
			if (!hasNext || !isRelayerRelayRetryable(err)) {
				throw err;
			}
			const fromRelayer = member.address;
			const toRelayer = members[i + 1].address;
			logger.warn(
				{
					step: args.step,
					fromRelayer,
					toRelayer,
					err,
					...args.context,
				},
				"relayer pool failover",
			);
		}
	}

	throw lastError;
}
