import {
	BookOpenIcon,
	ChartLineIcon,
	CurrencyCircleDollarIcon,
	HouseIcon,
	NotePencilIcon,
	ShieldCheckIcon,
	TicketIcon,
	UsersIcon,
} from "@phosphor-icons/react";

export type AdminNavItem = {
	title: string;
	url: string;
	icon: typeof HouseIcon;
	description?: string;
};

export type AdminNavGroup = {
	label: string;
	items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
	{
		label: "Operations",
		items: [
			{
				title: "Overview",
				url: "/admin/",
				icon: HouseIcon,
				description: "Platform admin home and quick links",
			},
			{
				title: "Invites",
				url: "/admin/invites/",
				icon: TicketIcon,
				description: "Partner trial invites and redemption",
			},
			{
				title: "Access requests",
				url: "/admin/access-requests/",
				icon: ShieldCheckIcon,
				description: "Beta signup approval queue",
			},
			{
				title: "Payout access",
				url: "/admin/payout-access/",
				icon: CurrencyCircleDollarIcon,
				description: "Workspace payout attachment requests",
			},
			{
				title: "Feedback",
				url: "/admin/feedback/",
				icon: NotePencilIcon,
				description: "In-app product feedback",
			},
		],
	},
	{
		label: "Platform",
		items: [
			{
				title: "Users",
				url: "/admin/users/",
				icon: UsersIcon,
				description: "Registered accounts and plans",
			},
			{
				title: "Metrics",
				url: "/admin/metrics/",
				icon: ChartLineIcon,
				description: "Invite funnel and usage snapshots",
			},
			{
				title: "System templates",
				url: "/admin/system-templates/",
				icon: BookOpenIcon,
				description: "Platform template catalog",
			},
		],
	},
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap(
	(group) => group.items,
);

export function adminNavMatch(pathname: string, url: string): boolean {
	if (url === "/admin/") {
		return pathname === "/admin" || pathname === "/admin/";
	}
	return pathname === url || pathname.startsWith(url);
}
