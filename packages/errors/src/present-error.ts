import type { AppErrorCode } from "./catalog/index";
import { isFilosignClientError } from "./filosign-client-error";
import { getErrorDefinition, isAppErrorCode } from "./get-error-definition";
import { interpolateTemplate } from "./interpolate";
import {
	isOrpcErrorLike,
	readAppCodeFromOrpc,
	readEntitlementCodeFromOrpc,
	readParamsFromOrpc,
} from "./is-orpc-error";
import { resolveSupportUrl } from "./resolve-support-url";
import type { PresentErrorOptions, PresentedError } from "./types";

const ORPC_ENTITLEMENT_CODE_TO_APP: Record<string, AppErrorCode> = {
	FEATURE_DISABLED: "ENTITLEMENT.FEATURE_DISABLED",
	QUOTA_EXCEEDED: "ENTITLEMENT.QUOTA_EXCEEDED",
	LIMIT_EXCEEDED: "ENTITLEMENT.LIMIT_EXCEEDED",
};

function isNetworkError(error: unknown): boolean {
	if (error instanceof TypeError) {
		const msg = error.message.toLowerCase();
		if (msg.includes("failed to fetch") || msg.includes("load failed")) {
			return true;
		}
	}
	if (isOrpcErrorLike(error)) {
		const status = (error as { status?: number }).status;
		if (status === 502 || status === 503 || status === 504) return true;
	}
	return false;
}

function presentFromDefinition(
	code: AppErrorCode,
	params: Record<string, string | number | boolean> | undefined,
	options: PresentErrorOptions,
	devDetail?: string,
): PresentedError {
	const def = getErrorDefinition(code);
	if (!def) {
		return presentFromDefinition(
			"GENERIC.UNKNOWN",
			undefined,
			options,
			devDetail,
		);
	}

	const useGeneric = def.audience === "internal";

	const effectiveCode: AppErrorCode = useGeneric ? "GENERIC.UNKNOWN" : code;
	const effectiveDef =
		getErrorDefinition(effectiveCode) ?? getErrorDefinition("GENERIC.UNKNOWN");
	if (!effectiveDef) {
		return presentFromDefinition(
			"GENERIC.UNKNOWN",
			undefined,
			options,
			devDetail,
		);
	}

	const title = interpolateTemplate(effectiveDef.title, params);
	const description = interpolateTemplate(effectiveDef.description, params);
	const steps = effectiveDef.steps.map((step) =>
		interpolateTemplate(step, params),
	);
	const helpBase = options.helpBaseUrl ?? "";
	const supportUrl =
		helpBase && effectiveDef.supportSlug && effectiveDef.audience === "user"
			? resolveSupportUrl(effectiveCode, helpBase)
			: null;

	const dedupeTemplate = effectiveDef.dedupeKey ?? effectiveCode;

	return {
		code: effectiveCode,
		title,
		description,
		steps,
		supportUrl,
		severity: effectiveDef.severity,
		dedupeKey: interpolateTemplate(dedupeTemplate, params),
		devDetail: options.devMode ? devDetail : undefined,
	};
}

function resolveAppCode(error: unknown): {
	code: AppErrorCode | null;
	params?: Record<string, string | number | boolean>;
	devDetail?: string;
} {
	if (isFilosignClientError(error)) {
		return { code: error.code };
	}

	if (isOrpcErrorLike(error)) {
		const appCode = readAppCodeFromOrpc(error);
		if (appCode && isAppErrorCode(appCode)) {
			return {
				code: appCode,
				params: readParamsFromOrpc(error),
				devDetail: error.message,
			};
		}

		const entitlementCode = readEntitlementCodeFromOrpc(error);
		if (entitlementCode) {
			if (isAppErrorCode(entitlementCode)) {
				return {
					code: entitlementCode,
					params: readParamsFromOrpc(error),
					devDetail: error.message,
				};
			}
			const mapped = ORPC_ENTITLEMENT_CODE_TO_APP[entitlementCode];
			if (mapped) {
				return {
					code: mapped,
					params: readParamsFromOrpc(error),
					devDetail: error.message,
				};
			}
		}

		if (error.code === "UNAUTHORIZED") {
			return { code: "AUTH.UNAUTHORIZED", devDetail: error.message };
		}

		return { code: null, devDetail: error.message };
	}

	if (error instanceof Error) {
		return { code: null, devDetail: error.message };
	}

	return { code: null };
}

export function presentError(
	error: unknown,
	options: PresentErrorOptions = {},
): PresentedError {
	if (isNetworkError(error)) {
		return presentFromDefinition(
			"GENERIC.NETWORK",
			undefined,
			options,
			error instanceof Error ? error.message : undefined,
		);
	}

	const resolved = resolveAppCode(error);
	if (resolved.code) {
		return presentFromDefinition(
			resolved.code,
			resolved.params,
			options,
			resolved.devDetail,
		);
	}

	return presentFromDefinition(
		"GENERIC.UNKNOWN",
		undefined,
		options,
		resolved.devDetail ?? (error instanceof Error ? error.message : undefined),
	);
}
