import { clientErrors } from "./client";
import { entitlementErrors } from "./entitlements";
import { genericErrors } from "./generic";
import { signingErrors } from "./signing";

export const ERROR_CATALOG = {
	...genericErrors,
	...signingErrors,
	...entitlementErrors,
	...clientErrors,
} as const;

export type ErrorCatalog = typeof ERROR_CATALOG;
export type AppErrorCode = keyof ErrorCatalog;

export type ErrorParams<Code extends AppErrorCode> =
	ErrorCatalog[Code] extends { paramsSchema: import("zod").ZodTypeAny }
		? import("zod").infer<ErrorCatalog[Code]["paramsSchema"]>
		: never;
