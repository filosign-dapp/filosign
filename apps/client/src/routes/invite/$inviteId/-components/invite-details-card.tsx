import { EnvelopeIcon, UserCircleIcon } from "@phosphor-icons/react";
import type { InviteData } from "@/src/routes/invite/$inviteId/-lib/hooks/use-invite-controller";

export function InviteDetailsCard({
	inviteData,
}: {
	inviteData: InviteData | null;
}) {
	return (
		<div className="bg-card border rounded-2xl p-6 space-y-4">
			<div className="flex items-center gap-3">
				<div className="size-12 bg-primary/10 rounded-full flex items-center justify-center">
					<UserCircleIcon className="size-6 text-primary" />
				</div>
				<div className="text-left">
					<p className="font-medium">{inviteData?.senderName || "Someone"}</p>
					<p className="text-sm text-muted-foreground">
						wants to send you documents
					</p>
				</div>
			</div>
			{inviteData?.message ? (
				<div className="bg-muted p-3 rounded-lg">
					<p className="text-sm italic">&quot;{inviteData.message}&quot;</p>
				</div>
			) : null}
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<EnvelopeIcon className="size-4" />
				<span>Sent to {inviteData?.inviteeEmail}</span>
			</div>
		</div>
	);
}
