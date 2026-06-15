import { createContext, type ReactNode, useContext } from "react";

export type TemplateEditorMode = "create" | "edit" | "preview";

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
};

export const TEMPLATE_EDITOR_MODE_DESCRIPTION: Record<
	TemplateEditorMode,
	string
> = {
	create:
		"Assign roles, add documents, and place fields for your team blueprint.",
	edit: "Assign roles, add documents, and place fields for your team blueprint.",
	preview: "Review role placement before using this template for an envelope.",
};

export function isTemplatePreviewMode(
	mode: TemplateEditorMode,
): mode is "preview" {
	return mode === "preview";
}
