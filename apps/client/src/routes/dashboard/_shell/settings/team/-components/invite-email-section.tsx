import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { copyToClipboard } from "@/src/lib/utils/utils";
import { useTeamSettings } from "@/src/routes/dashboard/_shell/settings/team/-lib/context/context";

export function InviteEmailSection() {
	const {
		activeOrgId,
		canInviteMembers,
		inviteEmail,
		setInviteEmail,
		inviteMember,
	} = useTeamSettings();

	if (!activeOrgId || !canInviteMembers) return null;

	return (
		<section className="space-y-4 rounded-lg border border-border p-6">
			<h2 className="text-sm font-medium">Invite by email</h2>
			<p className="text-xs text-muted-foreground">
				We store the invite only (no email is sent yet). Share the token with
				your teammate. After they accept, use “Deliver org key” so they can open
				team documents.
			</p>
			<div className="flex flex-col gap-2 sm:flex-row">
				<Input
					type="email"
					placeholder="colleague@company.com"
					value={inviteEmail}
					onChange={(e) => setInviteEmail(e.target.value)}
				/>
				<Button
					type="button"
					disabled={!inviteEmail.includes("@") || inviteMember.isPending}
					onClick={() => {
						inviteMember.mutate(
							{ email: inviteEmail.trim() },
							{
								onSuccess: (raw) => {
									const token = (
										raw as {
											invite?: { token?: string };
										}
									)?.invite?.token;
									setInviteEmail("");
									if (token) {
										toast.success("Invite created — copy the token.");
										void copyToClipboard(token);
									} else {
										toast.success("Invite created.");
									}
								},
								onError: (e) => {
									toast.error(e instanceof Error ? e.message : "Invite failed");
								},
							},
						);
					}}
				>
					Create invite
				</Button>
			</div>
		</section>
	);
}
