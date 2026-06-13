import type { ShareDraftExternalResult } from "@filosign/react/drafts";
import { useShareDraftExternal } from "@filosign/react/drafts";
import { KeyIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { SidebarSection } from "@/src/lib/components/app/sidebar/section";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import {
	FeatureDialogActions,
	FeatureDialogBody,
	FeatureDialogContent,
	FeatureDialogHeader,
	FeatureDialogMedia,
	FeatureDialogPanel,
} from "@/src/lib/components/ui/feature-dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { FEATURE_DIALOG_IMAGES } from "@/src/lib/domains/feature-dialog/images";
import { localMutationErrorOptions } from "@/src/lib/errors";

type Step = "invite" | "success";

function isValidEmail(email: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const fieldClass =
	"h-9 border-border/60 bg-muted/5 text-sm text-foreground/90 placeholder:text-muted-foreground/45 shadow-none";

export function ShareDraftDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	draftId: string;
}) {
	const [step, setStep] = useState<Step>("invite");
	const [emailInput, setEmailInput] = useState("");
	const [emails, setEmails] = useState<string[]>([]);
	const [shares, setShares] = useState<ShareDraftExternalResult["shares"]>([]);
	const share = useShareDraftExternal();
	const successTitleId = useId();

	useEffect(() => {
		if (!props.open) {
			const id = window.setTimeout(() => {
				setStep("invite");
				setEmailInput("");
				setEmails([]);
				setShares([]);
			}, 200);
			return () => window.clearTimeout(id);
		}
	}, [props.open]);

	const addEmail = () => {
		const normalized = emailInput.trim().toLowerCase();
		if (!isValidEmail(normalized)) return;
		if (emails.some((e) => e.toLowerCase() === normalized)) {
			setEmailInput("");
			return;
		}
		setEmails((prev) => [...prev, normalized]);
		setEmailInput("");
	};

	const removeEmail = (email: string) => {
		setEmails((prev) => prev.filter((e) => e !== email));
	};

	const handleSend = () => {
		if (emails.length === 0 || share.isPending) return;
		share.mutate(
			{ draftId: props.draftId, emails },
			{
				...localMutationErrorOptions(),
				onSuccess: (result) => {
					setShares(result.shares);
					setStep("success");
				},
			},
		);
	};

	const handleDone = () => {
		props.onOpenChange(false);
	};

	const coldShares = shares.filter(
		(s): s is ShareDraftExternalResult["shares"][number] & { phrase: string } =>
			s.accessKind === "cold" && Boolean(s.phrase),
	);
	const warmShares = shares.filter((s) => s.accessKind === "warm");

	if (step === "success") {
		return (
			<Dialog open={props.open}>
				<FeatureDialogContent aria-labelledby={successTitleId}>
					<FeatureDialogMedia
						src={FEATURE_DIALOG_IMAGES.coldShareAccessDialog}
						badge="Invites sent"
					/>

					<FeatureDialogPanel>
						<FeatureDialogHeader
							badge="Invites sent"
							title="Review invites sent"
							titleId={successTitleId}
							description="Share each secret code separately. Recipients paste it after opening the link from their email."
						/>

						<FeatureDialogBody>
							{coldShares.length > 0 ? (
								<div className="flex items-start gap-3 rounded-large border border-amber-500/30 bg-amber-500/5 p-4">
									<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200">
										<KeyIcon className="size-5" weight="duotone" aria-hidden />
									</div>
									<div className="min-w-0 space-y-1">
										<p className="text-sm font-semibold text-foreground">
											Secret codes
										</p>
										<p className="text-xs leading-relaxed text-muted-foreground">
											The email link alone is not enough for first-time
											recipients.
										</p>
									</div>
								</div>
							) : null}

							{coldShares.length > 0 ? (
								<SidebarSection title="Cold recipients">
									<ul className="space-y-3">
										{coldShares.map((row) => (
											<li
												key={row.shareId || row.inviteToken}
												className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3"
											>
												<div className="flex items-center justify-between gap-2">
													<span className="truncate text-sm font-medium">
														{row.email}
													</span>
													<Badge
														variant="secondary"
														className="shrink-0 text-[10px]"
													>
														Secret code
													</Badge>
												</div>
												<div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-background px-3 py-2">
													<code className="min-w-0 flex-1 break-all font-mono text-xs font-medium tracking-wide">
														{row.phrase}
													</code>
													<CopyButton text={row.phrase} className="shrink-0" />
												</div>
											</li>
										))}
									</ul>
								</SidebarSection>
							) : null}

							{warmShares.length > 0 ? (
								<SidebarSection
									title="Also notified by email"
									description="Registered Filosign users can open the draft from email. No secret code needed."
								>
									<ul className="space-y-2">
										{warmShares.map((row) => (
											<li
												key={row.shareId || row.inviteToken}
												className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
											>
												{row.email}
											</li>
										))}
									</ul>
								</SidebarSection>
							) : null}

							<FeatureDialogActions>
								<Button
									type="button"
									variant="primary"
									size="lg"
									className="w-full"
									onClick={handleDone}
								>
									Okay
								</Button>
							</FeatureDialogActions>
						</FeatureDialogBody>
					</FeatureDialogPanel>
				</FeatureDialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				if (!share.isPending) props.onOpenChange(open);
			}}
		>
			<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
				<div className="border-b border-border/50 bg-muted/20 px-6 py-5">
					<DialogHeader className="gap-1.5 space-y-0 text-left">
						<DialogTitle className="font-manrope text-lg font-semibold tracking-tight">
							Share draft for review
						</DialogTitle>
						<DialogDescription className="text-sm leading-relaxed">
							Invite external reviewers by email. Team members already have
							access via your organization workspace.
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="space-y-4 px-6 py-5">
					<div className="space-y-1.5">
						<Label htmlFor="draft-share-email" className="text-xs font-normal">
							Email
						</Label>
						<div className="flex gap-2">
							<Input
								id="draft-share-email"
								type="email"
								autoComplete="email"
								placeholder="name@example.com"
								value={emailInput}
								onChange={(e) => setEmailInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addEmail();
									}
								}}
								className={fieldClass}
								disabled={share.isPending}
								autoFocus
							/>
							<Button
								type="button"
								variant="outline"
								size="icon"
								className="shrink-0"
								onClick={addEmail}
								disabled={!isValidEmail(emailInput.trim()) || share.isPending}
								aria-label="Add email"
							>
								<PlusIcon className="size-4" />
							</Button>
						</div>
					</div>

					{emails.length > 0 ? (
						<ul className="space-y-2">
							{emails.map((email) => (
								<li
									key={email}
									className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
								>
									<span className="truncate text-sm">{email}</span>
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										onClick={() => removeEmail(email)}
										disabled={share.isPending}
										aria-label={`Remove ${email}`}
									>
										<XIcon className="size-3.5" />
									</Button>
								</li>
							))}
						</ul>
					) : (
						<p className="text-xs text-muted-foreground">
							Add one email at a time, then send invites.
						</p>
					)}
				</div>

				<DialogFooter className="border-t border-border/50 bg-muted/10 px-6 py-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => props.onOpenChange(false)}
						disabled={share.isPending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						disabled={emails.length === 0}
						isLoading={share.isPending}
						onClick={handleSend}
					>
						{share.isPending ? "Sending…" : "Send invites"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
