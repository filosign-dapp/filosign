import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import AddRecipientDialog from "@/src/lib/domains/sharing/add-recipient-dialog";
import { InvitesTab } from "@/src/routes/dashboard/_shell/connections/-components/invites-tab";
import { useConnectionsContext } from "@/src/routes/dashboard/_shell/connections/-lib/context/context";

export function ConnectionsPageContent() {
	const { onRequestCompleted } = useConnectionsContext();

	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background">
			<div className="border-b border-border px-6 py-5 md:px-8">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 space-y-0.5">
						<h1 className="text-base font-semibold text-foreground">Invites</h1>
						<p className="text-sm text-muted-foreground">
							Invite people by email to join Filosign and receive documents from
							you.
						</p>
					</div>
					<AddRecipientDialog
						trigger={
							<Button variant="primary" size="sm" className="gap-1.5">
								<PlusIcon className="size-4" weight="bold" />
								Add recipient
							</Button>
						}
						onRequestCompleted={onRequestCompleted}
					/>
				</div>
			</div>

			<div className="flex min-h-0 flex-1 flex-col px-6 py-5 md:px-8">
				<InvitesTab />
			</div>
		</div>
	);
}
