import { KeyIcon, LinkIcon } from "@phosphor-icons/react";
import env from "@/src/env";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import {
	buildChannelShareLinks,
	ShareViaButtons,
} from "@/src/lib/components/app/share-via-buttons";
import { SidebarSection } from "@/src/lib/components/app/sidebar/section";
import { Badge } from "@/src/lib/components/ui/badge";
import type {
	ColdSharePackage,
	WarmShareSummary,
} from "@/src/lib/domains/invites/types";

function buildColdShareRecipientMessage(share: ColdSharePackage): string {
	return [
		"You received a secure Filosign document.",
		"",
		"To open it:",
		"1. Open this link in your browser:",
		share.magicLink,
		"2. When Filosign asks for a secret code, paste this exactly (keep the hyphens):",
		share.phrase,
		"",
		"The link alone won't open the document without the code.",
	].join("\n");
}

function shareLinks(share: ColdSharePackage) {
	const message = buildColdShareRecipientMessage(share);
	return buildChannelShareLinks({
		message,
		url: share.magicLink,
		emailTo: share.emails,
		subject: "Secure document waiting for you",
		telegramText: `Paste this secret code after opening the link: ${share.phrase}`,
	});
}

export function ColdSharePanel({
	share,
	warmSummary,
}: {
	share: ColdSharePackage;
	warmSummary?: WarmShareSummary | null;
}) {
	const links = shareLinks(share);

	return (
		<div className="space-y-4">
			<div className="flex items-start gap-3 rounded-large border border-amber-500/30 bg-amber-500/5 p-4">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200">
					<KeyIcon className="size-5" weight="duotone" aria-hidden />
				</div>
				<div className="min-w-0 space-y-1">
					<p className="text-sm font-semibold text-foreground">
						How recipients open the document
					</p>
					<ol className="list-decimal space-y-0.5 pl-4 text-xs leading-relaxed text-muted-foreground">
						<li>Open the link from their Filosign email</li>
						<li>Paste the secret code when prompted</li>
					</ol>
					<p className="text-xs leading-relaxed text-muted-foreground">
						Share the code below separately. The email link alone is not enough.
					</p>
				</div>
			</div>

			<SidebarSection title="First-time recipients">
				<ul className="space-y-2">
					{share.emails.map((email) => (
						<li
							key={email}
							className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
						>
							<span className="truncate text-sm">{email}</span>
							<Badge variant="secondary" className="shrink-0 text-[10px]">
								Secret code
							</Badge>
						</li>
					))}
				</ul>
			</SidebarSection>

			{env.VITE_CHAIN === "local" ? (
				<SidebarSection title="Invite link" description="Local dev only">
					<div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
						<LinkIcon
							className="size-4 shrink-0 text-muted-foreground"
							aria-hidden
						/>
						<code className="min-w-0 flex-1 break-all font-mono text-xs text-muted-foreground">
							{share.magicLink}
						</code>
						<CopyButton text={share.magicLink} className="shrink-0" />
					</div>
				</SidebarSection>
			) : null}

			<SidebarSection title="Secret code">
				<div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-background px-3 py-2.5">
					<code className="min-w-0 flex-1 break-all font-mono text-sm font-medium tracking-wide">
						{share.phrase}
					</code>
					<CopyButton text={share.phrase} className="shrink-0" />
				</div>
				<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
					Recipients paste this on the unlock screen after opening the link.
					Copy and send it in a separate message from the email.
				</p>
			</SidebarSection>

			<div className="flex flex-wrap items-center gap-2">
				<p className="text-xs text-muted-foreground">Share via</p>
				<ShareViaButtons links={links} />
			</div>

			{warmSummary && warmSummary.recipients.length > 0 ? (
				<SidebarSection
					title="Also notified by email"
					description="They can open the document from email."
				>
					<ul className="space-y-2">
						{warmSummary.recipients.map((recipient) => (
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
			) : null}
		</div>
	);
}
