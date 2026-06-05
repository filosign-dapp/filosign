import { type SubmitEvent, useState } from "react";
import { cn } from "../../lib/cn";
import { useFilosignRpc } from "../../lib/filosign-rpc";
import {
	marketingGhostLgClass,
	marketingPrimaryMdClass,
} from "../../lib/marketing-button";

type BillingInterval = "monthly" | "yearly";

type PreviewResult = Awaited<
	ReturnType<
		ReturnType<typeof useFilosignRpc>["billing"]["previewMarketingCheckout"]
	>
>;

interface PricingCheckoutDialogProps {
	open: boolean;
	onClose: () => void;
	planName: string;
	planId: "individual" | "teams" | "teams_pro";
	billingInterval: BillingInterval;
}

export default function PricingCheckoutDialog({
	open,
	onClose,
	planName,
	planId,
	billingInterval,
}: PricingCheckoutDialogProps) {
	const rpc = useFilosignRpc();
	const [email, setEmail] = useState("");
	const isTeamPlan = planId === "teams" || planId === "teams_pro";
	const [seatCount, setSeatCount] = useState(1);
	const [status, setStatus] = useState<
		"idle" | "loading" | "sent" | "blocked" | "error"
	>("idle");
	const [error, setError] = useState<string | null>(null);
	const [blocked, setBlocked] = useState<PreviewResult | null>(null);

	if (!open) return null;

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

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="checkout-dialog-title"
		>
			<div className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-6 shadow-xl">
				<h2
					id="checkout-dialog-title"
					className="text-lg font-medium font-manrope text-foreground"
				>
					Start {planName}
				</h2>
				<p className="mt-2 text-sm text-muted-foreground font-manrope leading-relaxed">
					Enter your email and we&apos;ll send a link to start your 7-day free
					trial.
				</p>

				{status === "sent" ? (
					<div className="mt-6 space-y-4">
						<p className="text-sm text-foreground font-manrope">
							Sent to <strong>{email.trim()}</strong>. Link expires in 24 hours.
						</p>
						<button
							type="button"
							className={cn(marketingPrimaryMdClass, "w-full")}
							onClick={onClose}
						>
							Close
						</button>
					</div>
				) : status === "blocked" && blocked ? (
					<div className="mt-6 space-y-4">
						<p className="text-sm text-foreground font-manrope leading-relaxed">
							{blocked.action === "already_subscribed"
								? blocked.message
								: blocked.action === "sign_in"
									? blocked.message
									: blocked.action === "use_in_app"
										? blocked.message
										: ""}
						</p>
						<div className="flex flex-col gap-2">
							<a
								href="/pricing"
								className={cn(marketingGhostLgClass, "w-full text-center")}
							>
								Compare plans
							</a>
							{(blocked.action === "sign_in" ||
								blocked.action === "already_subscribed" ||
								blocked.action === "use_in_app") && (
								<a
									href={blocked.clientUrl}
									className={cn(marketingPrimaryMdClass, "w-full text-center")}
								>
									Sign in to manage billing
								</a>
							)}
							<button
								type="button"
								className={cn(marketingGhostLgClass, "w-full")}
								onClick={onClose}
							>
								Close
							</button>
						</div>
					</div>
				) : (
					<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
						<label className="block space-y-2">
							<span className="text-sm font-medium font-manrope text-foreground">
								Email
							</span>
							<input
								type="email"
								required
								autoComplete="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-manrope text-foreground outline-none focus:border-foreground"
								placeholder="you@example.com"
							/>
						</label>
						{isTeamPlan ? (
							<label className="block space-y-2">
								<span className="text-sm font-medium font-manrope text-foreground">
									Seats
								</span>
								<input
									type="number"
									required
									min={1}
									step={1}
									value={seatCount}
									onChange={(event) =>
										setSeatCount(
											Math.max(1, Number.parseInt(event.target.value, 10) || 1),
										)
									}
									className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-manrope text-foreground outline-none focus:border-foreground"
								/>
							</label>
						) : null}
						{error ? (
							<p className="text-sm text-destructive font-manrope">{error}</p>
						) : null}
						<div className="flex gap-3">
							<button
								type="button"
								className={cn(marketingGhostLgClass, "flex-1")}
								onClick={onClose}
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={status === "loading"}
								className={cn(marketingPrimaryMdClass, "flex-1")}
							>
								{status === "loading" ? "Checking…" : "Start 7-day free trial"}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
