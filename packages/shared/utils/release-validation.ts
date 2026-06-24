import type {
	ReleaseCopyContext,
	ReleaseValidationIssue,
} from "./release-copy";
import { formatReleaseValidationError } from "./release-copy";
import type {
	SettlementReleaseParams,
	SettlementReleaseType,
} from "./settlement-rules";
import { normalizeSettlementReleaseType } from "./settlement-rules";

/** Threshold-only slice used while compose dialogs validate before building full params. */
export type ComposeThresholdReleaseParams =
	| { releaseType: "at_least_n"; thresholdN: number }
	| { releaseType: "quorum_set"; thresholdN: number };

export type RoutingResolvedReleaseParams =
	| SettlementReleaseParams
	| { releaseType: "all_signed" }
	| ComposeThresholdReleaseParams;

export type ReleaseRoutingContext = ReleaseCopyContext & {
	/** Required signer count when quorumN is 0 */
	requiredSignerCount: number;
};

export function resolveReleaseParamsForRouting(args: {
	releaseType: SettlementReleaseType;
	releaseParams?: SettlementReleaseParams | null;
	thresholdN?: number | string | null;
	routing: ReleaseRoutingContext;
}): RoutingResolvedReleaseParams {
	const releaseType = normalizeSettlementReleaseType(args.releaseType);
	const { quorumN } = args.routing;

	if (releaseType === "all_signed") {
		return { releaseType: "all_signed" };
	}

	if (releaseType === "quorum_required") {
		if (quorumN > 0) {
			return { releaseType: "quorum_required", thresholdN: quorumN };
		}
		const parsed = parseThresholdN(args.thresholdN ?? args.releaseParams);
		if (parsed != null) {
			return { releaseType: "quorum_required", thresholdN: parsed };
		}
		return { releaseType: "quorum_required", thresholdN: 1 };
	}

	if (args.releaseParams && args.releaseParams.releaseType === releaseType) {
		return args.releaseParams;
	}

	const parsed = parseThresholdN(args.thresholdN);
	if (parsed != null && needsThreshold(releaseType)) {
		if (releaseType === "quorum_all") {
			return { releaseType: "quorum_all", thresholdN: parsed };
		}
		if (releaseType === "at_least_n") {
			return { releaseType: "at_least_n", thresholdN: parsed };
		}
		if (releaseType === "quorum_set") {
			return { releaseType: "quorum_set", thresholdN: parsed };
		}
	}

	return { releaseType: "all_signed" };
}

function parseThresholdN(
	value: number | string | SettlementReleaseParams | null | undefined,
): number | null {
	if (value == null) return null;
	if (typeof value === "object" && "thresholdN" in value) {
		const n = value.thresholdN;
		return typeof n === "number" && n > 0 ? n : null;
	}
	const n =
		typeof value === "number" ? value : Number.parseInt(String(value), 10);
	return Number.isFinite(n) && n > 0 ? n : null;
}

function needsThreshold(releaseType: SettlementReleaseType): boolean {
	return (
		releaseType === "at_least_n" ||
		releaseType === "quorum_required" ||
		releaseType === "quorum_set" ||
		releaseType === "quorum_all"
	);
}

export function validateReleaseParamsForRouting(args: {
	releaseType: SettlementReleaseType;
	releaseParams?: SettlementReleaseParams | null;
	thresholdN?: number | string | null;
	routing: ReleaseRoutingContext;
}):
	| {
			ok: true;
			params: RoutingResolvedReleaseParams;
	  }
	| {
			ok: false;
			issue: ReleaseValidationIssue;
			message: string;
	  } {
	const releaseType = normalizeSettlementReleaseType(args.releaseType);
	const { quorumN, signerCount, requiredSignerCount } = args.routing;

	if (releaseType === "quorum_required") {
		if (quorumN > 0) {
			const userThreshold = parseThresholdN(
				args.thresholdN ?? args.releaseParams,
			);
			if (userThreshold != null && userThreshold !== quorumN) {
				return fail("quorum_threshold_mismatch", args.routing);
			}
			return {
				ok: true,
				params: { releaseType: "quorum_required", thresholdN: quorumN },
			};
		}

		const threshold = parseThresholdN(args.thresholdN ?? args.releaseParams);

		if (threshold == null || threshold < 1) {
			return fail("threshold_missing", args.routing);
		}

		const cap = requiredSignerCount > 0 ? requiredSignerCount : signerCount;
		if (threshold > cap || threshold === 0) {
			if (threshold > cap) {
				return fail("threshold_exceeds_signers", args.routing);
			}
			return fail("threshold_missing", args.routing);
		}

		return {
			ok: true,
			params: { releaseType: "quorum_required", thresholdN: threshold },
		};
	}

	if (releaseType === "quorum_all") {
		const threshold = parseThresholdN(
			args.thresholdN ??
				(args.releaseParams?.releaseType === "quorum_all"
					? args.releaseParams
					: null),
		);
		if (threshold == null || threshold < 1) {
			return fail("threshold_missing", args.routing);
		}
		const cap = requiredSignerCount > 0 ? requiredSignerCount : signerCount;
		if (threshold > cap) {
			return fail("threshold_exceeds_signers", args.routing);
		}
		return {
			ok: true,
			params: { releaseType: "quorum_all", thresholdN: threshold },
		};
	}

	if (releaseType === "at_least_n" || releaseType === "quorum_set") {
		if (args.releaseParams?.releaseType === releaseType) {
			return { ok: true, params: args.releaseParams };
		}
		const threshold = parseThresholdN(args.thresholdN);
		if (threshold == null || threshold < 1) {
			return fail("threshold_missing", args.routing);
		}
		const cap = requiredSignerCount > 0 ? requiredSignerCount : signerCount;
		if (threshold > cap) {
			return fail("threshold_exceeds_signers", args.routing);
		}
		// Compose dialogs validate threshold only; signer commitments are built at save time.
		if (releaseType === "at_least_n") {
			return {
				ok: true,
				params: { releaseType: "at_least_n", thresholdN: threshold },
			};
		}
		return {
			ok: true,
			params: { releaseType: "quorum_set", thresholdN: threshold },
		};
	}

	if (releaseType === "all_signed") {
		return { ok: true, params: { releaseType: "all_signed" } };
	}

	if (args.releaseParams) {
		return { ok: true, params: args.releaseParams };
	}

	return fail("threshold_missing", args.routing);
}

function fail(
	issue: ReleaseValidationIssue,
	routing: ReleaseCopyContext,
): { ok: false; issue: ReleaseValidationIssue; message: string } {
	return {
		ok: false,
		issue,
		message: formatReleaseValidationError(issue, routing),
	};
}

/** Whether the UI should hide manual threshold input for quorum_required. */
export function releaseTypeHidesThresholdInput(
	releaseType: SettlementReleaseType,
	routing: ReleaseCopyContext,
): boolean {
	return (
		normalizeSettlementReleaseType(releaseType) === "quorum_required" &&
		routing.quorumN > 0
	);
}
