import { GearSixIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/src/lib/components/ui/sheet";
import {
	isTemplatePreviewMode,
	useTemplateEditorMode,
} from "@/src/lib/domains/templates/template-editor-mode";
import MobileSignatureToolbar from "@/src/routes/dashboard/envelope/create/add-sign/-components/mobile-toolbar";
import { TemplateContextRailMobileContent } from "./template-context-rail-content";
import { TemplatePreviewContextRailContent } from "./template-preview-context-rail-content";

export function TemplateEditorMobileToolbar() {
	const mode = useTemplateEditorMode();
	const [sheetOpen, setSheetOpen] = useState(false);
	const isPreview = isTemplatePreviewMode(mode);

	return (
		<>
			<div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-50 lg:hidden">
				<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
					<SheetTrigger
						render={
							<Button
								type="button"
								variant="outline"
								size="icon-lg"
								className="rounded-full shadow-lg"
								aria-label={isPreview ? "Template details" : "Template setup"}
							/>
						}
					>
						<GearSixIcon className="size-5" weight="bold" />
					</SheetTrigger>
					<SheetContent
						side="bottom"
						className="max-h-[85vh] overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
					>
						<SheetHeader>
							<SheetTitle>
								{isPreview ? "Template preview" : "Template setup"}
							</SheetTitle>
						</SheetHeader>
						<div className="mt-4">
							{isPreview ? (
								<TemplatePreviewContextRailContent />
							) : (
								<TemplateContextRailMobileContent />
							)}
						</div>
					</SheetContent>
				</Sheet>
			</div>
			{isPreview ? null : <MobileSignatureToolbar />}
		</>
	);
}
