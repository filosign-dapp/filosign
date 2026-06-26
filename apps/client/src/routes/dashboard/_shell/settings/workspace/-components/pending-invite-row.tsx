import { Avatar, AvatarFallback } from "@/src/lib/components/ui/avatar";
import type { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { PendingInviteRowActions } from "./pending-invite-row-actions";

export type PendingInviteRow = NonNullable<
	ReturnType<typeof useWorkspaceSettings>["pendingInvites"]
>[number];

function formatInviteDate(value: string | Date): string {
	const date = value instanceof Date ? value : new Date(value);
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

type Props = {
	invite: PendingInviteRow;
	canManageInvites: boolean;
};

export function PendingInviteRow({ invite, canManageInvites }: Props) {
	const emailInitial = invite.email.trim()[0]?.toUpperCase() ?? "?";

	return (
		<tr className="transition-colors hover:bg-muted/5">
			<td className="px-4 py-3.5">
				<div className="flex items-center gap-3">
					<Avatar size="default" className="size-8">
						<AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
							{emailInitial}
						</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-col">
						<span className="truncate font-medium text-foreground">
							{invite.email}
						</span>
						<span className="truncate text-xs text-muted-foreground">
							Invited {formatInviteDate(invite.createdAt)}
						</span>
					</div>
				</div>
			</td>
			<td className="px-4 py-3.5">
				<span className="text-xs font-medium capitalize text-muted-foreground">
					{invite.role}
				</span>
			</td>
			<td className="px-4 py-3.5">
				<div className="flex flex-col items-start gap-1">
					<div className="flex items-center gap-1.5 text-xs font-medium">
						<span
							className="size-1.5 rounded-full bg-warning animate-pulse"
							aria-hidden="true"
						/>
						<span className="text-muted-foreground">Invite pending</span>
					</div>
					<span className="text-[10px] font-medium leading-none text-muted-foreground">
						Expires {formatInviteDate(invite.expiresAt)}
					</span>
				</div>
			</td>
			{canManageInvites ? (
				<td className="px-4 py-3.5 text-right">
					<PendingInviteRowActions invite={invite} />
				</td>
			) : null}
		</tr>
	);
}
