import {
	hashNormalizedSignerEmail,
	type RegisterRoutingInput,
} from "@filosign/shared";
import type { Hex } from "viem";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import type { EnvelopeRegistryProgress } from "./piece-helpers";

type RegistryReader = {
	read: {
		hasSigned: (args: readonly [Hex, Hex]) => Promise<boolean>;
	};
};

export async function applySequentialNextSigner(args: {
	registry: RegistryReader;
	cidId: Hex;
	routing: RegisterRoutingInput;
	progress: EnvelopeRegistryProgress;
}): Promise<void> {
	if (
		args.routing.routingMode !== 1 ||
		!args.routing.routingOrderEmails?.length
	) {
		return;
	}

	for (const email of args.routing.routingOrderEmails) {
		const commitment = hashNormalizedSignerEmail(email);
		const signedRes = await tryCatch(
			args.registry.read.hasSigned([args.cidId, commitment]),
		);
		if (!signedRes.error && !signedRes.data) {
			args.progress.nextSignerEmail = email;
			break;
		}
	}
}

export async function applySequentialCanSignGate(args: {
	registry: RegistryReader;
	cidId: Hex;
	routing: RegisterRoutingInput;
	signerEmail: string;
	progress: EnvelopeRegistryProgress;
}): Promise<void> {
	if (
		args.routing.routingMode !== 1 ||
		!args.routing.routingOrderEmails?.length
	) {
		return;
	}

	const normalized = args.signerEmail.trim().toLowerCase();
	const order = args.routing.routingOrderEmails.map((e) =>
		e.trim().toLowerCase(),
	);
	const idx = order.indexOf(normalized);
	if (idx <= 0) return;

	for (let j = 0; j < idx; j++) {
		const prior = order[j];
		if (!prior) continue;
		const commitment = hashNormalizedSignerEmail(prior);
		const signedRes = await tryCatch(
			args.registry.read.hasSigned([args.cidId, commitment]),
		);
		if (signedRes.error || !signedRes.data) {
			args.progress.canSignByRouting = false;
			break;
		}
	}
}
