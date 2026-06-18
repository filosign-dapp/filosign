import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import { type SubmitEvent, useEffect, useId, useRef, useState } from "react";
import { useFilosignRpc } from "../../lib/filosign-rpc";
import { YEARLY_DISCOUNT_RATE } from "../../lib/pricing-display";
import {
	CheckoutBlockedContent,
	CheckoutFormContent,
	CheckoutSentContent,
} from "./checkout-dialog-content";
import { PlanDialogShell } from "./plan-dialog-shell";

type BillingInterval = "monthly" | "yearly";

type PreviewResult =
	InferClientOutputs<AppRouterClient>["billing"]["previewMarketingCheckout"];

interface PricingCheckoutDialogProps {
	open: boolean;
	onClose: () => void;
	planName: string;
	planId: "individual" | "teams" | "teams_pro";
	billingInterval: BillingInterval;
}

function BillingContextChip({
	planName,
	billingInterval,
}: {
	planName: string;
	billingInterval: BillingInterval;
}) {
	const savePercentLabel = `${Math.round(YEARLY_DISCOUNT_RATE * 100)}%`;

	return (
		<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-manrope">
			{planName}
			<span className="mx-1.5 text-border">·</span>
			{billingInterval === "yearly" ? "Yearly" : "Monthly"}
			{billingInterval === "yearly" ? (
				<>
					<span className="mx-1.5 text-border">·</span>
					<span className="text-secondary-foreground">
						Save {savePercentLabel}
					</span>
				</>
			) : null}
		</p>
	);
}

export default function PricingCheckoutDialog({
	open,
	onClose,
	planName,
	planId,
	billingInterval,
}: PricingCheckoutDialogProps) {
	const rpc = useFilosignRpc();
	const emailInputId = useId();
	const seatStepperId = useId();
	const titleId = useId();
	const panelRef = useRef<HTMLDivElement>(null);
	const [email, setEmail] = useState("");
	const isTeamPlan = planId === "teams" || planId === "teams_pro";
	const [seatCount, setSeatCount] = useState(1);
	const [status, setStatus] = useState<
		"idle" | "loading" | "sent" | "blocked" | "error"
	>("idle");
	const [error, setError] = useState<string | null>(null);
	const [blocked, setBlocked] = useState<PreviewResult | null>(null);

	useEffect(() => {
		if (open) return;
		setEmail("");
		setSeatCount(1);
		setStatus("idle");
		setError(null);
		setBlocked(null);
	}, [open]);

	useEffect(() => {
		if (!open || status === "sent" || status === "blocked") return;
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
		setBlocked(null);
		try {
			const preview = await rpc.billing.previewMarketingCheckout({
				email: email.trim(),
				planId,
				interval: billingInterval,
				...(isTeamPlan ? { seatCount } : {}),
			});

			if (preview.action !== "send_link") {
				setBlocked(preview);
				setStatus("blocked");
				return;
			}

			await rpc.billing.requestCheckoutLink({
				email: email.trim(),
				planId,
				interval: billingInterval,
				...(isTeamPlan ? { seatCount } : {}),
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
			planName={planName}
			planId={planId}
			titleId={titleId}
			panelRef={panelRef}
			contextChip={
				<BillingContextChip
					planName={planName}
					billingInterval={billingInterval}
				/>
			}
			title={`Start ${planName}`}
			description="We'll email a link to start your 7-day free trial. The link expires in 24 hours."
		>
			{status === "sent" ? (
				<CheckoutSentContent email={email} onClose={onClose} />
			) : status === "blocked" && blocked ? (
				<CheckoutBlockedContent blocked={blocked} onClose={onClose} />
			) : (
				<CheckoutFormContent
					emailInputId={emailInputId}
					seatStepperId={seatStepperId}
					email={email}
					onEmailChange={setEmail}
					isTeamPlan={isTeamPlan}
					seatCount={seatCount}
					onSeatCountChange={setSeatCount}
					error={error}
					isLoading={isLoading}
					onSubmit={handleSubmit}
					onClose={onClose}
				/>
			)}
		</PlanDialogShell>
	);
}
