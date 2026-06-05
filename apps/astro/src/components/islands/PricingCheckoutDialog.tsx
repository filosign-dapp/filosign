import { AnimatePresence, motion, SPRING_TOKENS } from "@filosign/motion";
import { CheckIcon, MinusIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { type SubmitEvent, useEffect, useId, useRef, useState } from "react";
import { checkoutDialogImageForPlan } from "../../config/pricing-media";
import { cn } from "../../lib/cn";
import { useFilosignRpc } from "../../lib/filosign-rpc";
import {
	marketingButtonFocus,
	marketingGhostLgClass,
	marketingPrimaryLgClass,
	marketingPrimaryMdClass,
} from "../../lib/marketing-button";
import {
	marketingFieldClass,
	marketingFieldHintClass,
	marketingFieldLabelClass,
	marketingStepperButtonClass,
} from "../../lib/marketing-form";
import { YEARLY_DISCOUNT_RATE } from "../../lib/pricing-display";

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

function CheckoutImageColumn({
	planName,
	planId,
}: {
	planName: string;
	planId: PricingCheckoutDialogProps["planId"];
}) {
	return (
		<div className="relative aspect-3/2 w-full shrink-0 overflow-hidden lg:aspect-auto lg:min-h-full">
			<img
				src={checkoutDialogImageForPlan(planId)}
				alt=""
				width={640}
				height={480}
				className="absolute inset-0 size-full object-cover"
			/>
			<div
				className="absolute inset-0 bg-linear-to-t from-foreground/50 via-foreground/10 to-transparent"
				aria-hidden="true"
			/>
			<div className="absolute inset-x-0 bottom-0 flex p-5 sm:p-6">
				<span className="rounded-full border border-border/40 bg-background/90 px-3 py-1 text-xs font-medium font-manrope text-foreground backdrop-blur-sm">
					{planName}
				</span>
			</div>
		</div>
	);
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

function SeatStepper({
	id,
	value,
	onChange,
	disabled,
}: {
	id: string;
	value: number;
	onChange: (next: number) => void;
	disabled?: boolean;
}) {
	const decrement = () => onChange(Math.max(1, value - 1));
	const increment = () => onChange(value + 1);

	return (
		<div className="space-y-2">
			<span id={`${id}-label`} className={marketingFieldLabelClass}>
				Team size
			</span>
			<div
				className={cn(
					marketingFieldClass,
					"flex items-center justify-between gap-2 p-1.5",
				)}
				role="group"
				aria-labelledby={`${id}-label`}
			>
				<button
					type="button"
					className={marketingStepperButtonClass}
					onClick={decrement}
					disabled={disabled || value <= 1}
					aria-label="Decrease seats"
				>
					<MinusIcon className="size-4" weight="bold" aria-hidden />
				</button>
				<span
					className="min-w-12 text-center text-lg font-medium tabular-nums text-foreground font-manrope"
					aria-live="polite"
					aria-atomic="true"
				>
					{value}
				</span>
				<button
					type="button"
					className={marketingStepperButtonClass}
					onClick={increment}
					disabled={disabled}
					aria-label="Increase seats"
				>
					<PlusIcon className="size-4" weight="bold" aria-hidden />
				</button>
			</div>
			<p className={marketingFieldHintClass}>
				Billed per seat after your trial.
			</p>
		</div>
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
		if (!open) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [open, onClose]);

	useEffect(() => {
		if (!open) return;
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
		<AnimatePresence>
			{open ? (
				<div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
					<motion.button
						type="button"
						aria-label="Close dialog"
						className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						onClick={onClose}
					/>
					<motion.div
						ref={panelRef}
						role="dialog"
						aria-modal="true"
						aria-labelledby="checkout-dialog-title"
						className="relative z-10 grid max-h-[90dvh] w-full max-w-[min(56rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-border/60 bg-background shadow-2xl lg:grid-cols-[2fr_3fr]"
						initial={{ opacity: 0, y: 24, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 16, scale: 0.98 }}
						transition={SPRING_TOKENS.snappy}
					>
						<CheckoutImageColumn planName={planName} planId={planId} />

						<div className="@container/checkout-form relative flex min-h-0 flex-col overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 lg:p-10">
							<button
								type="button"
								className={cn(
									"absolute top-4 right-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground",
									marketingButtonFocus,
								)}
								onClick={onClose}
								aria-label="Close"
							>
								<XIcon className="size-5" aria-hidden />
							</button>

							<div className="flex flex-col gap-6 pt-2 pr-10">
								<div className="space-y-3">
									<BillingContextChip
										planName={planName}
										billingInterval={billingInterval}
									/>
									<h2
										id="checkout-dialog-title"
										className="text-2xl font-medium tracking-tight text-foreground font-inter"
									>
										Start {planName}
									</h2>
									<p className="text-sm leading-relaxed text-muted-foreground font-manrope">
										We&apos;ll email a link to start your 7-day free trial. The
										link expires in 24 hours.
									</p>
								</div>

								{status === "sent" ? (
									<div className="space-y-6">
										<div className="flex flex-col items-start gap-4">
											<div className="flex size-12 items-center justify-center rounded-full bg-secondary/20 text-secondary-foreground">
												<CheckIcon
													className="size-6"
													weight="bold"
													aria-hidden
												/>
											</div>
											<p className="text-sm leading-relaxed text-foreground font-manrope">
												Check your inbox at{" "}
												<strong className="font-semibold">
													{email.trim()}
												</strong>
												.
											</p>
										</div>
										<button
											type="button"
											className={cn(marketingPrimaryLgClass, "w-full")}
											onClick={onClose}
										>
											Close
										</button>
									</div>
								) : status === "blocked" && blocked ? (
									<div className="space-y-6">
										<p className="text-sm leading-relaxed text-foreground font-manrope">
											{blocked.action === "already_subscribed"
												? blocked.message
												: blocked.action === "sign_in"
													? blocked.message
													: blocked.action === "use_in_app"
														? blocked.message
														: ""}
										</p>
										<div className="flex flex-col gap-3">
											<a
												href="/pricing"
												className={cn(
													marketingGhostLgClass,
													"w-full text-center",
												)}
											>
												Compare plans
											</a>
											{(blocked.action === "sign_in" ||
												blocked.action === "already_subscribed" ||
												blocked.action === "use_in_app") && (
												<a
													href={blocked.clientUrl}
													className={cn(
														marketingPrimaryMdClass,
														"w-full text-center",
													)}
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
									<form
										className="space-y-5 @md/checkout-form:space-y-6"
										onSubmit={handleSubmit}
										aria-busy={isLoading}
									>
										<div className="space-y-2">
											<label
												htmlFor={emailInputId}
												className={marketingFieldLabelClass}
											>
												Work email
											</label>
											<input
												id={emailInputId}
												type="email"
												required
												autoComplete="email"
												value={email}
												onChange={(event) => setEmail(event.target.value)}
												className={marketingFieldClass}
												placeholder="you@company.com"
												disabled={isLoading}
											/>
										</div>

										{isTeamPlan ? (
											<SeatStepper
												id={seatStepperId}
												value={seatCount}
												onChange={setSeatCount}
												disabled={isLoading}
											/>
										) : null}

										{error ? (
											<p
												className="text-sm text-destructive font-manrope"
												role="alert"
											>
												{error}
											</p>
										) : null}

										<div className="flex flex-col gap-3 pt-1">
											<button
												type="submit"
												disabled={isLoading}
												className={cn(marketingPrimaryLgClass, "w-full")}
												aria-busy={isLoading}
											>
												{isLoading ? "Sending link…" : "Start 7-day free trial"}
											</button>
											<button
												type="button"
												className={cn(marketingGhostLgClass, "w-full")}
												onClick={onClose}
												disabled={isLoading}
											>
												Cancel
											</button>
										</div>
									</form>
								)}
							</div>
						</div>
					</motion.div>
				</div>
			) : null}
		</AnimatePresence>
	);
}
