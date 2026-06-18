import {
	ArrowClockwiseIcon,
	BellIcon,
	CheckCircleIcon,
	FileTextIcon,
} from "@phosphor-icons/react";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/src/lib/components/ui/popover";
import { useDelayedLoading } from "@/src/lib/utils/use-delayed-loading";
import { useNotificationsController } from "@/src/routes/dashboard/_shell/-lib/hooks/use-notifications-controller";
import { NotificationItem } from "./notification-item";

export function NotificationsPopover() {
	const n = useNotificationsController();
	const showLoading = useDelayedLoading(n.isLoading);

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
					{showLoading && (
						<div className="p-8 text-center">
							<InlineLoader size="md" className="mx-auto mb-3" />
							<p className="text-sm text-muted-foreground">
								Loading notifications...
							</p>
						</div>
					)}

					{n.items.length > 0 && (
						<div className="p-4">
							<div className="flex items-center gap-2 mb-4">
								<FileTextIcon className="h-4 w-4 text-primary" />
								<h4 className="text-sm font-semibold">Received Files</h4>
								<Badge variant="secondary" className="text-xs">
									{n.items.length}
								</Badge>
							</div>

							<div className="space-y-3">
								{n.items.map((item) => (
									<NotificationItem
										key={item.id}
										item={item}
										setOpen={n.setOpen}
									/>
								))}
							</div>
						</div>
					)}

					{n.notificationCount === 0 && !showLoading && (
						<AppEmptyState
							preset="inline"
							variant="muted"
							icon={CheckCircleIcon}
							title="All caught up!"
							description="No new documents at this time."
							className="border-transparent py-8"
						/>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
