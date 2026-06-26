import { Avatar, AvatarFallback } from "@/src/lib/components/ui/avatar";
import type { PendingInviteRow } from "@/src/routes/dashboard/_shell/settings/workspace/-components/pending-invite-row";
import { PendingInviteRowActions } from "@/src/routes/dashboard/_shell/settings/workspace/-components/pending-invite-row-actions";

function formatInviteDate(value: string | Date): string {
	const date = value instanceof Date ? value : new Date(value);
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function PendingInviteRowCard({
	invite,
	canManageInvites,
}: {
	invite: PendingInviteRow;
	canManageInvites: boolean;
}) {
	const emailInitial = invite.email.trim()[0]?.toUpperCase() ?? "?";

	return (
		<div className="rounded-lg border border-border/80 bg-background/50 p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<Avatar size="default" className="size-8 shrink-0">
						<AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
							{emailInitial}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0">
						<p className="truncate font-medium text-foreground">
							{invite.email}
						</p>
						<p className="text-xs capitalize text-muted-foreground">
							{invite.role} · Invite pending
						</p>
						<p className="text-xs text-muted-foreground">
							Invited {formatInviteDate(invite.createdAt)} · Expires{" "}
							{formatInviteDate(invite.expiresAt)}
						</p>
					</div>
				</div>
				{canManageInvites ? <PendingInviteRowActions invite={invite} /> : null}
			</div>
		</div>
	);
}
