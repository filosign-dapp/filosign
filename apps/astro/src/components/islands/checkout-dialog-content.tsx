import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import { CheckIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import type { SubmitEvent } from "react";
import { cn } from "../../lib/cn";
import {
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

type PreviewResult =
	InferClientOutputs<AppRouterClient>["billing"]["previewMarketingCheckout"];

function blockedMessage(blocked: PreviewResult): string {
	if (blocked.action === "already_subscribed") return blocked.message;
	if (blocked.action === "sign_in") return blocked.message;
	if (blocked.action === "use_in_app") return blocked.message;
	return "";
}

export function CheckoutSentContent({
	email,
	onClose,
}: {
	email: string;
	onClose: () => void;
}) {
	return (
		<div className="space-y-6">
			<div className="flex flex-col items-start gap-4">
				<div className="flex size-12 items-center justify-center rounded-full bg-secondary/20 text-secondary-foreground">
					<CheckIcon className="size-6" weight="bold" aria-hidden />
				</div>
				<p className="text-sm leading-relaxed text-foreground font-manrope">
					Check your inbox at{" "}
					<strong className="font-semibold">{email.trim()}</strong>.
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
	);
}

export function CheckoutBlockedContent({
	blocked,
	onClose,
}: {
	blocked: PreviewResult;
	onClose: () => void;
}) {
	return (
		<div className="space-y-6">
			<p className="text-sm leading-relaxed text-foreground font-manrope">
				{blockedMessage(blocked)}
			</p>
			<div className="flex flex-col gap-3">
				<a
					href="/pricing"
					className={cn(marketingGhostLgClass, "w-full text-center")}
				>
					Compare plans
				</a>
				{blocked.action !== "send_link" ? (
					<a
						href={blocked.clientUrl}
						className={cn(marketingPrimaryMdClass, "w-full text-center")}
					>
						Sign in to manage billing
					</a>
				) : null}
				<button
					type="button"
					className={cn(marketingGhostLgClass, "w-full")}
					onClick={onClose}
				>
					Close
				</button>
			</div>
		</div>
	);
}

export function CheckoutFormContent({
	emailInputId,
	seatStepperId,
	email,
	onEmailChange,
	isTeamPlan,
	seatCount,
	onSeatCountChange,
	error,
	isLoading,
	onSubmit,
	onClose,
}: {
	emailInputId: string;
	seatStepperId: string;
	email: string;
	onEmailChange: (value: string) => void;
	isTeamPlan: boolean;
	seatCount: number;
	onSeatCountChange: (value: number) => void;
	error: string | null;
	isLoading: boolean;
	onSubmit: (event: SubmitEvent) => void;
	onClose: () => void;
}) {
	return (
		<form
			className="space-y-5 @md/checkout-form:space-y-6"
			onSubmit={onSubmit}
			aria-busy={isLoading}
		>
			<div className="space-y-2">
				<label htmlFor={emailInputId} className={marketingFieldLabelClass}>
					Work email
				</label>
				<input
					id={emailInputId}
					type="email"
					required
					autoComplete="email"
					value={email}
					onChange={(event) => onEmailChange(event.target.value)}
					className={marketingFieldClass}
					placeholder="you@company.com"
					disabled={isLoading}
				/>
			</div>

			{isTeamPlan ? (
				<SeatStepper
					id={seatStepperId}
					value={seatCount}
					onChange={onSeatCountChange}
					disabled={isLoading}
				/>
			) : null}

			{error ? (
				<p className="text-sm text-destructive font-manrope" role="alert">
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
	);
}
