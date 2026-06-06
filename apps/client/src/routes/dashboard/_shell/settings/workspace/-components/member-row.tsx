import { Avatar, AvatarFallback } from "@/src/lib/components/ui/avatar";
import { cn } from "@/src/lib/utils/index";
import type { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { MemberRowActions } from "./member-row-actions";

function initialsFromName(
	firstName?: string | null,
	lastName?: string | null,
	email?: string | null,
) {
	if (firstName || lastName) {
		return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
	}
	if (email) {
		return email[0].toUpperCase();
	}
	return "?";
}

export type MemberRow = NonNullable<
	ReturnType<typeof useWorkspaceSettings>["members"]
>[number];

type Props = {
	member: MemberRow;
	myWalletNorm: string | undefined;
	canInviteMembers: boolean;
};

export function MemberRow({
	member: m,
	myWalletNorm,
	canInviteMembers,
}: Props) {
	const isSelf = Boolean(
		myWalletNorm && m.walletAddress.toLowerCase() === myWalletNorm,
	);
	const needsKey = m.hasKeyWrap === false;
	const showDeliver = canInviteMembers && needsKey && !isSelf;

	const displayName =
		m.firstName || m.lastName
			? `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim()
			: m.email || "Pending invite";

	const contactEmail = m.email || "No email on file";

	return (
		<tr className="transition-colors hover:bg-muted/5">
			<td className="px-4 py-3.5">
				<div className="flex items-center gap-3">
					<Avatar size="default" className="size-8">
						<AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
							{initialsFromName(m.firstName, m.lastName, m.email)}
						</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-col">
						<span className="truncate font-medium text-foreground">
							{displayName}{" "}
							{isSelf ? (
								<span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">
									You
								</span>
							) : null}
						</span>
						<span className="truncate text-xs text-muted-foreground">
							{contactEmail}
						</span>
					</div>
				</div>
			</td>
			<td className="px-4 py-3.5">
				<span className="text-xs font-medium capitalize text-muted-foreground">
					{m.role}
				</span>
			</td>
			<td className="px-4 py-3.5">
				<div className="flex flex-col items-start gap-1">
					<div className="flex items-center gap-1.5 text-xs font-medium">
						<span
							className={cn(
								"size-1.5 rounded-full",
								m.status === "active"
									? "bg-secondary"
									: m.status === "invited"
										? "bg-warning animate-pulse"
										: "bg-destructive",
							)}
							aria-hidden="true"
						/>
						<span className="capitalize text-muted-foreground">{m.status}</span>
					</div>
					{needsKey ? (
						<span className="text-[10px] font-medium leading-none text-warning">
							Encryption key pending
						</span>
					) : null}
				</div>
			</td>
			{canInviteMembers ? (
				<td className="px-4 py-3.5 text-right">
					{showDeliver || !isSelf ? (
						<MemberRowActions
							member={m}
							showDeliver={showDeliver}
							isSelf={isSelf}
						/>
					) : null}
				</td>
			) : null}
		</tr>
	);
}
