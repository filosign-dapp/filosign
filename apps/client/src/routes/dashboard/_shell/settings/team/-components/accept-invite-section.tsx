import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { useTeamSettings } from "@/src/routes/dashboard/_shell/settings/team/-lib/context/context";

export function AcceptInviteSection() {
	const { inviteTokenPaste, setInviteTokenPaste, acceptInvite, setActiveOrg } =
		useTeamSettings();

	return (
		<section className="space-y-4 rounded-lg border border-border p-6">
			<h2 className="text-sm font-medium">Accept invite</h2>
			<p className="text-xs text-muted-foreground">
				Paste the invite token you received. Your Filosign profile email must
				match the invited address.
			</p>
			<div className="flex flex-col gap-2 sm:flex-row">
				<Input
					placeholder="Invite token"
					value={inviteTokenPaste}
					onChange={(e) => setInviteTokenPaste(e.target.value)}
					className="font-mono text-xs"
				/>
				<Button
					type="button"
					variant="secondary"
					disabled={!inviteTokenPaste.trim() || acceptInvite.isPending}
					onClick={() => {
						acceptInvite.mutate(
							{ token: inviteTokenPaste.trim() },
							{
								onSuccess: (res) => {
									const id = (res as { organizationId?: string })
										.organizationId;
									if (id) setActiveOrg(id);
									setInviteTokenPaste("");
								},
								onError: (e) => {
									console.error(e);
								},
							},
						);
					}}
				>
					Accept
				</Button>
			</div>
		</section>
	);
}
