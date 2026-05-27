import {
	useActiveOrganization,
	useActiveOrgId,
	useCreateOrganization,
	useInviteOrgMember,
	useOrganizations,
} from "@filosign/react/orgs";
import {
	BuildingsIcon,
	CaretRightIcon,
	CaretUpDownIcon,
	CheckIcon,
	EnvelopeSimpleIcon,
	GearIcon,
	HouseIcon,
	PlusIcon,
	SealIcon,
	UserCircleIcon,
	UserPlusIcon,
	UsersThreeIcon,
} from "@phosphor-icons/react";
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
import { useSetPersistedActiveOrganizationId } from "@/src/lib/filosign/persisted-active-org";
import { cn } from "@/src/lib/utils/index";

type NavItem = {
	title: string;
	url: string;
	icon: typeof HouseIcon;
	match: (pathname: string) => boolean;
	tooltip: string;
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
				tooltip: "Home",
			},
			{
				title: "Drafts",
				url: "/dashboard/drafts/",
				icon: EnvelopeSimpleIcon,
				match: (p) => matchPrefix(p, "/dashboard/drafts"),
				tooltip: "Your drafts",
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
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to create workspace",
			);
		}
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
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to invite teammate",
			);
		}
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
	const navigate = useNavigate();
	const pathname = useRouterState({
		select: (s) => s.location.pathname,
	});
	const { state } = useSidebar();

	const { data: orgsData } = useOrganizations();
	const activeOrgId = useActiveOrgId();
	const activeOrg = useActiveOrganization();
	const setActiveOrg = useSetPersistedActiveOrganizationId();

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isInviteOpen, setIsInviteOpen] = useState(false);

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
					))}
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
									onClick={() => setIsInviteOpen(true)}
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
					<p className="truncate px-2 text-[10px] leading-relaxed text-muted-foreground/55 group-data-[collapsible=icon]:hidden">
						Private document signing
					</p>
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
		</>
	);
}
