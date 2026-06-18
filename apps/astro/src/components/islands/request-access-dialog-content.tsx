import { CheckIcon } from "@phosphor-icons/react";
import type { SubmitEvent } from "react";
import { cn } from "../../lib/cn";
import {
	marketingGhostLgClass,
	marketingPrimaryLgClass,
} from "../../lib/marketing-button";
import {
	marketingFieldClass,
	marketingFieldLabelClass,
} from "../../lib/marketing-form";

const requestDetailsFieldClass = cn(
	marketingFieldClass,
	"min-h-[4.5rem] max-h-36 w-full resize-y leading-relaxed",
);

export function RequestAccessSentContent({
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
					Thanks. We received your request for{" "}
					<strong className="font-semibold">{email.trim()}</strong> and will
					follow up with an invite link.
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

export function RequestAccessFormContent({
	emailInputId,
	companyInputId,
	messageInputId,
	email,
	company,
	message,
	onEmailChange,
	onCompanyChange,
	onMessageChange,
	error,
	isLoading,
	onSubmit,
	onClose,
}: {
	emailInputId: string;
	companyInputId: string;
	messageInputId: string;
	email: string;
	company: string;
	message: string;
	onEmailChange: (value: string) => void;
	onCompanyChange: (value: string) => void;
	onMessageChange: (value: string) => void;
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
			<div className="grid gap-5 @md/checkout-form:grid-cols-2 @md/checkout-form:gap-4">
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

				<div className="space-y-2">
					<label htmlFor={companyInputId} className={marketingFieldLabelClass}>
						Company
					</label>
					<input
						id={companyInputId}
						type="text"
						required
						autoComplete="organization"
						value={company}
						onChange={(event) => onCompanyChange(event.target.value)}
						className={marketingFieldClass}
						placeholder="Acme Corp"
						disabled={isLoading}
					/>
				</div>
			</div>

			<div className="space-y-2">
				<label htmlFor={messageInputId} className={marketingFieldLabelClass}>
					How you&apos;d use Filosign
				</label>
				<textarea
					id={messageInputId}
					required
					value={message}
					onChange={(event) => onMessageChange(event.target.value)}
					rows={2}
					className={requestDetailsFieldClass}
					placeholder="Workflows, agreement types, team size, timeline, or anything that helps us review your request."
					disabled={isLoading}
				/>
			</div>

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
					{isLoading ? "Submitting…" : "Submit request"}
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
