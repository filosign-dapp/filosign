import { useFilosignContext } from "@filosign/react";
import { useEntitlements } from "@filosign/react/billing";
import {
	useActiveOrganization,
	useActiveOrgId,
	useCreateOrganization,
	useInviteOrgMember,
	useOrganizations,
} from "@filosign/react/orgs";
import {
	BookOpenIcon,
	BuildingsIcon,
	CaretRightIcon,
	CaretUpDownIcon,
	CheckIcon,
	CreditCardIcon,
	EnvelopeSimpleIcon,
	FileTextIcon,
	GearIcon,
	HouseIcon,
	PlusIcon,
	QuestionIcon,
	SealIcon,
	ShieldCheckIcon,
	UserCircleIcon,
	UserPlusIcon,
	UsersThreeIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
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
import { BILLING_SETTINGS_PATH } from "@/src/lib/domains/billing/settings-path";
import { useStartNewEnvelope } from "@/src/lib/domains/drafts";
import {
	UpgradePlanDialog,
	type UpgradePlanLimitReason,
} from "@/src/lib/domains/entitlements/upgrade-plan-dialog";
import { useSetPersistedActiveOrganizationId } from "@/src/lib/filosign/persisted-active-org";
import { cn } from "@/src/lib/utils/index";

type NavItem = {
	title: string;
	url: string;
	search?: Record<string, string | undefined>;
	icon: typeof HouseIcon;
	match: (pathname: string) => boolean;
	/** When set, item is active only if search matches (e.g. documents tab). */
	matchSearch?: (search: Record<string, unknown>) => boolean;
	tooltip: string;
	/** Clear open envelope draft before navigating (new envelope, not resume). */
	resetComposer?: boolean;
};

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
				url: "/dashboard/document/all/",
				icon: HouseIcon,
				match: (p) => matchPrefix(p, "/dashboard/document/all"),
				matchSearch: (search) => search.tab !== "drafts",
				tooltip: "Home",
			},
			{
				title: "Templates",
				url: "/dashboard/templates/",
				icon: FileTextIcon,
				match: (p) => matchPrefix(p, "/dashboard/templates"),
				tooltip: "Shared templates",
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
				resetComposer: true,
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
		label: "Support",
		items: [
			{
				title: "Support Center",
				url: "/dashboard/support/",
				icon: QuestionIcon,
				match: (p) => {
					const n = p.endsWith("/") ? p.slice(0, -1) : p;
					return n === "/dashboard/support";
				},
				tooltip: "Support Center",
			},
			{
				title: "Tutorials",
				url: "/dashboard/support/tutorials",
				icon: BookOpenIcon,
				match: (p) => matchPrefix(p, "/dashboard/support/tutorials"),
				tooltip: "Tutorials and guides",
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
				title: "Billing",
				url: BILLING_SETTINGS_PATH,
				icon: CreditCardIcon,
				match: (p) => matchPrefix(p, BILLING_SETTINGS_PATH),
				tooltip: "Billing",
			},
			{
				title: "Workspace",
				url: "/dashboard/settings/workspace",
				icon: BuildingsIcon,
				match: (p) => matchPrefix(p, "/dashboard/settings/workspace"),
				tooltip: "Workspace Settings",
			},
		],
	},
];

function CreateWorkspaceDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const createOrg = useCreateOrganization();
	const setActiveOrg = useSetPersistedActiveOrganizationId();
	const [name, setName] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		try {
			const res = await createOrg.mutateAsync({ name: name.trim() });
			if (res?.organization?.id) {
				setActiveOrg(res.organization.id);
				toast.success("Workspace created!");
				props.onOpenChange(false);
				setName("");
			}
		} catch {}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create new workspace</DialogTitle>
					<DialogDescription>
						A workspace is where you work, organize drafts, and invite members.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					<div className="space-y-2">
						<Label htmlFor="create-workspace-name">Workspace Name</Label>
						<Input
							id="create-workspace-name"
							placeholder="Acme Corp"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => props.onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={createOrg.isPending || !name.trim()}
						>
							{createOrg.isPending ? "Creating..." : "Create Workspace"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function InviteTeammateDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const inviteMember = useInviteOrgMember();
	const [email, setEmail] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) return;
		try {
			await inviteMember.mutateAsync({ email: email.trim() });
			toast.success("Teammate invited successfully!");
			setEmail("");
			props.onOpenChange(false);
		} catch {}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite teammate to workspace</DialogTitle>
					<DialogDescription>
						Enter your teammate's email address. Once they register/login, they
						will be automatically added to this workspace.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					<div className="space-y-2">
						<Label htmlFor="invite-teammate-email">Email Address</Label>
						<Input
							id="invite-teammate-email"
							type="email"
							placeholder="colleague@company.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => props.onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={inviteMember.isPending || !email.includes("@")}
						>
							{inviteMember.isPending ? "Inviting..." : "Invite"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function DashboardSidebar() {
	const { rpcQuery } = useFilosignContext();
	const navigate = useNavigate();
	const startNewEnvelope = useStartNewEnvelope();
	const pathname = useRouterState({
		select: (s) => s.location.pathname,
	});
	const locationSearch = useRouterState({
		select: (s) => s.location.search as Record<string, unknown>,
	});
	const { state } = useSidebar();

	const adminAccessQuery = useQuery({
		...rpcQuery.platformAdmin.access.queryOptions(),
		staleTime: 60_000,
	});
	const showAdminNav = adminAccessQuery.data?.isAdmin === true;

	const { data: orgsData } = useOrganizations();
	const activeOrgId = useActiveOrgId();
	const activeOrg = useActiveOrganization();
	const setActiveOrg = useSetPersistedActiveOrganizationId();
	const { data: entitlements } = useEntitlements();

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isInviteOpen, setIsInviteOpen] = useState(false);
	const [upgradeOpen, setUpgradeOpen] = useState(false);
	const [upgradeReason, setUpgradeReason] = useState<UpgradePlanLimitReason>(
		"features.shared_templates",
	);

	const hasCollaboration = Boolean(
		entitlements?.features["features.shared_templates"]?.enabled,
	);

	const orgs = orgsData?.organizations ?? [];

	return (
		<>
			<Sidebar collapsible="icon" className="text-sidebar-foreground">
				<SidebarHeader className="border-b border-sidebar-border/80 px-2 h-20 flex justify-center">
					<Logo
						className="px-2"
						textClassName="text-foreground"
						isCollapsed={state === "collapsed"}
					/>
				</SidebarHeader>

				<SidebarContent className="gap-0 px-1 py-3">
					{groups.map((group) => {
						const items =
							group.label === "Account" && showAdminNav
								? [
										...group.items,
										{
											title: "Admin",
											url: "/dashboard/admin",
											icon: ShieldCheckIcon,
											match: (p: string) => matchPrefix(p, "/dashboard/admin"),
											tooltip: "Platform admin",
										},
									]
								: group.items;
						return (
							<SidebarGroup key={group.label} className="p-0 pb-4">
								<SidebarGroupLabel className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
									{group.label}
								</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu className="gap-0.5">
										{items.map((item) => {
											const Icon = item.icon;
											const active =
												item.match(pathname) &&
												(item.matchSearch
													? item.matchSearch(locationSearch)
													: true);
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
														render={
															item.resetComposer ? (
																<button
																	type="button"
																	onClick={startNewEnvelope}
																/>
															) : (
																<Link to={item.url} search={item.search} />
															)
														}
													>
														<Icon
															className="size-4 opacity-80"
															weight="regular"
														/>
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
						);
					})}
				</SidebarContent>

				<SidebarFooter className="border-t border-sidebar-border/70 p-2 group-data-[collapsible=icon]:py-2 flex flex-col gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<button
									type="button"
									className={cn(
										"flex items-center gap-2 rounded-md hover:bg-sidebar-accent/80 transition-colors duration-150 text-left outline-none",
										state === "collapsed"
											? "w-8 h-8 justify-center p-0 mx-auto"
											: "w-full p-2 border border-sidebar-border/40 bg-sidebar-background",
									)}
								/>
							}
						>
							<div className="flex aspect-square size-6 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-xs shrink-0 select-none">
								{activeOrg?.name
									? activeOrg.name.slice(0, 2).toUpperCase()
									: "WS"}
							</div>
							{state !== "collapsed" && (
								<>
									<div className="flex flex-col min-w-0 flex-1 gap-0.5">
										<span className="font-medium text-xs truncate leading-none text-sidebar-foreground">
											{activeOrg?.name ?? "Select Workspace"}
										</span>
										<span className="text-[10px] text-muted-foreground leading-none">
											Workspace
										</span>
									</div>
									<CaretUpDownIcon className="size-3 text-muted-foreground shrink-0" />
								</>
							)}
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-56"
							align="start"
							side={state === "collapsed" ? "right" : "top"}
						>
							<DropdownMenuGroup>
								<DropdownMenuLabel className="text-muted-foreground text-xs">
									Workspaces
								</DropdownMenuLabel>
								{orgs.map((org) => {
									const isActive = org.id === activeOrgId;
									return (
										<DropdownMenuItem
											key={org.id}
											onClick={() => setActiveOrg(org.id)}
											className="flex items-center justify-between cursor-pointer"
										>
											<span
												className={cn(
													"truncate text-sm",
													isActive && "font-medium",
												)}
											>
												{org.name}
											</span>
											{isActive && (
												<CheckIcon className="size-3.5 text-primary shrink-0" />
											)}
										</DropdownMenuItem>
									);
								})}
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem
									onClick={() => {
										if (hasCollaboration) {
											setIsInviteOpen(true);
										} else {
											setUpgradeReason("features.shared_templates");
											setUpgradeOpen(true);
										}
									}}
									className="gap-2 cursor-pointer"
								>
									<UserPlusIcon className="size-4" />
									<span className="text-sm">Invite Teammates</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setIsCreateOpen(true)}
									className="gap-2 cursor-pointer"
								>
									<PlusIcon className="size-4" />
									<span className="text-sm">Create Workspace</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() =>
										navigate({ to: "/dashboard/settings/workspace" })
									}
									className="gap-2 cursor-pointer"
								>
									<GearIcon className="size-4" />
									<span className="text-sm">Workspace Settings</span>
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>

			<CreateWorkspaceDialog
				open={isCreateOpen}
				onOpenChange={setIsCreateOpen}
			/>
			<InviteTeammateDialog
				open={isInviteOpen}
				onOpenChange={setIsInviteOpen}
			/>
			<UpgradePlanDialog
				open={upgradeOpen}
				onOpenChange={setUpgradeOpen}
				reason={upgradeReason}
			/>
		</>
	);
}
