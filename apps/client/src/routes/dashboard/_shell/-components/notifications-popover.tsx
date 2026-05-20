import {
	ArrowClockwiseIcon,
	BellIcon,
	CheckCircleIcon,
	FileTextIcon,
	UserCheckIcon,
} from "@phosphor-icons/react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/src/lib/components/ui/alert-dialog";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/src/lib/components/ui/popover";
import { Separator } from "@/src/lib/components/ui/separator";
import { useNotificationsController } from "@/src/routes/dashboard/_shell/-lib/hooks/use-notifications-controller";
import { NotificationItemCard } from "./notification-item-card";
import { ReceivedFileNotification } from "./received-file-notification";

export function NotificationsPopover() {
	const n = useNotificationsController();

	return (
		<Popover open={n.open} onOpenChange={n.setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon-lg"
						className="relative rounded-full transition-all duration-150 hover:bg-accent/50"
					/>
				}
			>
				<div className="flex aspect-square size-8 items-center justify-center bg-muted/10 rounded-full">
					<BellIcon className="size-5 text-muted-foreground" weight="bold" />
				</div>
				{n.notificationCount > 0 && (
					<Badge
						variant="destructive"
						className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
					>
						{n.notificationCount > 9 ? "9+" : n.notificationCount}
					</Badge>
				)}
			</PopoverTrigger>

			<PopoverContent className="w-96 mt-2 p-0" align="end">
				<div className="p-4 border-b">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-manrope">Notifications</h3>
							<p className="text-sm text-muted-foreground mt-1 font-manrope">
								{n.notificationCount > 0
									? `${n.notificationCount} pending action${n.notificationCount > 1 ? "s" : ""}`
									: "You're all caught up!"}
							</p>
						</div>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={n.refetchInbox}
							disabled={n.isFetching}
						>
							<ArrowClockwiseIcon className="h-3 w-3" />
						</Button>
					</div>
				</div>

				<div className="max-h-96 overflow-y-auto">
					{n.isLoading && (
						<div className="p-8 text-center">
							<div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
							<p className="text-sm text-muted-foreground">
								Loading notifications...
							</p>
						</div>
					)}

					{n.pendingRequests.length > 0 && (
						<div className="p-4">
							<div className="flex items-center gap-2 mb-4">
								<UserCheckIcon className="h-4 w-4 text-primary" />
								<h4 className="text-sm font-semibold">Sharing Requests</h4>
								<Badge variant="secondary" className="text-xs">
									{n.pendingRequests.length}
								</Badge>
							</div>

							<div className="space-y-3">
								{n.pendingRequests.map((req) => (
									<NotificationItemCard
										key={req.id}
										icon={<UserCheckIcon className="h-4 w-4 text-primary" />}
										title={`From: ${n.formatAddress(req.senderWallet)}`}
										subtitle={req.message || "No message provided"}
										variant="default"
										actionButton={{
											label: n.allowSharing.isPending
												? "Accepting..."
												: "Accept",
											onClick: () =>
												n.handleAllowSharing(req.id, req.senderWallet),
											loading: n.allowSharing.isPending,
											variant: "default",
										}}
									/>
								))}
							</div>
						</div>
					)}

					{n.allReceivedFiles.length > 0 && (
						<div className="p-4">
							{n.pendingRequests.length > 0 && <Separator className="mb-4" />}

							<div className="flex items-center gap-2 mb-4">
								<FileTextIcon className="h-4 w-4 text-primary" />
								<h4 className="text-sm font-semibold">Received Files</h4>
								<Badge variant="secondary" className="text-xs">
									{n.allReceivedFiles.length}
								</Badge>
							</div>

							<div className="space-y-3">
								{n.allReceivedFiles.map((file) => (
									<ReceivedFileNotification
										key={file.pieceCid}
										pieceCid={file.pieceCid}
										sender={file.sender}
										file={n.fileInfoByPieceCid.get(file.pieceCid)}
										setOpen={n.setOpen}
										formatAddress={n.formatAddress}
									/>
								))}
							</div>
						</div>
					)}

					{n.notificationCount === 0 && !n.isLoading && (
						<div className="p-8 text-center">
							<CheckCircleIcon className="h-12 w-12 text-chart-2 mx-auto mb-3" />
							<h4 className="text-sm font-medium mb-1">All caught up!</h4>
							<p className="text-xs text-muted-foreground">
								No pending actions at this time.
							</p>
						</div>
					)}
				</div>
			</PopoverContent>

			<AlertDialog
				open={n.confirmDialogOpen}
				onOpenChange={n.setConfirmDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Accept Sharing Request</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to accept this sharing request? This will
							allow the sender to share documents with you.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={n.closeConfirmDialog}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => void n.confirmAllowSharing()}
							disabled={n.allowSharing.isPending}
						>
							{n.allowSharing.isPending ? "Accepting..." : "Accept Request"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Popover>
	);
}
