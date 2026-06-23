import {
	buildVisualCompletionFromArtifact,
	type FieldCompletion,
	type PlacementField,
	placementFieldPixelRect,
	typedSignatureNeedsFieldReraster,
	type UserSignatureArtifact,
} from "@filosign/shared";
import { rasterizeTypedSignature } from "./rasterize-typed-signature";
import { bytesToDataUrl } from "./upload-user-signature";

export async function buildVisualCompletionForPlacementField(args: {
	field: PlacementField;
	artifact: UserSignatureArtifact;
	layoutWidth: number;
	layoutHeight: number;
}): Promise<FieldCompletion> {
	const base = buildVisualCompletionFromArtifact(args.field, args.artifact);

	if (
		args.artifact.kind !== "typed" ||
		!args.artifact.typedMeta ||
		!typedSignatureNeedsFieldReraster({
			field: args.field,
			artifact: args.artifact,
			role: args.artifact.role,
			layoutWidth: args.layoutWidth,
			layoutHeight: args.layoutHeight,
		})
	) {
		return base;
	}

	const fieldPx = placementFieldPixelRect(
		args.field,
		args.layoutWidth,
		args.layoutHeight,
	);
	const bytes = await rasterizeTypedSignature({
		text: args.artifact.typedMeta.text,
		fontId: args.artifact.typedMeta.fontId,
		role: args.artifact.role,
		boxWidth: fieldPx.width,
		boxHeight: fieldPx.height,
	});

	return {
		...base,
		previewUrl: bytesToDataUrl(bytes, "image/png"),
	};
}
