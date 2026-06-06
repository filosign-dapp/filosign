import type { UserSignatureArtifact } from "@filosign/shared";
import {
	getSignatureFontCatalogEntry,
	getSignaturePreviewClassForRole,
} from "@filosign/shared";
import { cn } from "@/src/lib/utils/utils";

export function SignatureTypedPreview(props: {
	fontId: string;
	text: string;
	signatureRole: "signature" | "initial";
	className?: string;
	muted?: boolean;
}) {
	const entry = getSignatureFontCatalogEntry(props.fontId);

	return (
		<span
			className={cn(
				"signature-font-preview block max-w-full truncate",
				getSignaturePreviewClassForRole(props.fontId, props.signatureRole),
				props.muted && "text-muted-foreground",
				props.className,
			)}
			style={{ fontFamily: entry.cssFamily }}
		>
			{props.text}
		</span>
	);
}

export function SignatureArtifactPreview(props: {
	artifact: UserSignatureArtifact;
	alt: string;
	className?: string;
	imgClassName?: string;
}) {
	if (props.artifact.previewUrl) {
		const invertInDarkMode = props.artifact.kind === "drawn";
		return (
			<img
				src={props.artifact.previewUrl}
				alt={props.alt}
				className={cn(
					"max-h-full max-w-full object-contain",
					invertInDarkMode && "dark:invert",
					props.imgClassName,
					props.className,
				)}
			/>
		);
	}

	const typedMeta =
		props.artifact.kind === "typed" ? props.artifact.typedMeta : null;

	if (typedMeta) {
		return (
			<SignatureTypedPreview
				fontId={typedMeta.fontId}
				text={typedMeta.text}
				signatureRole={props.artifact.role}
				className={props.className}
			/>
		);
	}

	return (
		<span className="text-xs text-muted-foreground">Preview unavailable</span>
	);
}
