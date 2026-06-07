import type { ComponentType } from "react";
import type {
	DocumentSharedContext,
	DocumentSharedIntent,
	DocumentSharedVariant,
} from "../../src/copy/document-shared";
import { BareboneLayout } from "./barebone/layout";
import { MatteLayout } from "./matte/layout";
import { ProtocolLayout } from "./protocol/layout";
import { StudioLayout } from "./studio/layout";
import type { EmailLayoutProps, EmailThemeId } from "./types";

type LayoutComponent = ComponentType<EmailLayoutProps>;

export function resolveDocumentSharedTheme(input: {
	variant: DocumentSharedVariant;
	intent: DocumentSharedIntent;
	context: DocumentSharedContext;
}): LayoutComponent {
	const { variant, intent, context } = input;

	if (context === "draft_review") {
		return StudioLayout;
	}

	if (intent === "reminder") {
		return MatteLayout;
	}

	if (variant === "cold") {
		return ProtocolLayout;
	}

	return BareboneLayout;
}

export function resolveDocumentSharedThemeId(input: {
	variant: DocumentSharedVariant;
	intent: DocumentSharedIntent;
	context: DocumentSharedContext;
}): EmailThemeId {
	const { variant, intent, context } = input;

	if (context === "draft_review") {
		return "studio";
	}

	if (intent === "reminder") {
		return "matte";
	}

	if (variant === "cold") {
		return "protocol";
	}

	return "barebone";
}

export function documentSharedBodyClassName(themeId: EmailThemeId): string {
	if (themeId === "barebone") {
		return "font-16 text-fg-2 mx-auto mt-0 mb-8 max-w-[380px] text-center font-sans";
	}

	return "font-14 text-fg-2 m-0 max-w-[480px] font-sans leading-6";
}
