import type { z } from "zod";

export type ErrorAudience = "user" | "internal";

export type ErrorSeverity = "error" | "warning";

export type OrpcErrorCode =
	| "BAD_REQUEST"
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "CONFLICT"
	| "INTERNAL_SERVER_ERROR";

export interface ErrorDefinition {
	title: string;
	description: string;
	steps: readonly string[];
	audience: ErrorAudience;
	severity: ErrorSeverity;
	defaultOrpcCode: OrpcErrorCode;
	supportSlug?: string;
	showSupportLink?: boolean;
	dedupeKey?: string;
	paramsSchema?: z.ZodTypeAny;
}

export interface PresentedError {
	code: string;
	title: string;
	description: string;
	steps: readonly string[];
	supportUrl: string | null;
	severity: ErrorSeverity;
	dedupeKey: string;
	/** Raw message appended in dev-only toast UI */
	devDetail?: string;
}

export type PresentErrorOptions = {
	helpBaseUrl?: string;
	/** When true, include devDetail from underlying error */
	devMode?: boolean;
};
