import { useRequestApproval } from "@filosign/react/sharing";
import {
	CheckCircleIcon,
	PlusIcon,
	SpinnerGapIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/src/lib/components/ui/dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { safeAsync } from "@/src/lib/utils/safe";

interface AddRecipientDialogProps {
	trigger?: React.ReactElement;
	onSuccess?: () => void;
	/** Called after a request or invite is successfully sent (not on every dialog close). */
	onRequestCompleted?: () => void;
}

type Step = "email" | "success";

const labelClass = "text-xs font-normal text-muted-foreground";

const fieldClass =
	"h-9 border-border/60 bg-muted/5 text-sm text-foreground/90 placeholder:text-muted-foreground/45 shadow-none";

const textareaClass =
	"min-h-[4.5rem] resize-none border-border/60 bg-muted/5 py-2.5 text-sm text-foreground/90 placeholder:text-muted-foreground/45 shadow-none";

function isValidEmail(email: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function successHeading(result: {
	alreadyApproved?: boolean;
	alreadyRequested?: boolean;
	alreadyInvited?: boolean;
	exists?: boolean;
	requested?: boolean;
	invited?: boolean;
}) {
	if (result.alreadyApproved) return "Already connected";
	if (result.alreadyRequested) return "Request pending";
	if (result.alreadyInvited) return "Already invited";
	if (result.exists && result.requested) return "Request sent";
	if (result.invited && !result.alreadyInvited) return "Invite sent";
	return "Done";
}

export default function AddRecipientDialog({
	trigger,
	onSuccess,
	onRequestCompleted,
}: AddRecipientDialogProps) {
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [step, setStep] = useState<Step>("email");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [result, setResult] = useState<{
		exists?: boolean;
		requested?: boolean;
		invited?: boolean;
		alreadyRequested?: boolean;
		alreadyApproved?: boolean;
		alreadyInvited?: boolean;
	} | null>(null);

	const sendShareRequest = useRequestApproval();

	useEffect(() => {
		if (!open) {
			const id = window.setTimeout(() => {
				setStep("email");
				setEmail("");
				setMessage("");
				setResult(null);
				setIsSubmitting(false);
			}, 200);
			return () => window.clearTimeout(id);
		}
	}, [open]);

	const handleSubmit = async () => {
		if (!isValidEmail(email.trim())) {
			toast.error("Please enter a valid email address");
			return;
		}

		setIsSubmitting(true);

		const [data, error] = await safeAsync(
			sendShareRequest.mutateAsync({
				recipientEmail: email.trim(),
				message: message.trim() || undefined,
			}),
		);

		setIsSubmitting(false);

		if (error) {
			toast.error(error.message || "Something went wrong");
			return;
		}

		setResult(data || {});
		setStep("success");
		onRequestCompleted?.();
	};

	const handleDone = () => {
		setOpen(false);
		onSuccess?.();
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={trigger || <Button variant="primary" size="sm" />}>
				{!trigger && (
					<>
						<PlusIcon className="size-4" weight="bold" />
						Add recipient
					</>
				)}
			</DialogTrigger>

			<DialogContent
				className="gap-0 overflow-hidden p-0 sm:max-w-md"
				showCloseButton
			>
				<div className="border-b border-border/50 bg-muted/20 px-6 py-5">
					<DialogHeader className="gap-1 space-y-0">
						<DialogTitle className="text-xl">
							{step === "email"
								? "Add recipient"
								: successHeading(result ?? {})}
						</DialogTitle>
						{step === "email" ? (
							<DialogDescription className="text-sm leading-relaxed">
								We&apos;ll connect them if they already use Filosign, or send an
								email invite otherwise.
							</DialogDescription>
						) : (
							<DialogDescription className="sr-only">
								Result of your invitation or connection request.
							</DialogDescription>
						)}
					</DialogHeader>
				</div>

				{step === "email" && (
					<div className="space-y-5 px-6 py-6">
						<div className="space-y-1.5">
							<Label htmlFor="add-recipient-email" className={labelClass}>
								Email
							</Label>
							<Input
								id="add-recipient-email"
								type="email"
								autoComplete="email"
								placeholder="name@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !isSubmitting) {
										void handleSubmit();
									}
								}}
								className={fieldClass}
								autoFocus
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="add-recipient-message" className={labelClass}>
								Message{" "}
								<span className="font-normal text-muted-foreground/70">
									(optional)
								</span>
							</Label>
							<Textarea
								id="add-recipient-message"
								placeholder="Short note…"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								rows={3}
								className={textareaClass}
							/>
						</div>

						<div className="flex justify-end gap-2 border-t border-border/50 pt-5">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="text-muted-foreground hover:bg-muted/60 hover:text-foreground"
								onClick={() => setOpen(false)}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="primary"
								size="sm"
								onClick={() => void handleSubmit()}
								disabled={!isValidEmail(email.trim()) || isSubmitting}
							>
								{isSubmitting ? (
									<>
										<SpinnerGapIcon className="size-4 animate-spin" />
										Sending
									</>
								) : (
									"Send"
								)}
							</Button>
						</div>
					</div>
				)}

				{step === "success" && result && (
					<div className="space-y-5 px-6 py-6">
						<div className="flex gap-3">
							<span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
								<CheckCircleIcon className="size-4" weight="regular" />
							</span>
							<div className="min-w-0 flex-col items-center text-sm leading-relaxed">
								{result.alreadyApproved && (
									<p className="text-foreground/90">
										You&apos;re already connected with{" "}
										<span className="font-medium text-foreground">{email}</span>
										. You can send documents anytime.
									</p>
								)}
								{result.alreadyRequested && (
									<p className="text-muted-foreground">
										A request to{" "}
										<span className="font-medium text-foreground/90">
											{email}
										</span>{" "}
										is already pending.
									</p>
								)}
								{result.alreadyInvited && (
									<p className="text-muted-foreground">
										<span className="font-medium text-foreground/90">
											{email}
										</span>{" "}
										already has a pending invite.
									</p>
								)}
								{result.exists && result.requested && (
									<p className="text-muted-foreground">
										<span className="font-medium text-foreground/90">
											{email}
										</span>{" "}
										is on Filosign. They&apos;ll be asked to accept your
										connection request.
									</p>
								)}
								{result.invited && !result.alreadyInvited && (
									<p className="text-muted-foreground">
										We sent an invite to{" "}
										<span className="font-medium text-foreground/90">
											{email}
										</span>
										. They can join and connect with you from the email.
									</p>
								)}

								<div>
									{message ? (
										<div className="border-l-2 mt-4 border-border/60 pl-3 pt-1">
											<p className="text-[11px] uppercase tracking-wide text-muted-foreground">
												Your note
											</p>
											<p className="mt-1 text-sm text-foreground/85">
												&ldquo;{message}&rdquo;
											</p>
										</div>
									) : null}
								</div>
							</div>
						</div>

						<div className="flex justify-end border-t border-border/50 pt-5">
							<Button
								type="button"
								variant="primary"
								size="sm"
								onClick={handleDone}
							>
								Done
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
