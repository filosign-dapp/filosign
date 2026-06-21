import {
	isSystemTemplateEditorMode,
	isTemplatePreviewMode,
	useTemplateEditorMode,
} from "@/src/lib/domains/templates/template-editor-mode";
import { TemplateEditorActions } from "./actions";
import { TemplatePreviewActions } from "./preview-actions";
import { SystemTemplateEditorActions } from "./system-template-editor-actions";

type Props = {
	templateId: string;
	templateName: string;
	onUseTemplate?: () => void;
	useTemplatePending?: boolean;
	systemTemplateMeta?: {
		category?: string;
		documentVersion?: string;
		tags?: string[];
	};
};

export function TemplateEditorHeaderActions({
	templateId,
	templateName,
	onUseTemplate,
	useTemplatePending,
	systemTemplateMeta,
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

	if (isSystemTemplateEditorMode(mode)) {
		return (
			<SystemTemplateEditorActions
				mode={mode}
				systemTemplateId={templateId}
				templateName={templateName}
				defaultCategory={systemTemplateMeta?.category}
				defaultDocumentVersion={systemTemplateMeta?.documentVersion}
				defaultTags={systemTemplateMeta?.tags}
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
