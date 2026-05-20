import { AcceptInviteSection } from "./accept-invite-section";
import { ActiveOrgSection } from "./active-org-section";
import { CreateOrgSection } from "./create-org-section";
import { InviteEmailSection } from "./invite-email-section";
import { MembersSection } from "./members-section";
import { TemplatesSection } from "./templates-section";

export function TeamSettingsPage() {
	return (
		<div className="mx-auto max-w-2xl space-y-8 px-8 py-8">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Team</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Create an organization to share connections, templates, and documents
					with your team.
				</p>
			</div>

			<AcceptInviteSection />
			<ActiveOrgSection />
			<InviteEmailSection />
			<MembersSection />
			<TemplatesSection />
			<CreateOrgSection />
		</div>
	);
}
