import { createContext, type ReactNode, useContext } from "react";

export type TemplateEditorMode =
	| "create"
	| "edit"
	| "preview"
	| "system-create"
	| "system-edit";

const TemplateEditorModeContext = createContext<TemplateEditorMode | null>(
	null,
);

export function TemplateEditorModeProvider({
	mode,
	children,
}: {
	mode: TemplateEditorMode;
	children: ReactNode;
}) {
	return (
		<TemplateEditorModeContext.Provider value={mode}>
			{children}
		</TemplateEditorModeContext.Provider>
	);
}

export function useTemplateEditorMode(): TemplateEditorMode {
	const mode = useContext(TemplateEditorModeContext);
	if (!mode) {
		throw new Error(
			"useTemplateEditorMode requires TemplateEditorModeProvider",
		);
	}
	return mode;
}

export const TEMPLATE_EDITOR_MODE_LABEL: Record<TemplateEditorMode, string> = {
	create: "Creating",
	edit: "Editing",
	preview: "Preview",
	"system-create": "Creating system template",
	"system-edit": "Editing system template",
};

export const TEMPLATE_EDITOR_MODE_DESCRIPTION: Record<
	TemplateEditorMode,
	string
> = {
	create:
		"Assign roles, add documents, and place fields for your team blueprint.",
	edit: "Assign roles, add documents, and place fields for your team blueprint.",
	preview: "Review role placement before using this template for an envelope.",
	"system-create":
		"Assign roles, place fields, and publish to the Filosign template library.",
	"system-edit": "Update catalog fields and documents for workspace installs.",
};

export function isSystemTemplateEditorMode(
	mode: TemplateEditorMode,
): mode is "system-create" | "system-edit" {
	return mode === "system-create" || mode === "system-edit";
}

export function isTemplatePreviewMode(
	mode: TemplateEditorMode,
): mode is "preview" {
	return mode === "preview";
}
