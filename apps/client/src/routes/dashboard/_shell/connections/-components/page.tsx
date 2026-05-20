import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/src/lib/components/ui/tabs";
import AddRecipientDialog from "@/src/lib/domains/sharing/add-recipient-dialog";
import { ContactsTab } from "@/src/routes/dashboard/_shell/connections/-components/contacts-tab";
import { RequestsTab } from "@/src/routes/dashboard/_shell/connections/-components/requests-tab";
import { TabCount } from "@/src/routes/dashboard/_shell/connections/-components/tab-count";
import {
	ConnectionsProvider,
	useConnectionsContext,
} from "@/src/routes/dashboard/_shell/connections/-lib/context/context";
import type { ConnectionsController } from "@/src/routes/dashboard/_shell/connections/-lib/hooks/use-connections-controller";

function ConnectionsPageContent() {
	const { activeTab, handleTabChange, pendingWalletCount, onRequestCompleted } =
		useConnectionsContext();

	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background">
			<div className="border-b border-border px-6 py-5 md:px-8">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 space-y-0.5">
						<h1 className="text-base font-semibold text-foreground">
							Connections
						</h1>
						<p className="text-sm text-muted-foreground">
							Add someone by email or manage wallet connection requests.
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
				<Tabs
					value={activeTab}
					onValueChange={handleTabChange}
					className="flex min-h-0 flex-1 flex-col gap-0"
				>
					<TabsList className="mb-5 h-9 w-fit max-w-full">
						<TabsTrigger value="contacts" className="min-w-40">
							Connections
						</TabsTrigger>
						<TabsTrigger value="requests" className="min-w-40">
							<span className="flex items-center gap-1.5">
								Requests
								<TabCount count={pendingWalletCount} />
							</span>
						</TabsTrigger>
					</TabsList>

					<ContactsTab />
					<RequestsTab />
				</Tabs>
			</div>
		</div>
	);
}

export function ConnectionsPage({
	controller,
}: {
	controller: ConnectionsController;
}) {
	return (
		<ConnectionsProvider value={controller}>
			<ConnectionsPageContent />
		</ConnectionsProvider>
	);
}
