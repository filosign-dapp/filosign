import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import {
	CheckCircleIcon,
	EnvelopeSimpleIcon,
	PaperPlaneTiltIcon,
	WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { useEffect } from "react";
import env from "@/src/env";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";

export type ColdSharePackage = {
	emails: string[];
	phrase: string;
	magicLink: string;
};

function buildFullUrl(share: ColdSharePackage): string {
	const base = share.magicLink;
	return base;
}

function shareLinks(share: ColdSharePackage) {
	const fullUrl = buildFullUrl(share);
	const msg = `You received a secure Filosign document.\n\nAccess link: ${fullUrl}\n\nFilosign also sends this magic link by email.`;
	const mailTo = share.emails.join(",");
	return {
		mailto: `mailto:${encodeURIComponent(mailTo)}?subject=${encodeURIComponent("Secure document waiting for you")}&body=${encodeURIComponent(msg)}`,
		whatsapp: `https://wa.me/?text=${encodeURIComponent(msg)}`,
		telegram: `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent("Secure document")}`,
	};
}

export function ColdShareDialog(props: {
	open: boolean;
	/** When null while open, shows warm-recipient success (no secret code). */
	share: ColdSharePackage | null;
	onDone: () => void;
}) {
	const captureAppEvent = useCaptureAppEvent();
	const share = props.share;
	const isColdVariant = Boolean(share);
	const links = share ? shareLinks(share) : null;

	const fullUrl = share ? buildFullUrl(share) : "";

	useEffect(() => {
		if (!props.open) return;
		if (share) {
			captureAppEvent(CLIENT_ANALYTICS_EVENTS.coldShareDialogShown);
		} else {
			captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopePostSendDialogShown);
		}
	}, [props.open, share, captureAppEvent]);

	return (
		<Dialog open={props.open}>
			<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
				<div className="border-b border-border/50 bg-muted/20 px-6 py-5">
					<DialogHeader className="gap-1 space-y-0">
						<DialogTitle className="text-base font-medium tracking-tight">
							Share Access
						</DialogTitle>
						<DialogDescription className="text-xs leading-relaxed">
							{isColdVariant
								? "We email recipients the magic link automatically. Share the secret code too, otherwise they cannot open the document."
								: "Your file has been shared with the recipients."}
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="space-y-4 px-6 py-5">
					{isColdVariant && share ? (
						<>
							<div className="rounded-lg border border-border bg-muted/25 p-3">
								<p className="text-xs text-muted-foreground">
									Recipients: {share.emails.join(", ")}
								</p>
							</div>

							{env.VITE_CHAIN === "local" && (
								<div className="space-y-2">
									<p className="text-xs font-medium text-muted-foreground">
										Invite link
									</p>
									<div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
										<code className="flex-1 break-all font-mono text-xs text-muted-foreground">
											{fullUrl}
										</code>
										<CopyButton text={fullUrl} className="shrink-0" />
									</div>
								</div>
							)}

							<div className="space-y-2">
								<p className="text-xs font-medium text-muted-foreground">
									Secret code
								</p>
								<div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
									<code className="flex-1 break-all font-mono text-sm">
										{share.phrase}
									</code>
									<CopyButton text={share.phrase} className="shrink-0" />
								</div>
							</div>

							{links ? (
								<div className="flex items-center gap-2">
									<p className="mr-1 text-xs text-muted-foreground">
										Share via
									</p>
									<Button
										type="button"
										variant="outline"
										size="icon"
										className="size-8"
										onClick={() =>
											window.open(links.mailto, "_blank", "noopener,noreferrer")
										}
										aria-label="Share via email"
										title="Share via email"
									>
										<EnvelopeSimpleIcon className="size-4" />
									</Button>
									<Button
										type="button"
										variant="outline"
										size="icon"
										className="size-8"
										onClick={() =>
											window.open(
												links.whatsapp,
												"_blank",
												"noopener,noreferrer",
											)
										}
										aria-label="Share via WhatsApp"
										title="Share via WhatsApp"
									>
										<WhatsappLogoIcon className="size-4" />
									</Button>
									<Button
										type="button"
										variant="outline"
										size="icon"
										className="size-8"
										onClick={() =>
											window.open(
												links.telegram,
												"_blank",
												"noopener,noreferrer",
											)
										}
										aria-label="Share via Telegram"
										title="Share via Telegram"
									>
										<PaperPlaneTiltIcon className="size-4" />
									</Button>
								</div>
							) : null}

							<p className="text-xs text-muted-foreground">
								Without the secret code, recipients cannot access this document.
							</p>
						</>
					) : (
						<div className="flex flex-col items-center gap-3 py-4 text-center">
							<CheckCircleIcon
								className="size-12 text-green-600"
								weight="fill"
								aria-hidden
							/>
							<p className="text-sm text-muted-foreground">
								Recipients will be notified by email.
							</p>
						</div>
					)}
				</div>

				<DialogFooter className="border-t border-border/50 px-6 py-4">
					<Button type="button" variant="primary" onClick={props.onDone}>
						{isColdVariant ? "Done" : "Continue to dashboard"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
