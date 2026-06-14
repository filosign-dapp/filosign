import { PlusIcon, UsersIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/src/lib/components/ui/button";
import { BILLING_SETTINGS_PATH } from "@/src/lib/domains/billing/settings-path";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import { MemberRow } from "@/src/routes/dashboard/_shell/settings/workspace/-components/member-row";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { WorkspaceSection } from "./workspace-section";

export function MembersSection(props: { onInviteClick?: () => void }) {
	const { activeOrgId, members, myWalletNorm, canInviteMembers } =
		useWorkspaceSettings();

	if (!activeOrgId || !members || members.length === 0) return null;

	return (
		<WorkspaceSection
			icon={<UsersIcon className="size-4" aria-hidden="true" />}
			title={`Team Members`}
			description={
				<>
					Everyone with access to this workspace. Pending invites count toward
					your paid seat limit until they are rejected or revoked.{" "}
					<Link
						to={BILLING_SETTINGS_PATH}
						className="font-medium text-primary underline-offset-4 hover:underline"
					>
						Manage seats in Billing
					</Link>
					.
				</>
			}
			headerAside={
				canInviteMembers && props.onInviteClick ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 gap-1.5 rounded-lg text-xs touch-manipulation cursor-pointer"
						onClick={props.onInviteClick}
					>
						<PlusIcon className="size-3.5" aria-hidden="true" />
						Add member
						<ProFeatureMark size="xs" />
					</Button>
				) : null
			}
		>
			<div className="overflow-x-auto rounded-lg border border-border/80 bg-background/50">
				<table className="min-w-full divide-y divide-border text-sm">
					<thead>
						<tr className="bg-muted/10 text-left text-xs font-medium text-muted-foreground">
							<th scope="col" className="px-4 py-3 font-semibold">
								Member
							</th>
							<th scope="col" className="px-4 py-3 font-semibold">
								Role
							</th>
							<th scope="col" className="px-4 py-3 font-semibold">
								Status
							</th>
							{canInviteMembers ? (
								<th scope="col" className="px-4 py-3 text-right font-semibold">
									Actions
								</th>
							) : null}
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{members.map((m) => (
							<MemberRow
								key={m.walletAddress}
								member={m}
								myWalletNorm={myWalletNorm ?? undefined}
								canInviteMembers={canInviteMembers}
							/>
						))}
					</tbody>
				</table>
			</div>
			<p className="mt-4 text-xs italic text-muted-foreground">
				Everyone with access to this workspace. Pending invites count towards
				your seat limit.
			</p>
		</WorkspaceSection>
	);
}
