import { SidebarSection } from "@/src/lib/components/app/sidebar/section";
import { Badge } from "@/src/lib/components/ui/badge";
import {
	useDraftReviewMeta,
	useDraftReviewViewerSlice,
} from "@/src/routes/draft/review/-lib/context/context";
import {
	fieldCountsBySigner,
	placementFieldsFromSnapshot,
} from "@/src/routes/draft/review/-lib/utils/snapshot-to-viewport";

function formatUsdc(amount: string): string {
	const n = Number.parseFloat(amount);
	if (!Number.isFinite(n)) return amount;
	return n.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}

export function DraftContextRail() {
	const { decrypted, displayTitle, isUnlocked } = useDraftReviewMeta();
	const { placementFields } = useDraftReviewViewerSlice();

	if (!isUnlocked || !decrypted) return null;

	const snapshot = decrypted.snapshot;
	const fields =
		placementFields.length > 0
			? placementFields
			: placementFieldsFromSnapshot(snapshot);
	const signerFieldCounts = fieldCountsBySigner(fields);
	const settlements = snapshot.settlementDrafts ?? [];

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 pb-4">
			<SidebarSection title="Overview">
				<p className="text-sm font-medium text-foreground">{displayTitle}</p>
				<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
					View-only preview. Signing and settlements are not available until the
					sender sends the envelope.
				</p>
			</SidebarSection>

			<SidebarSection title="Recipients">
				<ul className="space-y-2">
					{snapshot.recipients.map((recipient) => (
						<li
							key={recipient.clientRowId ?? recipient.email}
							className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">
										{recipient.name || recipient.email}
									</p>
									{recipient.name ? (
										<p className="truncate text-xs text-muted-foreground">
											{recipient.email}
										</p>
									) : null}
								</div>
								<Badge variant="secondary" className="shrink-0 text-[10px]">
									{recipient.role}
								</Badge>
							</div>
						</li>
					))}
				</ul>
			</SidebarSection>

			{snapshot.emailSubject || snapshot.emailMessage ? (
				<SidebarSection title="Email">
					{snapshot.emailSubject ? (
						<p className="text-sm font-medium">{snapshot.emailSubject}</p>
					) : null}
					{snapshot.emailMessage ? (
						<p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
							{snapshot.emailMessage}
						</p>
					) : null}
				</SidebarSection>
			) : null}

			<SidebarSection title="Fields">
				<p className="text-sm text-foreground">
					<span className="font-semibold">{fields.length}</span>{" "}
					{fields.length === 1 ? "field" : "fields"} placed
				</p>
				{signerFieldCounts.size > 0 ? (
					<ul className="mt-3 space-y-1.5">
						{[...signerFieldCounts.entries()].map(([email, count]) => (
							<li
								key={email}
								className="flex items-center justify-between text-xs text-muted-foreground"
							>
								<span className="truncate" title={email}>
									{email}
								</span>
								<span className="shrink-0 font-medium text-foreground">
									{count}
								</span>
							</li>
						))}
					</ul>
				) : null}
			</SidebarSection>

			{settlements.length > 0 ? (
				<SidebarSection title="Payouts">
					<ul className="space-y-2">
						{settlements.map((draft) => (
							<li
								key={draft.id}
								className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs"
							>
								<p className="font-medium text-foreground">
									{formatUsdc(draft.amountUsdc)} USDC
								</p>
								<p className="mt-1 text-muted-foreground">
									{draft.recipientLabel}
								</p>
								<p className="mt-0.5 capitalize text-muted-foreground">
									{draft.releaseType.replace(/_/g, " ")}
								</p>
							</li>
						))}
					</ul>
				</SidebarSection>
			) : null}
		</div>
	);
}
