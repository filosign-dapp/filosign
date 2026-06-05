export {
	type AppErrorCode,
	ERROR_CATALOG,
	type ErrorCatalog,
	type ErrorParams,
} from "./catalog/index";
export {
	FilosignClientError,
	isFilosignClientError,
} from "./filosign-client-error";
export {
	getErrorDefinition,
	isAppErrorCode,
	listUserDocumentedErrors,
} from "./get-error-definition";
export { interpolateTemplate } from "./interpolate";
export {
	isOrpcErrorLike,
	type OrpcErrorLike,
	readAppCodeFromOrpc,
} from "./is-orpc-error";
export { isValidationOrpcError } from "./is-validation-orpc-error";
export { presentError } from "./present-error";
export { resolveSupportUrl } from "./resolve-support-url";
export {
	listSupportCenterEntries,
	SUPPORT_CATEGORIES,
	type SupportCategory,
	type SupportCenterEntry,
	supportCategoryForCode,
} from "./support-center";
export type {
	ErrorAudience,
	ErrorDefinition,
	ErrorSeverity,
	OrpcErrorCode,
	PresentErrorOptions,
	PresentedError,
} from "./types";
