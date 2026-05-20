import type { ViewFileResult } from "@filosign/react/files";
import { zPlacementManifest } from "@filosign/shared";
import { useMemo } from "react";

export function useSignPlacement(options: {
	fileData: ViewFileResult | null;
	signerPlacementEmail: string | null;
	completedFieldIds: string[];
	canSign: boolean;
}) {
	const { fileData, signerPlacementEmail, completedFieldIds, canSign } =
		options;

	const myPlacementFields = useMemo(() => {
		if (!signerPlacementEmail || !fileData?.placementManifest) return [];
		const parsed = zPlacementManifest.safeParse(fileData.placementManifest);
		if (!parsed.success) return [];
		return parsed.data.fields.filter(
			(f) => f.assignedRecipientEmail === signerPlacementEmail,
		);
	}, [fileData?.placementManifest, signerPlacementEmail]);

	const signPdfPageCountHint = useMemo(() => {
		if (myPlacementFields.length === 0) return null;
		return Math.max(...myPlacementFields.map((f) => f.pageIndex)) + 1;
	}, [myPlacementFields]);

	const requiredPlacementIds = useMemo(
		() => myPlacementFields.filter((f) => f.required).map((f) => f.id),
		[myPlacementFields],
	);

	const canSubmitPlacementSign = useMemo(() => {
		if (!canSign || myPlacementFields.length === 0) return false;
		const requiredOk =
			requiredPlacementIds.length === 0 ||
			requiredPlacementIds.every((id) => completedFieldIds.includes(id));
		const hasLeaf = completedFieldIds.length > 0;
		return requiredOk && hasLeaf;
	}, [
		canSign,
		myPlacementFields.length,
		requiredPlacementIds,
		completedFieldIds,
	]);

	return {
		myPlacementFields,
		signPdfPageCountHint,
		canSubmitPlacementSign,
	};
}
