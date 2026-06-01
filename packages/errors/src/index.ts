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
export {
	LEGACY_MESSAGE_TO_APP_CODE,
	legacyAppCodeFromMessage,
} from "./legacy-messages";
export { presentError } from "./present-error";
export { resolveSupportUrl } from "./resolve-support-url";
export type {
	ErrorAudience,
	ErrorDefinition,
	ErrorSeverity,
	OrpcErrorCode,
	PresentErrorOptions,
	PresentedError,
} from "./types";
