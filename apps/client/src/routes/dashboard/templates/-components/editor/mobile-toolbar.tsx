import { ListIcon } from "@phosphor-icons/react";
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
import { TemplateEditorSidebar } from "./sidebar";

export function TemplateEditorMobileToolbar() {
	const [sheetOpen, setSheetOpen] = useState(false);

	return (
		<>
			<div className="fixed bottom-24 left-4 z-50 lg:hidden">
				<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
					<SheetTrigger
						render={
							<Button
								type="button"
								variant="outline"
								size="icon-lg"
								className="rounded-full shadow-lg"
							/>
						}
					>
						<ListIcon className="size-5" weight="bold" />
					</SheetTrigger>
					<SheetContent side="left" className="w-[min(100vw-2rem,20rem)] p-0">
						<SheetHeader className="border-b border-border px-4 py-3">
							<SheetTitle>Template setup</SheetTitle>
						</SheetHeader>
						<div className="h-[calc(100%-3.5rem)] overflow-hidden">
							<TemplateEditorSidebar />
						</div>
					</SheetContent>
				</Sheet>
			</div>
			<MobileSignatureToolbar />
		</>
	);
}
