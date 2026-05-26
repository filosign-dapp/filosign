import {
	ArrowClockwiseIcon,
	BellIcon,
	CheckCircleIcon,
	FileTextIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/src/lib/components/ui/popover";
import { useNotificationsController } from "@/src/routes/dashboard/_shell/-lib/hooks/use-notifications-controller";
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
									? `${n.notificationCount} document${n.notificationCount > 1 ? "s" : ""} to review`
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

					{n.allReceivedFiles.length > 0 && (
						<div className="p-4">
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
								No new documents at this time.
							</p>
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
