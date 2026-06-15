import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/src/lib/components/ui/sheet";
import { TemplateRolesPanel } from "./template-roles-panel";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function TemplateRolesManageSheet({ open, onOpenChange }: Props) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex w-[min(100vw-2rem,24rem)] flex-col p-0 sm:max-w-md"
			>
				<SheetHeader className="border-b border-border px-4 py-3">
					<SheetTitle>Template roles</SheetTitle>
				</SheetHeader>
				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<TemplateRolesPanel />
				</div>
			</SheetContent>
		</Sheet>
	);
}
