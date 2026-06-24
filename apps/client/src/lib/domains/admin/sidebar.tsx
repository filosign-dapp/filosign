import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import Logo from "@/src/lib/components/app/chrome/logo";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar,
} from "@/src/lib/components/ui/sidebar";
import { ADMIN_NAV_GROUPS, adminNavMatch } from "@/src/lib/domains/admin/nav";
import { cn } from "@/src/lib/utils";

export function AdminSidebar() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { state } = useSidebar();

	return (
		<Sidebar collapsible="icon" className="text-sidebar-foreground">
			<SidebarHeader className="flex h-20 justify-center border-b border-sidebar-border/80 px-2">
				<Logo
					redirectTo="/admin/"
					animatedLogo={false}
					isCollapsed={state === "collapsed"}
					textClassName="text-foreground"
				/>
			</SidebarHeader>

			<SidebarContent className="gap-0 px-1 py-3">
				{ADMIN_NAV_GROUPS.map((group) => (
					<SidebarGroup key={group.label} className="p-0 pb-4">
						<SidebarGroupLabel className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
							{group.label}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu className="gap-0.5">
								{group.items.map((item) => {
									const Icon = item.icon;
									const active = adminNavMatch(pathname, item.url);
									return (
										<SidebarMenuItem key={item.url}>
											<SidebarMenuButton
												render={<Link to={item.url} />}
												isActive={active}
												tooltip={item.title}
												className={cn(
													"h-8 gap-2 rounded-md px-2 text-sidebar-foreground/90",
													"hover:bg-sidebar-accent/80",
													active &&
														"bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-none",
												)}
											>
												<Icon className="size-4" aria-hidden />
												<span>{item.title}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>

			<SidebarFooter className="border-t border-sidebar-border/80 p-2">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							render={<Link to="/dashboard/document/all" />}
							tooltip="Back to dashboard"
							className="h-8 gap-2 rounded-md px-2 text-sidebar-foreground/90 hover:bg-sidebar-accent/80"
						>
							<ArrowLeftIcon className="size-4 shrink-0" aria-hidden />
							<span>Back to dashboard</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
