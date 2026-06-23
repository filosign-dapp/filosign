import type {
	FieldCompletion,
	FieldCompletionWireRow,
	UserSignatureArtifact,
} from "@filosign/shared";
import {
	renderTypedSignatureSvg,
	resolveSignatureFontId,
} from "@filosign/shared";
import type { CSSProperties } from "react";
import { PLACEMENT_CHROME_REFERENCE_HEIGHT } from "@/src/lib/domains/files/placement-chrome-scale";
import { cn } from "@/src/lib/utils";

export const COMPACT_FIELD_DISPLAY_MAX_HEIGHT =
	PLACEMENT_CHROME_REFERENCE_HEIGHT * 0.75;

export function shouldUseCompactFieldDisplay(
	fieldHeightPx: number | undefined,
): boolean {
	return (
		fieldHeightPx !== undefined &&
		fieldHeightPx < COMPACT_FIELD_DISPLAY_MAX_HEIGHT
	);
}

export function compactFieldFontSize(fieldHeightPx: number): number {
	return Math.min(14, Math.max(6, fieldHeightPx * 0.72));
}

export function compactFieldTextStyle(fieldHeightPx: number): CSSProperties {
	return {
		fontSize: compactFieldFontSize(fieldHeightPx),
		lineHeight: 1.1,
	};
}

type PlacementFieldCompactTextProps = {
	text: string;
	fieldHeightPx: number;
	className?: string;
};

/** Crisp text content sized to tiny field boxes; render inside PlacementFieldChrome. */
export function PlacementFieldCompactText({
	text,
	fieldHeightPx,
	className,
}: PlacementFieldCompactTextProps) {
	return (
		<span
			className={cn(
				"block w-full min-w-0 truncate px-0.5 text-left text-placement-fill-interactive-foreground",
				className,
			)}
			style={compactFieldTextStyle(fieldHeightPx)}
		>
			{text}
		</span>
	);
}

export function compactVisualPreviewSrc(args: {
	completion: FieldCompletion | FieldCompletionWireRow;
	artifact?: Pick<
		UserSignatureArtifact,
		"kind" | "role" | "typedMeta" | "previewUrl"
	> | null;
}): string | null {
	const { completion, artifact } = args;
	if (artifact?.kind === "typed" && artifact.typedMeta) {
		const svg = renderTypedSignatureSvg({
			text: artifact.typedMeta.text,
			fontId: resolveSignatureFontId(artifact.typedMeta.fontId),
		});
		return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
	}
	return completion.previewUrl;
}

type PlacementFieldCompactVisualProps = {
	previewSrc: string | null;
	className?: string;
};

/** Crisp visual preview for tiny fields; render inside PlacementFieldChrome applied shell. */
export function PlacementFieldCompactVisual({
	previewSrc,
	className,
}: PlacementFieldCompactVisualProps) {
	if (!previewSrc) {
		return <div className={cn("h-full w-full bg-muted/40", className)} />;
	}

	return (
		<img
			src={previewSrc}
			alt=""
			className={cn("h-full w-full object-contain object-center", className)}
		/>
	);
}
