import { computeCidIdentifier } from "@filosign/contracts";
import {
	hashNormalizedSignerEmail,
	type RegisterRoutingInput,
} from "@filosign/shared";
import { fsEnvelopeRegistryAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

export type EnvelopeRegistryProgress = {
	routingMode: number;
	requiredSignersCount: number;
	requiredSignaturesCount: number;
	optionalSignersCount: number;
	optionalSignaturesCount: number;
	quorumN: number;
	allRequiredSigned: boolean;
	allSigned: boolean;
	quorumMet: boolean;
	/** Sequential: email of next signer who has not signed yet, if known. */
	nextSignerEmail: string | null;
	/** False when sequential order blocks the given signer email. */
	canSignByRouting: boolean;
};

export async function readEnvelopeRegistryProgress(args: {
	pieceCid: string;
	registryAddress: `0x${string}`;
	registerRouting?: RegisterRoutingInput | null;
	signerEmail?: string | null;
}): Promise<EnvelopeRegistryProgress | null> {
	const registry = fsEnvelopeRegistryAt(args.registryAddress);
	const cidId = computeCidIdentifier(args.pieceCid);

	const regRes = await tryCatch(registry.read.envelopeRegistrations([cidId]));
	if (regRes.error || Number(regRes.data.timestamp) === 0) {
		return null;
	}
	const reg = regRes.data;

	const [allRequiredRes, allSignedRes, quorumRes] = await Promise.all([
		tryCatch(registry.read.allRequiredSigned([cidId])),
		tryCatch(registry.read.allSigned([cidId])),
		tryCatch(registry.read.quorumMet([cidId])),
	]);

	const routingMode = Number(reg.routingMode);
	const progress: EnvelopeRegistryProgress = {
		routingMode,
		requiredSignersCount: Number(reg.requiredSignersCount),
		requiredSignaturesCount: Number(reg.requiredSignaturesCount),
		optionalSignersCount: Number(reg.optionalSignersCount),
		optionalSignaturesCount: Number(reg.optionalSignaturesCount),
		quorumN: Number(reg.quorumN),
		allRequiredSigned: allRequiredRes.data ?? false,
		allSigned: allSignedRes.data ?? false,
		quorumMet: quorumRes.data ?? false,
		nextSignerEmail: null,
		canSignByRouting: true,
	};

	const routing = args.registerRouting;
	if (routing?.routingMode === 1 && routing.routingOrderEmails?.length) {
		for (const email of routing.routingOrderEmails) {
			const commitment = hashNormalizedSignerEmail(email);
			const signedRes = await tryCatch(
				registry.read.hasSigned([cidId, commitment]),
			);
			if (!signedRes.error && !signedRes.data) {
				progress.nextSignerEmail = email;
				break;
			}
		}
	}

	if (
		args.signerEmail &&
		routing?.routingMode === 1 &&
		routing.routingOrderEmails?.length
	) {
		const normalized = args.signerEmail.trim().toLowerCase();
		const order = routing.routingOrderEmails.map((e) => e.trim().toLowerCase());
		const idx = order.indexOf(normalized);
		if (idx > 0) {
			for (let j = 0; j < idx; j++) {
				const prior = order[j];
				if (!prior) continue;
				const commitment = hashNormalizedSignerEmail(prior);
				const signedRes = await tryCatch(
					registry.read.hasSigned([cidId, commitment]),
				);
				if (signedRes.error || !signedRes.data) {
					progress.canSignByRouting = false;
					break;
				}
			}
		}
	}

	return progress;
}
