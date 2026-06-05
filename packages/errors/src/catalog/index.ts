import { billingErrors } from "./billing";
import { clientErrors } from "./client";
import { entitlementErrors } from "./entitlements";
import { filesErrors } from "./files";
import { genericErrors } from "./generic";
import { settlementsErrors } from "./settlements";
import { signingErrors } from "./signing";
import { usersErrors } from "./users";
import { workspaceErrors } from "./workspace";

export const ERROR_CATALOG = {
	...genericErrors,
	...signingErrors,
	...entitlementErrors,
	...clientErrors,
	...workspaceErrors,
	...billingErrors,
	...filesErrors,
	...settlementsErrors,
	...usersErrors,
} as const;

export type ErrorCatalog = typeof ERROR_CATALOG;
export type AppErrorCode = keyof ErrorCatalog;

export type ErrorParams<Code extends AppErrorCode> =
	ErrorCatalog[Code] extends { paramsSchema: import("zod").ZodTypeAny }
		? import("zod").infer<ErrorCatalog[Code]["paramsSchema"]>
		: never;
