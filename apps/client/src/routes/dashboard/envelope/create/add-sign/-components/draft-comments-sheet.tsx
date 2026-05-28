import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/src/lib/components/ui/sheet";
import { DraftCommentsProvider } from "@/src/lib/domains/drafts";
import {
	DraftCommentsComposer,
	DraftCommentsPanel,
} from "@/src/routes/dashboard/envelope/create/-components/draft-comments-panel";

export function DraftCommentsSheet(props: {
	draftId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Sheet open={props.open} onOpenChange={props.onOpenChange}>
			<SheetContent
				side="right"
				className="flex h-full w-full max-w-full flex-col gap-0 p-0 sm:max-w-md"
			>
				<DraftCommentsProvider draftId={props.draftId}>
					<SheetHeader className="shrink-0 border-b border-border px-4 pb-4 pt-4 pr-12">
						<SheetTitle>Draft Comments</SheetTitle>
						<SheetDescription className="text-pretty">
							Encrypted team notes while you prepare this envelope. Only people
							with draft access can read them.
						</SheetDescription>
					</SheetHeader>

					<DraftCommentsPanel className="flex-1" />

					<SheetFooter className="shrink-0 border-t border-border bg-background px-4 py-4">
						<DraftCommentsComposer className="w-full" />
					</SheetFooter>
				</DraftCommentsProvider>
			</SheetContent>
		</Sheet>
	);
}
