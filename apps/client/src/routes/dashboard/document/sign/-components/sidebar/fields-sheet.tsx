import { ListChecksIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/src/lib/components/ui/sheet";
import {
	SignSidebarFieldsChecklist,
	type SignSidebarFieldsChecklistProps,
} from "./fields-checklist";

export function SignSidebarFieldsSheet(props: SignSidebarFieldsChecklistProps) {
	if (props.fields.length === 0) return null;
	if (!props.canSign && !props.alreadySigned) return null;

	return (
		<Sheet>
			<SheetTrigger
				render={
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="lg:hidden"
					/>
				}
			>
				<ListChecksIcon className="size-4" />
				Fields
			</SheetTrigger>
			<SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Your fields</SheetTitle>
				</SheetHeader>
				<div className="mt-4 px-1">
					<SignSidebarFieldsChecklist {...props} />
				</div>
			</SheetContent>
		</Sheet>
	);
}
