import { z } from "zod";
import type { ErrorDefinition } from "../types";

export const platformErrors = {
	"PLATFORM.SYSTEM_TEMPLATE_NOT_FOUND": {
		title: "System template not found",
		description: "The catalog template could not be found.",
		steps: [
			"Verify the template still exists in the admin catalog.",
			"Refresh the page and try again.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"PLATFORM.SYSTEM_TEMPLATE_NOT_PUBLISHED": {
		title: "System template unavailable",
		description:
			"This catalog template is not published for workspace installs.",
		steps: [
			"Choose another template from the Library.",
			"Ask a platform admin to publish this template.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"PLATFORM.SYSTEM_TEMPLATE_NOT_PUBLISHABLE": {
		title: "Cannot publish system template",
		description: "Archived catalog templates cannot be published.",
		steps: [
			"Restore the template to draft before publishing changes.",
			"Create a new catalog entry if you need a separate version.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "CONFLICT",
	},
	"PLATFORM.SYSTEM_TEMPLATE_EMPTY": {
		title: "System template has no documents",
		description: "Add at least one PDF before publishing a catalog template.",
		steps: ["Upload a document in the system template editor, then publish."],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"PLATFORM.SYSTEM_TEMPLATE_DELETE_FORBIDDEN": {
		title: "Cannot delete published template",
		description:
			"Published catalog templates must be archived instead of deleted.",
		steps: ["Archive the template to hide it from the Library."],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "CONFLICT",
	},
	"PLATFORM.SYSTEM_TEMPLATE_INVALID_DOCUMENT_KEY": {
		title: "Invalid system template document",
		description: "A catalog document reference is invalid for this template.",
		steps: ["Re-save the template from the system template editor."],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
		paramsSchema: z.object({
			docId: z.string(),
		}),
	},
} as const satisfies Record<string, ErrorDefinition>;
