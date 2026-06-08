import { useMemo } from "react";
import {
	DocumentListRail,
	type DocumentListRailItem,
} from "@/src/lib/domains/files/document-viewport";
import { SupplementaryPacketsSignPanel } from "@/src/routes/dashboard/document/sign/-components/supplementary-packets-sign-panel";
import {
	useSignPlacement,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

export function SignDocumentsRail() {
	const { documents, currentDocumentId, setCurrentDocumentId } =
		useSignViewer();
	const {
		visiblePlacementFields,
		myPlacementFields,
		fieldCompletions,
		completedFieldIds,
	} = useSignPlacement();

	const railDocuments = useMemo((): DocumentListRailItem[] => {
		return documents.map((doc) => {
			const docFields = myPlacementFields.filter(
				(f) => f.documentId === doc.id,
			);
			const done = docFields.filter(
				(f) =>
					completedFieldIds.includes(f.id) ||
					Boolean(fieldCompletions[f.id]?.textValue) ||
					Boolean(fieldCompletions[f.id]?.previewUrl),
			).length;
			const total = docFields.length;
			const meta =
				total > 0
					? `${done}/${total} fields done`
					: `${visiblePlacementFields.filter((f) => f.documentId === doc.id).length} fields`;
			return {
				id: doc.id,
				name: doc.name,
				meta,
			};
		});
	}, [
		documents,
		myPlacementFields,
		completedFieldIds,
		fieldCompletions,
		visiblePlacementFields,
	]);

	return (
		<DocumentListRail
			documents={railDocuments}
			currentDocumentId={currentDocumentId}
			onDocumentSelect={setCurrentDocumentId}
			borderSide="left"
			renderFooter={() => <SupplementaryPacketsSignPanel />}
		/>
	);
}
