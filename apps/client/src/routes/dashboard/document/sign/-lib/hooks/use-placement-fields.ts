import type { ViewFileResult } from "@filosign/react/files";
import type {
	FieldCompletionMap,
	ParsedPlacementForSigner,
} from "@filosign/shared";
import {
	canSubmitPlacementSign,
	fieldCompleteForSubmit,
	parsePlacementManifestForSigner,
} from "@filosign/shared";
import { useMemo } from "react";

export function useSignPlacementFields(options: {
	parsed?: ParsedPlacementForSigner;
	fileData: ViewFileResult | null;
	signerPlacementEmail: string | null;
	completedFieldIds: string[];
	fieldCompletions: FieldCompletionMap;
	canSign: boolean;
}) {
	const {
		parsed: parsedInput,
		fileData,
		signerPlacementEmail,
		completedFieldIds,
		fieldCompletions,
		canSign,
	} = options;

	const parsed = useMemo(() => {
		if (parsedInput) return parsedInput;
		return parsePlacementManifestForSigner(
			fileData?.placementManifest,
			signerPlacementEmail,
		);
	}, [parsedInput, fileData?.placementManifest, signerPlacementEmail]);

	const myPlacementFields = parsed.myFields;
	const visiblePlacementFields = parsed.allFields;

	const requiredPlacementFields = parsed.requiredFields;

	const canSubmitPlacementSignValue = useMemo(
		() =>
			canSubmitPlacementSign({
				canSign,
				myPlacementFields,
				requiredPlacementFields,
				fieldCompletions,
				completedFieldIds,
			}),
		[
			canSign,
			myPlacementFields,
			requiredPlacementFields,
			completedFieldIds,
			fieldCompletions,
		],
	);

	return {
		myPlacementFields,
		visiblePlacementFields,
		canSubmitPlacementSign: canSubmitPlacementSignValue,
	};
}

export { fieldCompleteForSubmit as placementFieldIsCompleteForSubmit };
