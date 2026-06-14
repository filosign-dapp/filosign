export type EnvelopeSendValidationFailure = {
	kind: "silent" | "toast";
	message?: string;
	title?: string;
	hint?: string;
};
