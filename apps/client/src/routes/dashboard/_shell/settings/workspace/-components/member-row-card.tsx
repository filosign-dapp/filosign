import { Avatar, AvatarFallback } from "@/src/lib/components/ui/avatar";
import { cn } from "@/src/lib/utils/index";
import type { MemberRow as MemberRowType } from "./member-row";
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

type Props = {
	member: MemberRowType;
	myWalletNorm: string | undefined;
	canInviteMembers: boolean;
};

export function MemberRowCard({
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
		<article className="rounded-lg border border-border/80 bg-background/50 p-4">
			<div className="flex items-start gap-3">
				<Avatar size="default" className="size-8 shrink-0">
					<AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
						{initialsFromName(m.firstName, m.lastName, m.email)}
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<span className="truncate font-medium text-foreground">
							{displayName}
						</span>
						{isSelf ? (
							<span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">
								You
							</span>
						) : null}
					</div>
					<p className="truncate text-xs text-muted-foreground">
						{contactEmail}
					</p>
				</div>
				{canInviteMembers && (showDeliver || !isSelf) ? (
					<div className="shrink-0">
						<MemberRowActions
							member={m}
							showDeliver={showDeliver}
							isSelf={isSelf}
						/>
					</div>
				) : null}
			</div>
			<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-xs">
				<div>
					<span className="text-muted-foreground">Role </span>
					<span className="font-medium capitalize text-foreground">
						{m.role}
					</span>
				</div>
				<div className="flex items-center gap-1.5 font-medium">
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
		</article>
	);
}
