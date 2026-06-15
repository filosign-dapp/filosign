import type {
	UserSignatureArtifact,
	UserSignatureRole,
} from "@filosign/shared";
import { getSignatureFontCatalogEntry } from "@filosign/shared";
import { cn } from "@/src/lib/utils/utils";

const shellTypedSizeClass: Record<UserSignatureRole, string> = {
	signature: "text-xl leading-snug",
	initial: "text-base leading-snug",
};

export function SignatureTypedPreview(props: {
	fontId: string;
	text: string;
	signatureRole: "signature" | "initial";
	className?: string;
	muted?: boolean;
	inPreviewShell?: boolean;
}) {
	const entry = getSignatureFontCatalogEntry(props.fontId);
	const sizeClass = props.inPreviewShell
		? shellTypedSizeClass[props.signatureRole]
		: props.signatureRole === "initial"
			? entry.initialTextClass
			: entry.signatureTextClass;

	return (
		<span
			className={cn(
				"signature-font-preview block max-w-full text-foreground",
				props.inPreviewShell
					? "overflow-hidden text-ellipsis whitespace-nowrap"
					: "truncate leading-none",
				sizeClass,
				props.muted && "text-muted-foreground",
				props.muted && props.inPreviewShell && "opacity-60",
				props.className,
			)}
			style={{ fontFamily: entry.cssFamily }}
		>
			{props.text}
		</span>
	);
}

function PreviewShellImage(props: {
	src: string;
	alt: string;
	invertInDarkMode: boolean;
	className?: string;
	imgClassName?: string;
}) {
	return (
		<div className="flex h-full w-full min-h-0 items-center justify-center">
			<img
				src={props.src}
				alt={props.alt}
				className={cn(
					"max-h-full max-w-full object-contain object-center",
					props.invertInDarkMode && "dark:invert",
					props.imgClassName,
					props.className,
				)}
			/>
		</div>
	);
}

export function SignatureArtifactPreview(props: {
	artifact: UserSignatureArtifact;
	alt: string;
	className?: string;
	imgClassName?: string;
	inPreviewShell?: boolean;
}) {
	const typedMeta =
		props.artifact.kind === "typed" ? props.artifact.typedMeta : null;

	// Shell previews match Choose tab (live CSS). Stored PNGs may clip script ascenders.
	if (props.inPreviewShell && typedMeta) {
		return (
			<SignatureTypedPreview
				fontId={typedMeta.fontId}
				text={typedMeta.text}
				signatureRole={props.artifact.role}
				className={props.className}
				inPreviewShell
			/>
		);
	}

	if (props.artifact.previewUrl) {
		const invertInDarkMode = Boolean(
			props.inPreviewShell &&
				(props.artifact.kind === "typed" || props.artifact.kind === "drawn"),
		);

		if (props.inPreviewShell) {
			return (
				<PreviewShellImage
					src={props.artifact.previewUrl}
					alt={props.alt}
					invertInDarkMode={invertInDarkMode}
					className={props.className}
					imgClassName={props.imgClassName}
				/>
			);
		}

		return (
			<img
				src={props.artifact.previewUrl}
				alt={props.alt}
				className={cn(
					"max-h-full max-w-full object-contain object-center",
					invertInDarkMode && "dark:invert",
					props.imgClassName,
					props.className,
				)}
			/>
		);
	}

	if (typedMeta) {
		return (
			<SignatureTypedPreview
				fontId={typedMeta.fontId}
				text={typedMeta.text}
				signatureRole={props.artifact.role}
				className={props.className}
				inPreviewShell={props.inPreviewShell}
			/>
		);
	}

	return (
		<span className="text-xs text-muted-foreground">Preview unavailable</span>
	);
}
