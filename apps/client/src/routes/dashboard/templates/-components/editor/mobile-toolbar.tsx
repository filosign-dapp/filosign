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
import MobileSignatureToolbar from "@/src/routes/dashboard/envelope/create/add-sign/-components/mobile-toolbar";
import { TemplateContextRailMobileContent } from "./template-context-rail-content";

export function TemplateEditorMobileToolbar() {
	const [sheetOpen, setSheetOpen] = useState(false);

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
								aria-label="Template setup"
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
							<SheetTitle>Template setup</SheetTitle>
						</SheetHeader>
						<div className="mt-4">
							<TemplateContextRailMobileContent />
						</div>
					</SheetContent>
				</Sheet>
			</div>
			<MobileSignatureToolbar />
		</>
	);
}
