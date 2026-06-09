import { EnvelopeSimpleIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { SidebarSection } from "@/src/lib/components/app/sidebar/section";
import { Badge } from "@/src/lib/components/ui/badge";
import type { WarmShareSummary } from "@/src/lib/domains/invites/types";

const nextSteps = [
	{
		title: "Invite emails are on the way",
		body: "Each recipient gets a secure link to open and sign in their inbox.",
	},
	{
		title: "Track progress on your dashboard",
		body: "See who has opened, signed, or is still pending.",
	},
] as const;

export function WarmSharePanel({ summary }: { summary: WarmShareSummary }) {
	const signerCount = summary.recipients.filter(
		(r) => r.role === "signer",
	).length;
	const viewerCount = summary.recipients.length - signerCount;

	return (
		<div className="space-y-4">
			<SidebarSection title="Envelope">
				<div className="flex items-start gap-3">
					<EnvelopeSimpleIcon
						className="mt-0.5 size-4 shrink-0 text-muted-foreground"
						weight="duotone"
						aria-hidden
					/>
					<div className="min-w-0">
						<p
							className="truncate text-sm font-medium"
							title={summary.envelopeName}
						>
							{summary.envelopeName}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{summary.documentCount}{" "}
							{summary.documentCount === 1 ? "document" : "documents"} ·{" "}
							{summary.recipients.length}{" "}
							{summary.recipients.length === 1 ? "recipient" : "recipients"}
						</p>
					</div>
				</div>
			</SidebarSection>

			<SidebarSection
				title="Recipients"
				description={
					signerCount > 0 && viewerCount > 0
						? `${signerCount} signer${signerCount === 1 ? "" : "s"}, ${viewerCount} viewer${viewerCount === 1 ? "" : "s"}`
						: undefined
				}
			>
				<ul className="space-y-2">
					{summary.recipients.map((recipient) => (
						<li
							key={recipient.email}
							className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
						>
							<div className="min-w-0">
								<p className="truncate text-sm font-medium">
									{recipient.name?.trim() || recipient.email}
								</p>
								{recipient.name?.trim() ? (
									<p className="truncate text-xs text-muted-foreground">
										{recipient.email}
									</p>
								) : null}
							</div>
							<Badge
								variant="secondary"
								className="shrink-0 text-[10px] capitalize"
							>
								{recipient.role}
							</Badge>
						</li>
					))}
				</ul>
			</SidebarSection>

			<SidebarSection title="What happens next">
				<ol className="space-y-3">
					{nextSteps.map((step, index) => (
						<li key={step.title} className="flex gap-3">
							<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
								{index + 1}
							</span>
							<div className="min-w-0 pt-0.5">
								<p className="text-sm font-medium text-foreground">
									{step.title}
								</p>
								<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
									{step.body}
								</p>
							</div>
						</li>
					))}
				</ol>
			</SidebarSection>

			<Link
				to="/dashboard/document/sign"
				search={{ pieceCid: summary.pieceCid }}
				className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
			>
				<UsersThreeIcon
					className="size-4 text-muted-foreground"
					weight="duotone"
				/>
				<span className="min-w-0 truncate">Open envelope workspace</span>
			</Link>
		</div>
	);
}
