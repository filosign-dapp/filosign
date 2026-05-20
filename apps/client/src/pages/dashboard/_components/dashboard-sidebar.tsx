import {
	BuildingsIcon,
	CaretRightIcon,
	EnvelopeSimpleIcon,
	HouseIcon,
	SealIcon,
	UserCircleIcon,
	UsersThreeIcon,
} from "@phosphor-icons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import Logo from "@/src/lib/components/custom/Logo";
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
import { cn } from "@/src/lib/utils/index";

type NavItem = {
	title: string;
	url: string;
	icon: typeof HouseIcon;
	match: (pathname: string) => boolean;
	tooltip: string;
};

function matchExact(pathname: string, path: string) {
	const n = pathname.replace(/\/$/, "") || "/";
	const p = path.replace(/\/$/, "") || "/";
	return n === p;
}

function matchPrefix(pathname: string, prefix: string) {
	const n = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
	const pre = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
	return n === pre || n.startsWith(`${pre}/`);
}

const groups: { label: string; items: NavItem[] }[] = [
	{
		label: "Workspace",
		items: [
			{
				title: "Home",
				url: "/dashboard/",
				icon: HouseIcon,
				match: (p) =>
					matchExact(p, "/dashboard") || matchExact(p, "/dashboard/"),
				tooltip: "Home",
			},
		],
	},
	{
		label: "Create",
		items: [
			{
				title: "Envelope",
				url: "/dashboard/envelope/create",
				icon: EnvelopeSimpleIcon,
				match: (p) => matchPrefix(p, "/dashboard/envelope/create"),
				tooltip: "New envelope",
			},
			{
				title: "Signature",
				url: "/dashboard/signature/create",
				icon: SealIcon,
				match: (p) => matchPrefix(p, "/dashboard/signature/create"),
				tooltip: "New signature",
			},
		],
	},
	{
		label: "People",
		items: [
			{
				title: "Connections",
				url: "/dashboard/connections",
				icon: UsersThreeIcon,
				match: (p) => matchPrefix(p, "/dashboard/connections"),
				tooltip: "Your Recipients",
			},
		],
	},
	{
		label: "Account",
		items: [
			{
				title: "Profile",
				url: "/dashboard/settings/profile",
				icon: UserCircleIcon,
				match: (p) => matchPrefix(p, "/dashboard/settings/profile"),
				tooltip: "Profile",
			},
			{
				title: "Team",
				url: "/dashboard/settings/team",
				icon: BuildingsIcon,
				match: (p) => matchPrefix(p, "/dashboard/settings/team"),
				tooltip: "Team",
			},
		],
	},
];

export function DashboardSidebar() {
	const pathname = useRouterState({
		select: (s) => s.location.pathname,
	});
	const { state } = useSidebar();

	return (
		<Sidebar collapsible="icon" className="text-sidebar-foreground">
			<SidebarHeader className="gap-3 border-b border-sidebar-border/80 px-2 h-20">
				<div className={cn("flex items-center justify-start gap-2")}>
					<Logo
						iconOnly={state === "collapsed"}
						isCollapsed={state === "collapsed"}
						textClassName="text-foreground font-semibold"
					/>
				</div>
			</SidebarHeader>

			<SidebarContent className="gap-0 px-1 py-3">
				{groups.map((group) => (
					<SidebarGroup key={group.label} className="p-0 pb-4">
						<SidebarGroupLabel className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
							{group.label}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu className="gap-0.5">
								{group.items.map((item) => {
									const Icon = item.icon;
									const active = item.match(pathname);
									return (
										<SidebarMenuItem key={item.url}>
											<SidebarMenuButton
												isActive={active}
												tooltip={item.tooltip}
												className={cn(
													"h-8 gap-2 rounded-md px-2 text-sidebar-foreground/90",
													"hover:bg-sidebar-accent/80",
													active &&
														"bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-none",
												)}
												render={<Link to={item.url} />}
											>
												<Icon className="size-4 opacity-80" weight="regular" />
												<span className="truncate">{item.title}</span>
												<CaretRightIcon
													className="ml-auto size-3 shrink-0 opacity-35 group-data-[collapsible=icon]:hidden"
													weight="bold"
												/>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>

			<SidebarFooter className="border-t border-sidebar-border/70 p-2 group-data-[collapsible=icon]:py-2">
				<p className="truncate px-2 text-[10px] leading-relaxed text-muted-foreground/55 group-data-[collapsible=icon]:hidden">
					Private document signing
				</p>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
