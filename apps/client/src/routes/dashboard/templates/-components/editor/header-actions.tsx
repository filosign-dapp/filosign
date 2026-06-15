import {
	isTemplatePreviewMode,
	useTemplateEditorMode,
} from "@/src/lib/domains/templates/template-editor-mode";
import { TemplateEditorActions } from "./actions";
import { TemplatePreviewActions } from "./preview-actions";

type Props = {
	templateId: string;
	templateName: string;
	onUseTemplate?: () => void;
	useTemplatePending?: boolean;
};

export function TemplateEditorHeaderActions({
	templateId,
	templateName,
	onUseTemplate,
	useTemplatePending,
}: Props) {
	const mode = useTemplateEditorMode();

	if (isTemplatePreviewMode(mode)) {
		if (!onUseTemplate) return null;
		return (
			<TemplatePreviewActions
				templateId={templateId}
				onUseTemplate={onUseTemplate}
				usePending={useTemplatePending}
			/>
		);
	}

	return (
		<TemplateEditorActions
			mode={mode}
			templateId={templateId}
			templateName={templateName}
		/>
	);
}
