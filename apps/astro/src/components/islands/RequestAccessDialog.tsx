import {
	isPaidCheckoutPlanId,
	type PaidCheckoutPlanId,
} from "@filosign/shared";
import { type SubmitEvent, useEffect, useId, useRef, useState } from "react";
import { useFilosignRpc } from "../../lib/filosign-rpc";
import { PlanDialogShell } from "./plan-dialog-shell";
import {
	RequestAccessFormContent,
	RequestAccessSentContent,
} from "./request-access-dialog-content";

interface RequestAccessDialogProps {
	open: boolean;
	onClose: () => void;
	planName?: string;
	planId?: "individual" | "teams" | "teams_pro";
}

function RequestAccessContextChip({ planName }: { planName: string }) {
	return (
		<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-manrope">
			{planName}
			<span className="mx-1.5 text-border">·</span>
			Invite-only
		</p>
	);
}

function resolveDialogPlan(args: {
	planName?: string;
	planId?: RequestAccessDialogProps["planId"];
}): { planName: string; planId: PaidCheckoutPlanId } {
	const planId: PaidCheckoutPlanId =
		args.planId && isPaidCheckoutPlanId(args.planId) ? args.planId : "teams";
	return {
		planName: args.planName?.trim() || "Filosign",
		planId,
	};
}

export default function RequestAccessDialog({
	open,
	onClose,
	planName,
	planId,
}: RequestAccessDialogProps) {
	const rpc = useFilosignRpc();
	const titleId = useId();
	const emailInputId = useId();
	const companyInputId = useId();
	const messageInputId = useId();
	const panelRef = useRef<HTMLDivElement>(null);
	const [email, setEmail] = useState("");
	const [company, setCompany] = useState("");
	const [message, setMessage] = useState("");
	const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
		"idle",
	);
	const [error, setError] = useState<string | null>(null);
	const dialogPlan = resolveDialogPlan({ planName, planId });

	useEffect(() => {
		if (open) return;
		setEmail("");
		setCompany("");
		setMessage("");
		setStatus("idle");
		setError(null);
	}, [open]);

	useEffect(() => {
		if (!open || status === "sent") return;
		const frame = window.requestAnimationFrame(() => {
			panelRef.current
				?.querySelector<HTMLInputElement>("input[type='email']")
				?.focus();
		});
		return () => window.cancelAnimationFrame(frame);
	}, [open, status]);

	const handleSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		setStatus("loading");
		setError(null);
		try {
			await rpc.platformAccess.submitAccessRequest({
				email: email.trim(),
				company: company.trim(),
				planId,
				message: message.trim(),
			});
			setStatus("sent");
		} catch (err) {
			setStatus("error");
			setError(err instanceof Error ? err.message : "Something went wrong");
		}
	};

	const isLoading = status === "loading";

	return (
		<PlanDialogShell
			open={open}
			onClose={onClose}
			planName={dialogPlan.planName}
			planId={dialogPlan.planId}
			titleId={titleId}
			panelRef={panelRef}
			contextChip={<RequestAccessContextChip planName={dialogPlan.planName} />}
			title="Request invite"
			description="We're onboarding design partners invite-by-invite. Share your work email, company, and how you'd use Filosign. We'll follow up with an invite link."
		>
			{status === "sent" ? (
				<RequestAccessSentContent email={email} onClose={onClose} />
			) : (
				<RequestAccessFormContent
					emailInputId={emailInputId}
					companyInputId={companyInputId}
					messageInputId={messageInputId}
					email={email}
					company={company}
					message={message}
					onEmailChange={setEmail}
					onCompanyChange={setCompany}
					onMessageChange={setMessage}
					error={error}
					isLoading={isLoading}
					onSubmit={handleSubmit}
					onClose={onClose}
				/>
			)}
		</PlanDialogShell>
	);
}
