import type {
	RegisterRoutingInput,
	ReleaseRoutingContext,
} from "@filosign/shared";

export type RoutingContext = ReleaseRoutingContext;

export function routingContextFromCompose(
	recipients: readonly { role: string }[],
	registerRouting?: RegisterRoutingInput | null,
): RoutingContext {
	const signerCount = recipients.filter((r) => r.role === "signer").length;
	const quorumN = registerRouting?.quorumN ?? 0;
	return {
		quorumN,
		signerCount,
		requiredSignerCount: signerCount,
	};
}

export function routingContextFromEnvelopeProgress(
	progress:
		| {
				quorumN?: number | null;
				requiredSignersCount?: number | null;
		  }
		| null
		| undefined,
): RoutingContext {
	const requiredSignerCount = progress?.requiredSignersCount ?? 0;
	const quorumN = progress?.quorumN ?? 0;
	return {
		quorumN,
		signerCount: requiredSignerCount,
		requiredSignerCount,
	};
}
