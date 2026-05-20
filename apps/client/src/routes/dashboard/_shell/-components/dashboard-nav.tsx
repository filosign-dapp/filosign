import { SidebarTrigger } from "@/src/lib/components/ui/sidebar";
import { NotificationsPopover } from "./notifications-popover";
import { UserDropdown } from "./user-dropdown";

export default function DashboardNav() {
	return (
		<header className="sticky top-0 z-40 flex h-20 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 md:px-6">
			<div className="flex items-center gap-2">
				<SidebarTrigger className="text-muted-foreground hover:bg-muted/50 hover:text-foreground md:hidden" />
			</div>

			<div className="flex shrink-0 items-center gap-2 md:gap-3">
				<NotificationsPopover />
				<UserDropdown />
			</div>
		</header>
	);
}
