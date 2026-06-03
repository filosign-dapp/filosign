import { ShieldCheckIcon } from "@phosphor-icons/react";
import { WorkspaceSection } from "./workspace-section";

export function OrgGovernanceSection() {
	return (
		<WorkspaceSection
			icon={<ShieldCheckIcon className="size-4" aria-hidden="true" />}
			title="Envelope governance"
			description="Owners and admins can void envelopes until they complete, fix unsigned signers, and register or cancel supplementary attachment rules. Treasury payouts still require the linked treasury wallet (e.g. Safe) to sign as payer."
		>
			<p className="text-sm text-muted-foreground">
				Governance uses each owner or admin&apos;s own wallet—no separate
				controller link. Senders in this workspace send on behalf of the org;
				they cannot override these controls on-chain.
			</p>
		</WorkspaceSection>
	);
}
