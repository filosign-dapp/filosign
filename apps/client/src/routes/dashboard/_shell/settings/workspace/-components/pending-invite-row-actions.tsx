import { ArrowClockwiseIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { showAppErrorToast } from "@/src/lib/errors";
import type { PendingInviteRow } from "@/src/routes/dashboard/_shell/settings/workspace/-components/pending-invite-row";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";

export function PendingInviteRowActions({
	invite,
}: {
	invite: PendingInviteRow;
}) {
	const { revokeInvite, resendInvite, orgDetail } = useWorkspaceSettings();

	return (
		<div className="flex items-center justify-end gap-2">
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-8 gap-1.5 rounded-lg text-xs touch-manipulation cursor-pointer"
				disabled={resendInvite.isPending}
				isLoading={resendInvite.isPending}
				onClick={() => {
					resendInvite.mutate(
						{ inviteId: invite.id },
						{
							onSuccess: (result) => {
								void orgDetail.refetch();
								toastUser.success(
									result.emailSent
										? TOASTS.workspace.inviteSent
										: TOASTS.workspace.teammateInvited,
								);
							},
							onError: showAppErrorToast,
						},
					);
				}}
			>
				<ArrowClockwiseIcon className="size-3.5" aria-hidden="true" />
				Resend
			</Button>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-8 gap-1.5 rounded-lg text-xs touch-manipulation cursor-pointer"
				disabled={revokeInvite.isPending}
				isLoading={revokeInvite.isPending}
				onClick={() => {
					revokeInvite.mutate(
						{ inviteId: invite.id },
						{
							onSuccess: () => void orgDetail.refetch(),
							onError: showAppErrorToast,
						},
					);
				}}
			>
				<XIcon className="size-3.5" aria-hidden="true" />
				Revoke
			</Button>
		</div>
	);
}
