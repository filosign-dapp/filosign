import { AnimatePresence, motion, SPRING_TOKENS } from "@filosign/motion";
import {
	type PaidCheckoutPlanId,
	pricingCheckoutDialogImagePath,
} from "@filosign/shared";
import { XIcon } from "@phosphor-icons/react";
import { type ReactNode, type RefObject, useEffect } from "react";
import { cn } from "../../lib/cn";
import { marketingButtonFocus } from "../../lib/marketing-button";

export function PlanDialogImageColumn({
	planName,
	planId,
}: {
	planName: string;
	planId: PaidCheckoutPlanId;
}) {
	return (
		<div className="relative aspect-3/2 w-full shrink-0 overflow-hidden lg:aspect-auto lg:min-h-full">
			<img
				src={pricingCheckoutDialogImagePath(planId)}
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

export function PlanDialogShell({
	open,
	onClose,
	planName,
	planId,
	titleId,
	contextChip,
	title,
	description,
	children,
	panelRef,
}: {
	open: boolean;
	onClose: () => void;
	planName: string;
	planId: PaidCheckoutPlanId;
	titleId: string;
	contextChip: ReactNode;
	title: ReactNode;
	description: ReactNode;
	children: ReactNode;
	panelRef?: RefObject<HTMLDivElement | null>;
}) {
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
						aria-labelledby={titleId}
						className="relative z-10 grid max-h-[90dvh] w-full max-w-[min(56rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-border/60 bg-background shadow-2xl lg:grid-cols-[2fr_3fr]"
						initial={{ opacity: 0, y: 24, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 16, scale: 0.98 }}
						transition={SPRING_TOKENS.snappy}
					>
						<PlanDialogImageColumn planName={planName} planId={planId} />

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
									{contextChip}
									<h2
										id={titleId}
										className="text-2xl font-medium tracking-tight text-foreground font-inter"
									>
										{title}
									</h2>
									<p className="text-sm leading-relaxed text-muted-foreground font-manrope">
										{description}
									</p>
								</div>
								{children}
							</div>
						</div>
					</motion.div>
				</div>
			) : null}
		</AnimatePresence>
	);
}
