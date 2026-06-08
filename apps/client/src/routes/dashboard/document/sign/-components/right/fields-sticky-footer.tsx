import type { PlacementField } from "@filosign/shared";
import { SignSidebar } from "@/src/routes/dashboard/document/sign/-components/sidebar";
import {
	useSignPlacement,
	useSignSigning,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

export function SignFieldsStickyFooter() {
	const {
		myPlacementFields,
		fieldCompletions,
		completedFieldIds,
		togglePlacementField,
		clearPlacementField,
		isFieldComplete,
		canSubmitPlacementSign,
	} = useSignPlacement();
	const { canSign, alreadySigned } = useSignSigning();
	const { requestFieldFocus, setCurrentDocumentId } = useSignViewer();

	const hasFields = myPlacementFields.length > 0;
	const showChecklist = hasFields && (canSign || alreadySigned);

	if (!showChecklist) return null;

	const fieldsChecklistProps = {
		fields: myPlacementFields,
		fieldCompletions,
		completedFieldIds,
		alreadySigned,
		canSign,
		canSubmitPlacementSign,
		isFieldComplete,
		onToggleField: (field: Parameters<typeof togglePlacementField>[0]) =>
			void togglePlacementField(field),
		onClearField: clearPlacementField,
		onFocusField: (field: PlacementField) => {
			setCurrentDocumentId(field.documentId);
			requestFieldFocus(field.id);
		},
	};

	return (
		<div className="shrink-0 border-t border-border bg-background/95 p-4 backdrop-blur-sm">
			<header className="mb-3 space-y-1">
				<h3 className="font-manrope text-sm font-semibold text-foreground">
					Your fields
				</h3>
				<p className="text-[11px] leading-normal text-muted-foreground">
					{alreadySigned
						? "Your signature is recorded. Field markers show where you signed."
						: "Complete each assigned field on the document before signing."}
				</p>
			</header>
			<SignSidebar.FieldsChecklist {...fieldsChecklistProps} />
		</div>
	);
}
